import type { LonLat } from "./content";

// Must match the crop used to generate public/map/plan-dots.json
export const MAP = {
  lon0: -125,
  lon1: 72,
  lat0: 66,
  lat1: -58,
  width: 1000,
  height: 629,
};

export const HQ: { name: string; coords: LonLat } = {
  name: "Vienna",
  coords: [16.37, 48.21],
};

export type Point = { x: number; y: number };

export function project([lon, lat]: LonLat): Point {
  return {
    x: ((lon - MAP.lon0) / (MAP.lon1 - MAP.lon0)) * MAP.width,
    y: ((MAP.lat0 - lat) / (MAP.lat0 - MAP.lat1)) * MAP.height,
  };
}

export function formatCoords([lon, lat]: LonLat) {
  const ns = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}`;
  const ew = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "W"}`;
  return `${ns}  ${ew}`;
}
