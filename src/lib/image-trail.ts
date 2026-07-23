export const imageTrailImages = Array.from(
  { length: 26 },
  (_, index) => `/image-trail/trail-${String(index + 1).padStart(2, "0")}.webp`
);
