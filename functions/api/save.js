// POST /api/save — save trip with optimistic locking (compare-and-swap)
export async function onRequestPost(context) {
  const { env } = context;
  const KV = env.TRIPS;
  if (!KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const { data, expectedSavedAt, force, tripId } = await context.request.json();
    const id = tripId || "trip-default";
    const key = `trip:${id}:current`;

    // Read current cloud version
    const current = await KV.get(key, "json");

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
      const h1 = await KV.get(`trip:${id}:history-1`, "json");
      const h2 = await KV.get(`trip:${id}:history-2`, "json");
      if (h2) await KV.put(`trip:${id}:history-3`, JSON.stringify(h2));
      if (h1) await KV.put(`trip:${id}:history-2`, JSON.stringify(h1));
      await KV.put(`trip:${id}:history-1`, JSON.stringify(current));
    }

    // Write new current
    await KV.put(key, JSON.stringify(payload));

    // Update trips list metadata
    try {
      const list = await KV.get("trips:list", "json");
      if (list) {
        const idx = list.findIndex(t => t.id === id);
        if (idx >= 0) {
          list[idx].name = data.heroTitle || list[idx].name;
          list[idx].subtitle = data.heroSubtitle || list[idx].subtitle;
          list[idx].dayCount = data.days?.length || 0;
          list[idx].stopCount = data.days?.reduce((a, d) => a + (d.stops?.length || 0), 0) || 0;
          list[idx].updatedAt = payload.savedAt;
          await KV.put("trips:list", JSON.stringify(list));
        }
      }
    } catch {}

    return new Response(JSON.stringify({ ok: true, savedAt: payload.savedAt }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
