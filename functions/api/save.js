// POST /api/save — save trip with optimistic locking (compare-and-swap)
export async function onRequestPost(context) {
  const { env } = context;
  const KV = env.TRIPS;
  if (!KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const { data, expectedSavedAt, force } = await context.request.json();

    // Read current cloud version
    const current = await KV.get("trip:current", "json");

    // Optimistic locking: reject if cloud changed since client last loaded
    if (!force && current && expectedSavedAt && current.savedAt !== expectedSavedAt) {
      return new Response(JSON.stringify({
        conflict: true,
        cloudData: current,
      }), { status: 409, headers: { "Content-Type": "application/json" } });
    }

    const payload = { ...data, savedAt: new Date().toISOString() };

    // Rotate history: current → h1 → h2 → h3
    if (current) {
      const h1 = await KV.get("trip:history-1", "json");
      const h2 = await KV.get("trip:history-2", "json");
      if (h2) await KV.put("trip:history-3", JSON.stringify(h2));
      if (h1) await KV.put("trip:history-2", JSON.stringify(h1));
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
