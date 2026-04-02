// GET /api/trips — list all trips
// POST /api/trips — create a new trip
// DELETE /api/trips — delete a trip

const headers = { "Content-Type": "application/json" };

async function getTrips(KV) {
  const list = await KV.get("trips:list", "json");
  if (list) return list;
  // Migration: check for legacy single-trip data
  const legacy = await KV.get("trip:current", "json");
  if (legacy) {
    const id = "trip-default";
    const entry = {
      id, name: legacy.heroTitle || "My Trip",
      subtitle: legacy.heroSubtitle || "",
      dayCount: legacy.days?.length || 0,
      stopCount: legacy.days?.reduce((a, d) => a + (d.stops?.length || 0), 0) || 0,
      updatedAt: legacy.savedAt || new Date().toISOString(),
    };
    // Migrate: move legacy data to namespaced key
    await KV.put(`trip:${id}:current`, JSON.stringify(legacy));
    // Migrate history too
    for (const h of ["history-1", "history-2", "history-3"]) {
      const hData = await KV.get(`trip:${h}`, "json");
      if (hData) { await KV.put(`trip:${id}:${h}`, JSON.stringify(hData)); await KV.delete(`trip:${h}`); }
    }
    await KV.delete("trip:current");
    const newList = [entry];
    await KV.put("trips:list", JSON.stringify(newList));
    return newList;
  }
  return [];
}

export async function onRequestGet(context) {
  const KV = context.env.TRIPS;
  if (!KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers });
  try {
    const list = await getTrips(KV);
    return new Response(JSON.stringify(list), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

export async function onRequestPost(context) {
  const KV = context.env.TRIPS;
  if (!KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers });
  try {
    const { name, subtitle } = await context.request.json();
    const id = `trip-${Date.now()}`;
    const now = new Date().toISOString();
    const tripData = {
      days: [], heroTitle: name || "New Trip", heroSubtitle: subtitle || "",
      heroSnippet: "", startTimes: [], homeBattery: 100, comments: {}, savedAt: now,
    };
    await KV.put(`trip:${id}:current`, JSON.stringify(tripData));
    const list = await getTrips(KV);
    const entry = { id, name: tripData.heroTitle, subtitle: tripData.heroSubtitle, dayCount: 0, stopCount: 0, updatedAt: now };
    list.push(entry);
    await KV.put("trips:list", JSON.stringify(list));
    return new Response(JSON.stringify({ ok: true, trip: entry, data: tripData }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

export async function onRequestDelete(context) {
  const KV = context.env.TRIPS;
  if (!KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers });
  try {
    const { id } = await context.request.json();
    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers });
    // Remove trip data
    await KV.delete(`trip:${id}:current`);
    for (const h of ["history-1", "history-2", "history-3"]) await KV.delete(`trip:${id}:${h}`);
    // Remove from list
    const list = await getTrips(KV);
    const filtered = list.filter(t => t.id !== id);
    await KV.put("trips:list", JSON.stringify(filtered));
    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
