// src/three/cameraLimits.test.ts
// Copyright (C) 2026 KONNO Akihisa
import { describe, it, expect } from "vitest";
import { computeCameraLimits } from "./cameraLimits";

// Approximate fitDistance/radius ratio frameObject() actually produces
// for the app's 45deg vertical FOV (radius / sin(22.5deg) * 1.5).
const REALISTIC_FIT_FACTOR = 3.92;

describe("computeCameraLimits", () => {
  it("computes limits for a typical-sized object", () => {
    const limits = computeCameraLimits(10, 100, 1000);

    expect(limits).toEqual({
      near: 0.1,
      minDistance: 1,
      maxDistance: 1000,
      far: 1050,
    });
  });

  it("caps minDistance (and near with it) at fitDistance when the object is small relative to its fit distance", () => {
    const limits = computeCameraLimits(0.001, 0.01, 1000);

    expect(limits).toEqual({
      near: 0.00001,
      minDistance: 0.0001, // radius * 0.1, well under fitDistance here
      maxDistance: 0.1,
      far: 1000, // defaultFar floor dominates
    });
  });

  it("scales all limits up for a very large object without losing ordering", () => {
    const limits = computeCameraLimits(40300, 157900, 1000);

    expect(limits).toEqual({
      near: 403,
      minDistance: 4030,
      maxDistance: 1579000,
      far: 1740210,
    });
  });

  it("keeps minDistance <= fitDistance for a very small object at a realistic (45deg FOV) fit distance", () => {
    // This is the case that previously regressed: a fixed "10% of
    // radius" minDistance (0.0001) would be smaller than fitDistance
    // here, so the cap doesn't even need to engage -- but a naive
    // absolute floor (as the old implementation had) could still push
    // minDistance/near above fitDistance for a small enough radius.
    const radius = 0.001;
    const fitDistance = REALISTIC_FIT_FACTOR * radius;
    const { near, minDistance, maxDistance, far } = computeCameraLimits(radius, fitDistance, 1000);

    expect(near).toBeGreaterThan(0);
    expect(minDistance).toBeGreaterThan(near);
    expect(minDistance).toBeLessThanOrEqual(fitDistance);
    expect(maxDistance).toBeGreaterThan(fitDistance);
    expect(far).toBeGreaterThan(maxDistance);
  });

  it("keeps the same invariant for an even smaller object", () => {
    const radius = 1e-6;
    const fitDistance = REALISTIC_FIT_FACTOR * radius;
    const { near, minDistance, maxDistance, far } = computeCameraLimits(radius, fitDistance, 1000);

    expect(near).toBeGreaterThan(0);
    expect(minDistance).toBeGreaterThan(near);
    expect(minDistance).toBeLessThanOrEqual(fitDistance);
    expect(maxDistance).toBeGreaterThan(fitDistance);
    expect(far).toBeGreaterThan(maxDistance);
  });

  it("always returns strictly ordered, finite, positive values, with minDistance never exceeding fitDistance", () => {
    const cases: Array<[number, number, number]> = [
      [10, 100, 1000],
      [0.001, 0.01, 1000],
      [40300, 157900, 1000],
      [1, 1, 1], // a case where fitDistance is (unrealistically) tiny relative to radius
      [0.001, REALISTIC_FIT_FACTOR * 0.001, 1000],
      [1e-6, REALISTIC_FIT_FACTOR * 1e-6, 1000],
    ];

    for (const [radius, fitDistance, defaultFar] of cases) {
      const { near, minDistance, maxDistance, far } = computeCameraLimits(radius, fitDistance, defaultFar);

      for (const value of [near, minDistance, maxDistance, far]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }
      expect(minDistance).toBeGreaterThan(near);
      expect(minDistance).toBeLessThanOrEqual(fitDistance);
      expect(maxDistance).toBeGreaterThan(fitDistance);
      expect(far).toBeGreaterThan(maxDistance);
    }
  });
});
