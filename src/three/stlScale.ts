// src/three/stlScale.ts
// Copyright (C) 2026 KONNO Akihisa
//
// Pure validation for the STL display scale factor, shared by the UI
// input handler (App.vue) and RectPlacerThree so both reject exactly
// the same invalid values.
export function isValidStlScale(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
