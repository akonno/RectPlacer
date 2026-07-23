// src/three/cameraLimits.ts
// Copyright (C) 2026 KONNO Akihisa
//
// Pure, THREE.js-independent math for the camera clip planes and
// OrbitControls zoom (dolly) limits used when framing an object in
// rectPlacerThree.ts's frameObject(). Kept separate so the formula and
// its invariants can be unit tested without a WebGL context.
//
// All limits are derived from the framed object's own bounding-sphere
// radius and the already-computed "whole object in view" fit distance,
// so they scale correctly regardless of the STL's display scale. Without
// this, OrbitControls' mouse-wheel zoom has no minimum/maximum distance
// and can dolly the camera closer than the near plane (clipping the
// model) or farther than the far plane.
//
// computeCameraLimits() guarantees, for any finite radius > 0 and
// fitDistance > 0:
//
//   0 < near < minDistance <= fitDistance < maxDistance < far
//
// In particular minDistance is capped at fitDistance: for a very small
// object, a fixed "10% of radius" minDistance can otherwise exceed
// fitDistance, which previously made OrbitControls.update() immediately
// back the camera away from its just-computed fit position (and, since
// near was independently floored, could also clip the model).

// Closest allowed zoom is normally 10% of the object's bounding radius
// from its center -- close enough for detailed surface inspection
// without letting the camera dolly through the model's center. Capped at
// fitDistance so it can never exceed the distance the camera actually
// starts at.
const MIN_DISTANCE_RADIUS_FACTOR = 0.1;
// near is a fixed fraction of minDistance (not of radius directly), which
// guarantees near < minDistance for any finite, positive radius/
// fitDistance -- including a minDistance that has been capped down to
// fitDistance for a very small object.
const NEAR_FRACTION_OF_MIN_DISTANCE = 0.1;
// Farthest allowed zoom: 10x the initial "whole object in view" fit
// distance -- enough to zoom out for surrounding context without the
// model shrinking to an imperceptible speck.
const MAX_DISTANCE_FIT_FACTOR = 10;

export type CameraLimits = {
  near: number;
  far: number;
  minDistance: number;
  maxDistance: number;
};

/**
 * @param radius Bounding-sphere radius of the framed object (world units, after scale).
 * @param fitDistance The camera distance already computed to fit the whole object in view.
 * @param defaultFar Floor for the far plane (keeps the fixed scene backdrop visible for small objects).
 */
export function computeCameraLimits(radius: number, fitDistance: number, defaultFar: number): CameraLimits {
  const minDistance = Math.min(radius * MIN_DISTANCE_RADIUS_FACTOR, fitDistance);
  const near = minDistance * NEAR_FRACTION_OF_MIN_DISTANCE;
  const maxDistance = Math.max(fitDistance * MAX_DISTANCE_FIT_FACTOR, minDistance * 2);
  // The camera can end up as far as maxDistance from the target, with the
  // object extending roughly `radius` beyond the target in the view
  // direction as well -- the same margin (radius * 4 + 10) the original
  // far-plane calculation used, now anchored to maxDistance rather than
  // fitDistance since maxDistance is the true worst case once zoom is
  // bounded.
  const far = Math.max(defaultFar, maxDistance + radius * 4 + 10);

  return { near, far, minDistance, maxDistance };
}
