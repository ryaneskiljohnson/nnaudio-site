/**
 * @fileoverview Unit tests for {@link withTimeout}.
 * @module utils/__tests__/with-timeout.test
 */

import { describe, expect, it, vi } from "vitest";
import { withTimeout } from "@/utils/with-timeout";

describe("withTimeout", () => {
  it("returns the promise value when it settles before the deadline", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1000, "fallback")).resolves.toBe(
      "ok"
    );
  });

  it("returns the fallback and calls onTimeout when the deadline wins", async () => {
    const onTimeout = vi.fn();
    await expect(
      withTimeout(new Promise<string>(() => {}), 20, "fallback", { onTimeout })
    ).resolves.toBe("fallback");
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("swallows late rejections after the fallback wins", async () => {
    let rejectLate!: (error: Error) => void;
    const late = new Promise<string>((_, reject) => {
      rejectLate = reject;
    });
    const onLateError = vi.fn();
    await expect(
      withTimeout(late, 20, "fallback", { onLateError })
    ).resolves.toBe("fallback");
    rejectLate(new Error("late fail"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onLateError).toHaveBeenCalledTimes(1);
  });

  it("propagates rejections that happen before the deadline", async () => {
    await expect(
      withTimeout(Promise.reject(new Error("boom")), 1000, "fallback")
    ).rejects.toThrow("boom");
  });
});
