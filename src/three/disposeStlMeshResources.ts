// src/three/disposeStlMeshResources.ts
// Copyright (C) 2026 KONNO Akihisa
//
// Frees the geometry and material(s) owned by an STL mesh. Kept in its
// own module (rather than inline in rectPlacerThree.ts) so it can be
// unit-tested without pulling in rectPlacerThree.ts's Vite-only asset
// imports, which don't resolve under Vitest's plain Node environment.
import * as THREE from "three";

export function disposeStlMeshResources(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  const material = mesh.material;
  if (Array.isArray(material)) {
    material.forEach((m) => m.dispose());
  } else {
    material.dispose();
  }
}
