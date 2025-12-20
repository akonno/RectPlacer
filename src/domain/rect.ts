// src/domain/rect.ts
export type Vec3 = { x: number; y: number; z: number };
export type Size3 = { lx: number; ly: number; lz: number };

export type RectDefinition = {
  size: Size3;
  pos: Vec3;
  highlighted: boolean;
  rawLine?: string; // 解析元行（デバッグ用、任意）
};

export type ParseError = {
  line: number;       // 1-based
  message: string;
  raw: string;
};

export function isFiniteNumber(v: number): boolean {
  return Number.isFinite(v);
}

/**
 * RectPlacer内部の座標系へ変換（今App.vueに散っている x,z,-y 変換を集約）
 * 例: 入力(x,y,z) -> 描画系(x, z, -y) のような規約
 */
export function toRenderPos(pos: Vec3): Vec3 {
  return { x: pos.x, y: pos.z, z: -pos.y };
}
