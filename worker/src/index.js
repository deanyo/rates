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

async function handleShorten(request, env) {
  const body = await readJson(request);
  const state = `${body?.state || ""}`.trim();

  if (!/^v1~[A-Za-z0-9\-_.~%]+$/.test(state)) {
    return jsonResponse({ error: "invalid_state" }, 400, request, env);
  }

  const id = await allocateShortId(env);
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

async function handleResolve(url, env) {
  const id = extractShortlinkId(url.pathname);
  if (!/^[a-z0-9]{6,8}$/i.test(id || "")) {
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
  return /^[a-z0-9]{6,8}$/i.test(id || "");
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

async function readJson(request) {
  try {
    return await request.json();
  } catch (_error) {
    return null;
  }
}

function jsonResponse(payload, status, request, env) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...buildCorsHeaders(request, env),
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
