// GET /api/history — list 3 history versions
export async function onRequestGet(context) {
  const KV = context.env.TRIPS;
  if (!KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const ids = ["trip:history-1", "trip:history-2", "trip:history-3"];
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
