// POST /api/restore — restore a history version for a trip
export async function onRequestPost(context) {
  const KV = context.env.TRIPS;
  if (!KV) return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const { id } = await context.request.json();
    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const data = await KV.get(id, "json");
    if (!data) return new Response(JSON.stringify({ error: "History version not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
