// src/three/stlScale.test.ts
// Copyright (C) 2026 KONNO Akihisa
import { describe, it, expect } from "vitest";
import { isValidStlScale } from "./stlScale";

describe("isValidStlScale", () => {
  it("accepts a typical positive scale", () => {
    expect(isValidStlScale(1)).toBe(true);
  });

  it("accepts a small positive scale", () => {
    expect(isValidStlScale(0.001)).toBe(true);
  });

  it("accepts a large finite positive scale", () => {
    expect(isValidStlScale(1e6)).toBe(true);
  });

  it("rejects zero", () => {
    expect(isValidStlScale(0)).toBe(false);
  });

  it("rejects negative values", () => {
    expect(isValidStlScale(-1)).toBe(false);
  });

  it("rejects NaN", () => {
    expect(isValidStlScale(NaN)).toBe(false);
  });

  it("rejects positive Infinity", () => {
    expect(isValidStlScale(Infinity)).toBe(false);
  });

  it("rejects negative Infinity", () => {
    expect(isValidStlScale(-Infinity)).toBe(false);
  });
});
