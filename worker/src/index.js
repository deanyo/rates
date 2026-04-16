export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(request, env),
      });
    }

    if (request.method === "POST" && url.pathname === "/api/shorten") {
      return handleShorten(request, env);
    }

    if (request.method === "GET" && isShortlinkPath(url.pathname)) {
      return handleResolve(url, env);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true }, 200, request, env);
    }

    return jsonResponse({ error: "not_found" }, 404, request, env);
  },
};

const RESERVED_IDS = new Set([
  "api",
  "health",
  "workers",
  "worker",
  "admin",
  "static",
]);
const SHORTEN_LIMITS = [
  { suffix: "m", windowSeconds: 60, max: 10 },
  { suffix: "h", windowSeconds: 3600, max: 100 },
];

async function handleShorten(request, env) {
  if (!isAllowedOrigin(request, env)) {
    return jsonResponse({ error: "forbidden_origin" }, 403, request, env);
  }

  const rateLimit = await enforceShortenRateLimit(request, env);
  if (rateLimit) {
    return jsonResponse(
      {
        error: "rate_limited",
        retryAfter: rateLimit.retryAfter,
      },
      429,
      request,
      env,
      { "retry-after": String(rateLimit.retryAfter) },
    );
  }

  const body = await readJson(request);
  const state = `${body?.state || ""}`.trim();
  const alias = sanitizeAlias(body?.alias);

  if (!/^v(?:1|2)~[A-Za-z0-9\-_.~%]+$/.test(state)) {
    return jsonResponse({ error: "invalid_state" }, 400, request, env);
  }

  let id = alias;
  if (alias) {
    if (!isValidAlias(alias)) {
      return jsonResponse({ error: "invalid_alias" }, 400, request, env);
    }

    const existing = await env.SHORTLINKS.get(alias);
    if (existing) {
      return jsonResponse({ error: "alias_taken" }, 409, request, env);
    }
  } else {
    id = await allocateShortId(env);
  }

  await env.SHORTLINKS.put(
    id,
    JSON.stringify({
      state,
      createdAt: Date.now(),
    }),
  );

  const publicBase = `${env.PUBLIC_BASE_URL || new URL(request.url).origin}`.replace(/\/$/, "");
  return jsonResponse(
    {
      id,
      shortUrl: `${publicBase}/${id}`,
    },
    200,
    request,
    env,
  );
}

async function enforceShortenRateLimit(request, env) {
  const clientId = getClientIdentifier(request);
  const nowBucket = Math.floor(Date.now() / 1000);

  for (const limit of SHORTEN_LIMITS) {
    const bucket = Math.floor(nowBucket / limit.windowSeconds);
    const key = `_rl:${limit.suffix}:${clientId}:${bucket}`;
    const currentValue = Number.parseInt((await env.SHORTLINKS.get(key)) || "0", 10);
    const nextValue = Number.isFinite(currentValue) ? currentValue + 1 : 1;

    await env.SHORTLINKS.put(key, String(nextValue), {
      expirationTtl: limit.windowSeconds + 60,
    });

    if (nextValue > limit.max) {
      const elapsedInWindow = nowBucket % limit.windowSeconds;
      return {
        retryAfter: Math.max(1, limit.windowSeconds - elapsedInWindow),
      };
    }
  }

  return null;
}

async function handleResolve(url, env) {
  const id = extractShortlinkId(url.pathname);
  if (!isResolvableId(id)) {
    return new Response("Not found", { status: 404 });
  }

  const stored = await env.SHORTLINKS.get(id);
  if (!stored) {
    return new Response("Not found", { status: 404 });
  }

  const payload = JSON.parse(stored);
  const appBase = `${env.APP_BASE_URL}`.replace(/\/?$/, "/");
  const target = new URL(appBase);
  target.searchParams.set("s", payload.state);
  target.searchParams.set("view", "share");
  return Response.redirect(target.toString(), 302);
}

function isShortlinkPath(pathname) {
  if (!pathname || pathname === "/") {
    return false;
  }

  if (pathname.startsWith("/api/") || pathname === "/health") {
    return false;
  }

  const id = extractShortlinkId(pathname);
  return isResolvableId(id);
}

function extractShortlinkId(pathname) {
  const trimmed = `${pathname || ""}`.replace(/^\/+|\/+$/g, "");
  if (!trimmed) {
    return "";
  }

  const parts = trimmed.split("/");
  return parts[parts.length - 1];
}

async function allocateShortId(env) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomId(6);
    if (RESERVED_IDS.has(id)) {
      continue;
    }
    const existing = await env.SHORTLINKS.get(id);
    if (!existing) {
      return id;
    }
  }

  return randomId(8);
}

function randomId(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let id = "";
  for (const byte of bytes) {
    id += alphabet[byte % alphabet.length];
  }
  return id;
}

function sanitizeAlias(value) {
  return `${value || ""}`.trim().toLowerCase();
}

function getClientIdentifier(request) {
  const cfIp = `${request.headers.get("cf-connecting-ip") || ""}`.trim();
  if (cfIp) {
    return cfIp;
  }

  const forwardedFor = `${request.headers.get("x-forwarded-for") || ""}`
    .split(",")[0]
    .trim();
  if (forwardedFor) {
    return forwardedFor;
  }

  return "unknown";
}

function isValidAlias(alias) {
  return /^[a-z0-9-]{3,32}$/.test(alias) && !RESERVED_IDS.has(alias);
}

function isResolvableId(id) {
  return /^[a-z0-9-]{3,32}$/i.test(id || "") && !RESERVED_IDS.has((id || "").toLowerCase());
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (_error) {
    return null;
  }
}

function jsonResponse(payload, status, request, env, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...buildCorsHeaders(request, env),
      ...extraHeaders,
    },
  });
}

function buildCorsHeaders(request, env) {
  const requestOrigin = request.headers.get("origin") || "";
  const allowedOrigins = `${env.ALLOWED_ORIGINS || ""}`
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || "*";

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function isAllowedOrigin(request, env) {
  const requestOrigin = `${request.headers.get("origin") || ""}`.trim();
  if (!requestOrigin) {
    return false;
  }

  const allowedOrigins = `${env.ALLOWED_ORIGINS || ""}`
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return allowedOrigins.includes(requestOrigin);
}
