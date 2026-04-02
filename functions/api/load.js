// GET /api/load — load current trip from KV
export async function onRequestGet(context) {
  const KV = context.env.TRIPS;
  if (!KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const data = await KV.get("trip:current", "json");
    return new Response(JSON.stringify(data || null), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
