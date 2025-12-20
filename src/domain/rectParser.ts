// src/domain/rectParser.ts
import { RectDefinition, ParseError, isFiniteNumber } from "./rect";

const LINE_RE =
  /^(\*?)([+-]?\d+(?:\.\d*)?),([+-]?\d+(?:\.\d*)?),([+-]?\d+(?:\.\d*)?),([+-]?\d+(?:\.\d*)?),([+-]?\d+(?:\.\d*)?),([+-]?\d+(?:\.\d*)?)$/;

export type RectParseResult = {
  rects: RectDefinition[];
  errors: ParseError[];
};

export function parseRectInfo(text: string): RectParseResult {
  const rects: RectDefinition[] = [];
  const errors: ParseError[] = [];

  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    const line = raw.trim();

    if (line === "") continue;
    // 仕様としてコメントを許すなら（任意）
    if (line.startsWith("#") || line.startsWith("//")) continue;

    const m = line.match(LINE_RE);
    if (!m) {
      errors.push({ line: lineNo, message: "Invalid format. Expect: *?lx,ly,lz,x,y,z", raw });
      continue;
    }

    const highlighted = m[1] === "*";
    const lx = parseFloat(m[2]);
    const ly = parseFloat(m[3]);
    const lz = parseFloat(m[4]);
    const x  = parseFloat(m[5]);
    const y  = parseFloat(m[6]);
    const z  = parseFloat(m[7]);

    const nums = [lx, ly, lz, x, y, z];
    if (!nums.every(isFiniteNumber)) {
      errors.push({ line: lineNo, message: "Non-finite number detected.", raw });
      continue;
    }
    if (lx <= 0 || ly <= 0 || lz <= 0) {
      errors.push({ line: lineNo, message: "lx,ly,lz must be > 0.", raw });
      continue;
    }

    rects.push({
      size: { lx, ly, lz },
      pos: { x, y, z },
      highlighted,
      rawLine: raw,
    });
  }

  return { rects, errors };
}
