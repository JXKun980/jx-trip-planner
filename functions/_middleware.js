// Auth middleware — blocks all requests without a valid session cookie
// ENV VARS needed (set in Cloudflare dashboard → Pages → Settings → Environment variables):
//   AUTH_PASSWORD — the shared password
//   AUTH_SECRET  — a random string for signing cookies (e.g. generate with: openssl rand -hex 32)

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>JX Travel Planner — Login</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#0a0a0a; color:#ededed; font-family:'Inter',system-ui,sans-serif; min-height:100vh; display:flex; align-items:center; justify-content:center; }
    .gradient-text { background:linear-gradient(135deg,#3b82f6,#14b8a6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .card { background:#141414; border:1px solid #2a2a2a; border-radius:1rem; padding:2.5rem; width:100%; max-width:380px; box-shadow:0 0 0 1px rgba(59,130,246,0.1),0 4px 24px rgba(0,0,0,0.4); }
    input { width:100%; background:#0a0a0a; border:1px solid #2a2a2a; border-radius:0.5rem; padding:0.75rem 1rem; color:#fff; font-size:14px; outline:none; transition:border-color 0.2s; }
    input:focus { border-color:rgba(59,130,246,0.5); }
    button { width:100%; padding:0.75rem; border:none; border-radius:0.5rem; font-size:14px; font-weight:700; cursor:pointer; transition:all 0.2s; }
    .btn-primary { background:linear-gradient(135deg,#3b82f6,#14b8a6); color:#fff; }
    .btn-primary:hover { opacity:0.9; transform:translateY(-1px); }
    .btn-primary:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
    .error { color:#ef4444; font-size:12px; margin-top:0.5rem; text-align:center; }
    .logo { text-align:center; margin-bottom:1.5rem; }
    .logo .icon { font-size:3rem; margin-bottom:0.5rem; }
    .logo .name { font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:0.2em; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="icon">🌏</div>
      <div class="name gradient-text">JX Travel Planner</div>
    </div>
    <form id="f" autocomplete="off">
      <input id="pw" type="password" placeholder="Enter password" autofocus />
      <div id="err" class="error" style="display:none"></div>
      <button type="submit" class="btn-primary" style="margin-top:1rem" id="btn">Sign in</button>
    </form>
  </div>
  <script>
    const f=document.getElementById('f'), pw=document.getElementById('pw'), err=document.getElementById('err'), btn=document.getElementById('btn');
    f.onsubmit=async(e)=>{
      e.preventDefault(); err.style.display='none'; btn.disabled=true; btn.textContent='Signing in...';
      try {
        const res=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw.value})});
        const data=await res.json();
        if(data.ok){window.location.reload();}
        else{err.textContent=data.error||'Wrong password';err.style.display='block';}
      }catch{err.textContent='Connection error';err.style.display='block';}
      btn.disabled=false; btn.textContent='Sign in';
    };
  </script>
</body>
</html>`;

async function hmacSign(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmacVerify(message, signature, secret) {
  const expected = await hmacSign(message, secret);
  return expected === signature;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Skip auth for the auth endpoint itself
  if (url.pathname === "/api/auth") return next();

  // Check if auth is configured
  if (!env.AUTH_PASSWORD || !env.AUTH_SECRET) return next();

  // Check session cookie
  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(/jx_session=([^;]+)/);

  if (match) {
    const parts = match[1].split(":");
    if (parts.length === 3) {
      const [prefix, timestamp, sig] = parts;
      const message = `${prefix}:${timestamp}`;
      const valid = await hmacVerify(message, sig, env.AUTH_SECRET);
      const age = Date.now() - parseInt(timestamp);
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

      if (valid && age < maxAge) {
        return next(); // Authenticated
      }
    }
  }

  // Not authenticated — serve login page
  return new Response(LOGIN_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
