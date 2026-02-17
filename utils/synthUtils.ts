/**
 * Stub for synthesizer utilities (no synth engine).
 * @module utils/synthUtils
 */

import type { EffectsChain } from "@/utils/effectsUtils";

/** Stub type for synth references. */
export type DisposableSynth = null | undefined;

/**
 * No-op: no synth engine; always returns null.
 * @param _type - Ignored
 * @param _effectsChain - Ignored
 * @returns null
 */
export const createSynth = (
  _type: string,
  _effectsChain: EffectsChain | null
): null => {
  return null;
};

/**
 * No-op: nothing to dispose.
 * @param _synth - Ignored
 */
export const disposeSynth = (_synth: DisposableSynth): void => {};

/**
 * Convert MIDI note number to frequency (A4 = 69 = 440 Hz).
 * @param midiNote - MIDI note number (0-127)
 * @returns Frequency in Hz
 */
export const midiToFreq = (midiNote: number): number => {
  if (typeof midiNote !== "number" || isNaN(midiNote)) return 440;
  return 440 * Math.pow(2, (midiNote - 69) / 12);
};
