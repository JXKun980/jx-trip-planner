// POST /api/save — save current trip, rotate history
export async function onRequestPost(context) {
  const { env } = context;
  const KV = env.TRIPS;
  if (!KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const body = await context.request.json();
    const payload = { ...body, savedAt: new Date().toISOString() };

    // Read current for rotation
    const current = await KV.get("trip:current", "json");

    if (current) {
      const h1 = await KV.get("trip:history-1", "json");
      const h2 = await KV.get("trip:history-2", "json");
      // h2 → h3
      if (h2) await KV.put("trip:history-3", JSON.stringify(h2));
      // h1 → h2
      if (h1) await KV.put("trip:history-2", JSON.stringify(h1));
      // current → h1
      await KV.put("trip:history-1", JSON.stringify(current));
    }

    // Write new current
    await KV.put("trip:current", JSON.stringify(payload));

    return new Response(JSON.stringify({ ok: true, savedAt: payload.savedAt }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
