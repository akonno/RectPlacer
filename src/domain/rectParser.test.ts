// src/domain/rectParser.test.ts
// Copyright (C) 2026 KONNO Akihisa
//
// Unit tests locking down parseRectInfo()'s documented cuboid CSV format
// (see README.md "Cuboid data format") against the actual implementation.
import { describe, it, expect } from "vitest";
import { parseRectInfo } from "./rectParser";

describe("parseRectInfo - valid input", () => {
  it("parses a single valid 6-column line", () => {
    const { rects, errors } = parseRectInfo("0.1,0.1,0.3,0.2,0,0.2");

    expect(errors).toEqual([]);
    expect(rects).toEqual([
      {
        size: { lx: 0.1, ly: 0.1, lz: 0.3 },
        pos: { x: 0.2, y: 0, z: 0.2 },
        status: "normal",
        rawLine: "0.1,0.1,0.3,0.2,0,0.2",
      },
    ]);
  });

  it("parses multiple lines", () => {
    const { rects, errors } = parseRectInfo(
      "0.1,0.1,0.3,0.2,0,0.2\n0.2,0.15,0.3,0.5,0,0.2"
    );

    expect(errors).toEqual([]);
    expect(rects).toHaveLength(2);
    expect(rects[0].size).toEqual({ lx: 0.1, ly: 0.1, lz: 0.3 });
    expect(rects[0].pos).toEqual({ x: 0.2, y: 0, z: 0.2 });
    expect(rects[1].size).toEqual({ lx: 0.2, ly: 0.15, lz: 0.3 });
    expect(rects[1].pos).toEqual({ x: 0.5, y: 0, z: 0.2 });
  });

  it("parses decimal values", () => {
    const { rects, errors } = parseRectInfo("1.5,2.25,0.125,-1.5,3.75,0.001");

    expect(errors).toEqual([]);
    expect(rects[0].size).toEqual({ lx: 1.5, ly: 2.25, lz: 0.125 });
    expect(rects[0].pos).toEqual({ x: -1.5, y: 3.75, z: 0.001 });
  });

  it("parses negative position coordinates", () => {
    const { rects, errors } = parseRectInfo("0.2,0.2,0.25,-2.26,0.72,-1.67");

    expect(errors).toEqual([]);
    expect(rects[0].pos).toEqual({ x: -2.26, y: 0.72, z: -1.67 });
  });

  it("rejects exponential notation (not currently supported by the parser)", () => {
    const { rects, errors } = parseRectInfo("1e3,0.1,0.3,0.2,0,0.2");

    expect(rects).toEqual([]);
    expect(errors).toEqual([
      {
        line: 1,
        message: "Invalid format. Expect: *?lx,ly,lz,x,y,z",
        raw: "1e3,0.1,0.3,0.2,0,0.2",
      },
    ]);
  });

  it("marks a cuboid as highlighted when the line starts with '*'", () => {
    const { rects, errors } = parseRectInfo("*0.1,0.1,0.3,0.2,0,0.2");

    expect(errors).toEqual([]);
    expect(rects[0].status).toBe("highlighted");
  });

  it("marks a cuboid as normal when there is no leading '*'", () => {
    const { rects } = parseRectInfo("0.1,0.1,0.3,0.2,0,0.2");

    expect(rects[0].status).toBe("normal");
  });

  it("ignores blank lines", () => {
    const { rects, errors } = parseRectInfo(
      "0.1,0.1,0.3,0.2,0,0.2\n\n0.2,0.15,0.3,0.5,0,0.2"
    );

    expect(errors).toEqual([]);
    expect(rects).toHaveLength(2);
  });

  it("ignores a whitespace-only line", () => {
    const { rects, errors } = parseRectInfo(
      "0.1,0.1,0.3,0.2,0,0.2\n   \n0.2,0.15,0.3,0.5,0,0.2"
    );

    expect(errors).toEqual([]);
    expect(rects).toHaveLength(2);
  });

  it("returns no rects and no errors for empty input", () => {
    const { rects, errors } = parseRectInfo("");

    expect(rects).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("ignores lines starting with '#' as comments", () => {
    const { rects, errors } = parseRectInfo(
      "# a comment\n0.1,0.1,0.3,0.2,0,0.2"
    );

    expect(errors).toEqual([]);
    expect(rects).toHaveLength(1);
  });

  it("ignores lines starting with '//' as comments", () => {
    const { rects, errors } = parseRectInfo(
      "// a comment\n0.1,0.1,0.3,0.2,0,0.2"
    );

    expect(errors).toEqual([]);
    expect(rects).toHaveLength(1);
  });

  it("trims leading and trailing whitespace around a line before parsing", () => {
    const { rects, errors } = parseRectInfo("  0.1,0.1,0.3,0.2,0,0.2  ");

    expect(errors).toEqual([]);
    expect(rects[0].size).toEqual({ lx: 0.1, ly: 0.1, lz: 0.3 });
    expect(rects[0].pos).toEqual({ x: 0.2, y: 0, z: 0.2 });
    // rawLine preserves the original, untrimmed line.
    expect(rects[0].rawLine).toBe("  0.1,0.1,0.3,0.2,0,0.2  ");
  });
});

describe("parseRectInfo - invalid input", () => {
  it("rejects whitespace around commas (current behavior: not trimmed per field)", () => {
    const { rects, errors } = parseRectInfo("0.1, 0.1,0.3,0.2,0,0.2");

    expect(rects).toEqual([]);
    expect(errors).toEqual([
      {
        line: 1,
        message: "Invalid format. Expect: *?lx,ly,lz,x,y,z",
        raw: "0.1, 0.1,0.3,0.2,0,0.2",
      },
    ]);
  });

  it("reports an error for too few columns", () => {
    const { rects, errors } = parseRectInfo("0.1,0.1,0.3,0.2,0");

    expect(rects).toEqual([]);
    expect(errors).toEqual([
      {
        line: 1,
        message: "Invalid format. Expect: *?lx,ly,lz,x,y,z",
        raw: "0.1,0.1,0.3,0.2,0",
      },
    ]);
  });

  it("reports an error for too many columns", () => {
    const { rects, errors } = parseRectInfo("0.1,0.1,0.3,0.2,0,0.2,0.1");

    expect(rects).toEqual([]);
    expect(errors).toEqual([
      {
        line: 1,
        message: "Invalid format. Expect: *?lx,ly,lz,x,y,z",
        raw: "0.1,0.1,0.3,0.2,0,0.2,0.1",
      },
    ]);
  });

  it("reports an error for a non-numeric field", () => {
    const { rects, errors } = parseRectInfo("abc,0.1,0.3,0.2,0,0.2");

    expect(rects).toEqual([]);
    expect(errors).toEqual([
      {
        line: 1,
        message: "Invalid format. Expect: *?lx,ly,lz,x,y,z",
        raw: "abc,0.1,0.3,0.2,0,0.2",
      },
    ]);
  });

  it("reports an error when lx is 0", () => {
    const { rects, errors } = parseRectInfo("0,0.1,0.3,0.2,0,0.2");

    expect(rects).toEqual([]);
    expect(errors).toEqual([
      {
        line: 1,
        message: "lx,ly,lz must be > 0.",
        raw: "0,0.1,0.3,0.2,0,0.2",
      },
    ]);
  });

  it("reports an error when ly is negative", () => {
    const { rects, errors } = parseRectInfo("0.1,-0.1,0.3,0.2,0,0.2");

    expect(rects).toEqual([]);
    expect(errors).toEqual([
      {
        line: 1,
        message: "lx,ly,lz must be > 0.",
        raw: "0.1,-0.1,0.3,0.2,0,0.2",
      },
    ]);
  });

  it("reports an error when lz is negative", () => {
    const { rects, errors } = parseRectInfo("0.1,0.1,-0.3,0.2,0,0.2");

    expect(rects).toEqual([]);
    expect(errors).toEqual([
      {
        line: 1,
        message: "lx,ly,lz must be > 0.",
        raw: "0.1,0.1,-0.3,0.2,0,0.2",
      },
    ]);
  });

  it("reports a non-finite-number error for a numeral that overflows to Infinity", () => {
    // A 400-digit numeral matches the field's regex shape (digits only)
    // but parseFloat() rounds it to Infinity, which the parser rejects
    // separately from the format check.
    const hugeNumber = "9".repeat(400);
    const line = `${hugeNumber},0.1,0.3,0.2,0,0.2`;
    const { rects, errors } = parseRectInfo(line);

    expect(rects).toEqual([]);
    expect(errors).toEqual([
      {
        line: 1,
        message: "Non-finite number detected.",
        raw: line,
      },
    ]);
  });

  it("reports one error per invalid line while still parsing the valid lines around it, with 1-based line numbers", () => {
    const { rects, errors } = parseRectInfo(
      "0.1,0.1,0.3,0.2,0,0.2\nbadline\n0.2,0.15,0.3,0.5,0,0.2"
    );

    expect(rects).toHaveLength(2);
    expect(rects[0].pos).toEqual({ x: 0.2, y: 0, z: 0.2 });
    expect(rects[1].pos).toEqual({ x: 0.5, y: 0, z: 0.2 });
    expect(errors).toEqual([
      {
        line: 2,
        message: "Invalid format. Expect: *?lx,ly,lz,x,y,z",
        raw: "badline",
      },
    ]);
  });
});
