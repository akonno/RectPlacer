// src/three/disposeStlMeshResources.test.ts
// Copyright (C) 2026 KONNO Akihisa
//
// Unit tests for disposeStlMeshResources(), the piece of the STL
// mesh-swap/dispose logic that doesn't require a real WebGL context.
// RectPlacerThree itself is not tested here since its constructor
// requires a real WebGLRenderer/canvas.
import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { disposeStlMeshResources } from "./disposeStlMeshResources";

function meshWith(material: THREE.Material | THREE.Material[]): THREE.Mesh {
  const geometry = { dispose: vi.fn() } as unknown as THREE.BufferGeometry;
  return { geometry, material } as unknown as THREE.Mesh;
}

describe("disposeStlMeshResources", () => {
  it("disposes the geometry exactly once", () => {
    const material = { dispose: vi.fn() } as unknown as THREE.Material;
    const mesh = meshWith(material);

    disposeStlMeshResources(mesh);

    expect(mesh.geometry.dispose).toHaveBeenCalledTimes(1);
  });

  it("disposes a single material exactly once", () => {
    const material = { dispose: vi.fn() } as unknown as THREE.Material;
    const mesh = meshWith(material);

    disposeStlMeshResources(mesh);

    expect(material.dispose).toHaveBeenCalledTimes(1);
  });

  it("disposes every material in an array exactly once", () => {
    const materials = [
      { dispose: vi.fn() } as unknown as THREE.Material,
      { dispose: vi.fn() } as unknown as THREE.Material,
      { dispose: vi.fn() } as unknown as THREE.Material,
    ];
    const mesh = meshWith(materials);

    disposeStlMeshResources(mesh);

    for (const material of materials) {
      expect(material.dispose).toHaveBeenCalledTimes(1);
    }
  });
});
