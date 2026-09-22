// The bounding box every UK map projection is fitted to, so the choropleth, the
// homepage thumbnail and the venue point map share one projection and their
// coordinates stay interchangeable.
//
// Kept apart from `uk-regions-geo` (which carries ~98KB of geometry and is only
// ever imported dynamically) so it can be imported statically for free.
export const UK_BBOX = {
  type: "Feature" as const,
  geometry: {
    type: "MultiPoint" as const,
    coordinates: [
      [-8.62, 49.94],
      [1.76, 58.8],
    ],
  },
  properties: {},
};
