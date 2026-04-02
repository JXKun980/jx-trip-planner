// POST /api/auth — verify password, set session cookie

async function hmacSign(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { env } = context;

  if (!env.AUTH_PASSWORD || !env.AUTH_SECRET) {
    return new Response(JSON.stringify({ error: "Auth not configured" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { password } = await context.request.json();

    if (password !== env.AUTH_PASSWORD) {
      return new Response(JSON.stringify({ error: "Wrong password" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    // Create signed session cookie
    const timestamp = String(Date.now());
    const message = `session:${timestamp}`;
    const sig = await hmacSign(message, env.AUTH_SECRET);
    const cookieValue = `${message}:${sig}`;
    const maxAge = 30 * 24 * 60 * 60; // 30 days

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `jx_session=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
