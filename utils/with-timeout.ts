/**
 * @fileoverview Promise race helper that returns a fallback after a
 * deadline and swallows late rejections so the loser cannot surface as
 * an unhandled rejection.
 * @module utils/with-timeout
 */

export type WithTimeoutOptions = {
  /** Called once when the deadline wins the race. */
  onTimeout?: () => void;
  /** Called when the original promise rejects after the fallback won. */
  onLateError?: (error: unknown) => void;
};

/**
 * @brief Resolves `promise` or `fallback` if it exceeds `ms`.
 * @param promise Work that must not block forever.
 * @param ms Deadline in milliseconds.
 * @param fallback Value used when the deadline is missed.
 * @param options Optional timeout / late-error hooks.
 * @returns The settled value or the fallback.
 * @note The underlying promise is not aborted. Late rejections are
 * logged via `onLateError` instead of becoming unhandled.
 * @example
 * await withTimeout(fetchSeed(), 4000, emptySeed(), {
 *   onTimeout: () => console.warn("seed timed out"),
 * });
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  options: WithTimeoutOptions = {}
): Promise<T> {
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  void promise.catch((error: unknown) => {
    if (settled) {
      options.onLateError?.(error);
    }
  });

  try {
    return await Promise.race([
      promise.then((value) => {
        settled = true;
        return value;
      }),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          options.onTimeout?.();
          resolve(fallback);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
