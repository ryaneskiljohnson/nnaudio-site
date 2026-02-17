/**
 * Stub for audio effects (no effects engine).
 * @module utils/effectsUtils
 */

/** Stub effects chain type. */
export interface EffectsChain {
  getEffect?: (name: string) => unknown;
}

/**
 * No-op: no effects engine; returns null.
 * @returns Promise resolving to null
 */
export const initializeEffectsChain = async (
  _lib?: unknown,
  _synth?: unknown
): Promise<EffectsChain | null> => {
  return null;
};

/**
 * No-op: nothing to dispose.
 * @param _effectsChain - Ignored
 */
export const disposeEffectsChain = (
  _effectsChain: EffectsChain | null | undefined
): void => {};
