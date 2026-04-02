// GET /api/transit?from=lat,lng&to=lat,lng&departure=ISO_TIMESTAMP
// Proxies to Google Directions API (transit mode) — keeps API key server-side
// ENV VAR needed: GOOGLE_MAPS_API_KEY

export async function onRequestGet(context) {
  const { env } = context;
  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const url = new URL(context.request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const departure = url.searchParams.get("departure"); // ISO timestamp or unix seconds

    if (!from || !to) return new Response(JSON.stringify({ error: "Missing from/to params (lat,lng)" }), { status: 400, headers: { "Content-Type": "application/json" } });

    // Build Google Directions API URL
    const params = new URLSearchParams({
      origin: from,
      destination: to,
      mode: "transit",
      alternatives: "true",
      key: apiKey,
    });

    // Add departure time (Google expects unix timestamp in seconds)
    if (departure) {
      const ts = Math.floor(new Date(departure).getTime() / 1000);
      if (!isNaN(ts)) params.set("departure_time", String(ts));
    } else {
      // Default to "now"
      params.set("departure_time", String(Math.floor(Date.now() / 1000)));
    }

    const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
    const data = await res.json();

    if (data.status !== "OK") {
      return new Response(JSON.stringify({ error: data.status, message: data.error_message || "No transit routes found" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    // Parse routes into a clean format
    const routes = data.routes.map(route => {
      const leg = route.legs[0];
      const steps = leg.steps.map(step => {
        const base = {
          mode: step.travel_mode, // WALKING or TRANSIT
          distance: step.distance?.text || "",
          duration: step.duration?.text || "",
          durationSec: step.duration?.value || 0,
          instructions: step.html_instructions || "",
        };
        if (step.travel_mode === "TRANSIT") {
          const td = step.transit_details;
          base.transit = {
            line: td.line?.short_name || td.line?.name || "",
            lineName: td.line?.name || "",
            vehicle: td.line?.vehicle?.type || "",
            vehicleName: td.line?.vehicle?.name || "",
            color: td.line?.color || "",
            textColor: td.line?.text_color || "",
            departureStop: td.departure_stop?.name || "",
            arrivalStop: td.arrival_stop?.name || "",
            departureTime: td.departure_time?.text || "",
            arrivalTime: td.arrival_time?.text || "",
            numStops: td.num_stops || 0,
            headsign: td.headsign || "",
          };
        }
        return base;
      });

      return {
        summary: route.summary || "",
        duration: leg.duration?.text || "",
        durationSec: leg.duration?.value || 0,
        distance: leg.distance?.text || "",
        departureTime: leg.departure_time?.text || "",
        arrivalTime: leg.arrival_time?.text || "",
        steps,
      };
    });

    return new Response(JSON.stringify({ routes }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
