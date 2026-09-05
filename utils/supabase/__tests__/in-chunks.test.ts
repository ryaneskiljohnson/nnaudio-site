/**
 * @fileoverview Tests for PostgREST `.in()` chunking.
 * @module utils/supabase/__tests__/in-chunks.test
 */

import { describe, expect, it } from "vitest";
import {
  chunkIds,
  fetchAllRangedRows,
  SUPABASE_IN_CHUNK_SIZE,
  SUPABASE_RANGE_PAGE_SIZE,
} from "@/utils/supabase/in-chunks";

describe("chunkIds", () => {
  it("returns empty for an empty list", () => {
    expect(chunkIds([])).toEqual([]);
  });

  it("keeps a short list in one chunk", () => {
    expect(chunkIds(["a", "b"], 10)).toEqual([["a", "b"]]);
  });

  it("splits on the requested size", () => {
    expect(chunkIds(["a", "b", "c", "d"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(chunkIds(["a", "b", "c"], 2)).toEqual([["a", "b"], ["c"]]);
  });

  it("defaults to the PostgREST-safe chunk size", () => {
    const ids = Array.from({ length: SUPABASE_IN_CHUNK_SIZE + 1 }, (_, i) => i);
    const chunks = chunkIds(ids);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(SUPABASE_IN_CHUNK_SIZE);
    expect(chunks[1]).toEqual([SUPABASE_IN_CHUNK_SIZE]);
  });
});

describe("fetchAllRangedRows", () => {
  it("walks pages until a short page and throws on error", async () => {
    const page1 = Array.from({ length: SUPABASE_RANGE_PAGE_SIZE }, (_, i) => i);
    const loadPage = async (from: number) => {
      if (from === 0) return { data: page1, error: null };
      if (from === SUPABASE_RANGE_PAGE_SIZE) {
        return { data: [SUPABASE_RANGE_PAGE_SIZE], error: null };
      }
      return { data: [], error: null };
    };
    await expect(fetchAllRangedRows(loadPage)).resolves.toHaveLength(
      SUPABASE_RANGE_PAGE_SIZE + 1
    );
    await expect(
      fetchAllRangedRows(async () => ({
        data: null,
        error: { message: "boom" },
      }))
    ).rejects.toThrow("boom");
  });
});
