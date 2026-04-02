// GET /api/load?tripId=xxx — load a specific trip from KV
export async function onRequestGet(context) {
  const KV = context.env.TRIPS;
  if (!KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const url = new URL(context.request.url);
    const tripId = url.searchParams.get("tripId") || "trip-default";
    const data = await KV.get(`trip:${tripId}:current`, "json");
    return new Response(JSON.stringify(data || null), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
