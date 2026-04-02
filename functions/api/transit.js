// GET /api/transit?from=lat,lng&to=lat,lng&departure=ISO_TIMESTAMP
// Proxies to Google Routes API (Compute Routes, transit mode)
// ENV VAR needed: GOOGLE_MAPS_API_KEY

export async function onRequestGet(context) {
  const { env } = context;
  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });

  try {
    const url = new URL(context.request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const departure = url.searchParams.get("departure");

    if (!from || !to) return new Response(JSON.stringify({ error: "Missing from/to params (lat,lng)" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const [fromLat, fromLng] = from.split(",").map(Number);
    const [toLat, toLng] = to.split(",").map(Number);

    // Build Routes API request body
    const body = {
      origin: { location: { latLng: { latitude: fromLat, longitude: fromLng } } },
      destination: { location: { latLng: { latitude: toLat, longitude: toLng } } },
      travelMode: "TRANSIT",
      computeAlternativeRoutes: true,
    };

    if (departure) {
      body.departureTime = new Date(departure).toISOString();
    }

    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters,routes.legs.steps.transitDetails,routes.legs.steps.travelMode,routes.legs.steps.startLocation,routes.legs.steps.endLocation,routes.legs.steps.localizedValues,routes.localizedValues",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message || "Routes API error", status: data.error.status }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    if (!data.routes || data.routes.length === 0) {
      return new Response(JSON.stringify({ error: "No transit routes found" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    // Parse routes into a clean format
    const routes = data.routes.map(route => {
      const leg = route.legs?.[0];
      const durationSec = parseInt(route.duration?.replace("s", "") || "0");
      const steps = (leg?.steps || []).map(step => {
        const base = {
          mode: step.travelMode || "WALKING",
          distance: step.localizedValues?.distance?.text || "",
          duration: step.localizedValues?.staticDuration?.text || "",
        };
        if (step.travelMode === "TRANSIT" && step.transitDetails) {
          const td = step.transitDetails;
          base.transit = {
            line: td.transitLine?.nameShort || td.transitLine?.name || "",
            lineName: td.transitLine?.name || "",
            vehicle: td.transitLine?.vehicle?.type || "",
            vehicleName: td.transitLine?.vehicle?.name?.text || "",
            color: td.transitLine?.color || "",
            textColor: td.transitLine?.textColor || "",
            departureStop: td.stopDetails?.departureStop?.name || "",
            arrivalStop: td.stopDetails?.arrivalStop?.name || "",
            departureTime: td.localizedValues?.departureTime?.time?.text || td.stopDetails?.departureTime || "",
            arrivalTime: td.localizedValues?.arrivalTime?.time?.text || td.stopDetails?.arrivalTime || "",
            numStops: td.stopCount || 0,
            headsign: td.headsign || "",
          };
        }
        return base;
      });

      return {
        duration: route.localizedValues?.duration?.text || `${Math.round(durationSec / 60)} min`,
        durationSec,
        distance: route.localizedValues?.distance?.text || `${Math.round((route.distanceMeters || 0) / 1000)} km`,
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
