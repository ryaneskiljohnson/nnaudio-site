import { describe, it, expect } from "vitest";
import {
  escapeIlikeExactPattern,
  escapeIlikeContainsForOr,
} from "@/utils/supabase/ilike-escape";

describe("escapeIlikeExactPattern", () => {
  it("escapes LIKE wildcards", () => {
    expect(escapeIlikeExactPattern("100%_off\\now")).toBe("100\\%\\_off\\\\now");
  });
});

describe("escapeIlikeContainsForOr", () => {
  it("strips PostgREST .or() delimiters so search cannot inject extra filters", () => {
    expect(escapeIlikeContainsForOr("a,b(c):*d")).toBe("abcd");
  });
});
