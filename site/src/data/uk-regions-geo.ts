// Rewound UK region geometry for the d3 maps.
//
// `ukRegions` ships polygon rings in GeoJSON's "wrong" winding order for d3's spherical
// path generator, so we rewind them once here at module load. This module is imported
// *dynamically* by the map components so the ~98KB of geometry lands in its own lazy
// chunk — never in the SSR HTML payload, never on the initial render path.

import ukRegionsRaw from "#/data/ukRegions";

export type UkRegionFeature = {
  type: string;
  geometry: { type: string; coordinates: unknown };
  properties: { rgn19nm: string; [key: string]: unknown };
};

function rewindCoords(coords: number[][]): number[][] {
  let area = 0;
  for (let i = 0, n = coords.length - 1; i < n; i++) {
    area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
  }
  return area > 0 ? [...coords].reverse() : coords;
}

function rewindFeature(feature: UkRegionFeature): UkRegionFeature {
  const geom = feature.geometry;
  if (geom.type === "Polygon") {
    const rings = geom.coordinates as number[][][];
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: rings.map((r, i) =>
          i === 0 ? rewindCoords(r) : rewindCoords(r).reverse(),
        ),
      },
    };
  }
  if (geom.type === "MultiPolygon") {
    const polys = geom.coordinates as number[][][][];
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: polys.map((p) =>
          p.map((r, i) => (i === 0 ? rewindCoords(r) : rewindCoords(r).reverse())),
        ),
      },
    };
  }
  return feature;
}

export const ukRegionFeatures: UkRegionFeature[] = (
  ukRegionsRaw as { features: UkRegionFeature[] }
).features.map(rewindFeature);
