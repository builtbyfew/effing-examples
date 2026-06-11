export type GeoRing = number[][];
export type GeoPolygon = GeoRing[];
export type GeoFeature = {
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: GeoPolygon | GeoPolygon[];
  };
};

export type Location = {
  name: string;
  country: string;
  lon: number;
  lat: number;
};

export type Projection = {
  project: (lon: number, lat: number) => { x: number; y: number };
  ctrl: { x: number; y: number };
  vpMinLon: number;
  vpMaxLon: number;
  vpMinLat: number;
  vpMaxLat: number;
};

/**
 * Computes a map projection fitting the given origin→destination route into
 * the canvas bounds. Returns the project function and viewport extents so both
 * the static map image and the animated overlay stay perfectly aligned.
 */
export function buildProjection(
  origin: Location,
  destination: Location,
  width: number,
  height: number,
): Projection {
  const midLon = (origin.lon + destination.lon) / 2;
  const midLat = (origin.lat + destination.lat) / 2;
  const routeDist = Math.hypot(
    destination.lon - origin.lon,
    destination.lat - origin.lat,
  );
  const poleOffset = Math.max(
    routeDist * 0.4,
    Math.abs(origin.lat - destination.lat) * 0.67,
  );
  const ctrlLon = midLon;
  const ctrlLat =
    midLat >= 0
      ? Math.min(85, midLat + poleOffset)
      : Math.max(-85, midLat - poleOffset);

  const routeMinLon = Math.min(origin.lon, destination.lon, ctrlLon);
  const routeMaxLon = Math.max(origin.lon, destination.lon, ctrlLon);
  const routeMinLat = Math.min(origin.lat, destination.lat, ctrlLat);
  const routeMaxLat = Math.max(origin.lat, destination.lat, ctrlLat);
  const lonPad = (routeMaxLon - routeMinLon) * 0.25;
  const latPad = (routeMaxLat - routeMinLat) * 0.25;
  let vpMinLon = Math.max(-180, routeMinLon - lonPad);
  let vpMaxLon = Math.min(180, routeMaxLon + lonPad);
  let vpMinLat = Math.max(-90, routeMinLat - latPad);
  let vpMaxLat = Math.min(90, routeMaxLat + latPad);

  const canvasAR = width / height;
  const vpLonSpan = vpMaxLon - vpMinLon;
  const vpLatSpan = vpMaxLat - vpMinLat;
  const vpAR = vpLonSpan / vpLatSpan;
  const vpCenterLon = (vpMinLon + vpMaxLon) / 2;
  const vpCenterLat = (vpMinLat + vpMaxLat) / 2;

  // Always adjust so the viewport AR matches the canvas AR, keeping the route centered.
  if (vpAR > canvasAR) {
    const targetLatSpan = Math.min(vpLonSpan / canvasAR, 140);
    vpMinLat = Math.max(-90, vpCenterLat - targetLatSpan / 2);
    vpMaxLat = Math.min(90, vpCenterLat + targetLatSpan / 2);
  } else {
    const targetLonSpan = Math.min(vpLatSpan * canvasAR, 150);
    vpMinLon = Math.max(-180, vpCenterLon - targetLonSpan / 2);
    vpMaxLon = Math.min(180, vpCenterLon + targetLonSpan / 2);
  }

  const lonSpan = vpMaxLon - vpMinLon;
  const latSpan = vpMaxLat - vpMinLat;
  const project = (lon: number, lat: number) => ({
    x: ((lon - vpMinLon) / lonSpan) * width,
    y: ((vpMaxLat - lat) / latSpan) * height,
  });

  const ctrl = project(ctrlLon, ctrlLat);

  return { project, ctrl, vpMinLon, vpMaxLon, vpMinLat, vpMaxLat };
}
