/**
 * @fileoverview Wrap-safe credit name helpers (1080p Cymasphere).
 * @module utils/__tests__/hero-credit-style.test
 */

import { describe, expect, it } from "vitest";
import {
  CREDIT_NAME_WRAP_CSS,
  creditNameColumnPx,
  creditNameFontSizePx,
  creditNameStaysOneLine,
  estimateCreditNameWidthPx,
} from "@/utils/hero-credit-style";

describe("credit name wrap CSS", () => {
  it("never wraps mid-word", () => {
    expect(CREDIT_NAME_WRAP_CSS.overflowWrap).toBe("normal");
    expect(CREDIT_NAME_WRAP_CSS.wordBreak).toBe("normal");
    expect(CREDIT_NAME_WRAP_CSS.whiteSpace).toBe("nowrap");
    expect(CREDIT_NAME_WRAP_CSS.hyphens).toBe("none");
  });

  it("keeps Cymasphere on one line at 1080p", () => {
    const column = creditNameColumnPx(1080);
    const font = creditNameFontSizePx(1080);
    expect(column).toBeGreaterThan(250);
    expect(font).toBeLessThan(40);
    expect(creditNameStaysOneLine("Cymasphere", column, font)).toBe(true);
  });

  it("would overflow at the old 3.1rem clamp with mid-word wrap", () => {
    const column = creditNameColumnPx(1080);
    const oldMaxPx = 3.1 * 16;
    expect(estimateCreditNameWidthPx("Cymasphere", oldMaxPx)).toBeGreaterThan(
      column
    );
  });
});
