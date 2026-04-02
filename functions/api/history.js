// GET /api/history?tripId=xxx — list 3 history versions for a trip
export async function onRequestGet(context) {
  const KV = context.env.TRIPS;
  if (!KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const url = new URL(context.request.url);
    const tripId = url.searchParams.get("tripId") || "trip-default";
    const ids = [`trip:${tripId}:history-1`, `trip:${tripId}:history-2`, `trip:${tripId}:history-3`];
    const items = [];
    for (const id of ids) {
      const data = await KV.get(id, "json");
      items.push(data ? { id, ...data } : null);
    }
    return new Response(JSON.stringify(items), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
