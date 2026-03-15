/**
 * @fileoverview Fallback to decode and play audio when the browser rejects the native format.
 * Fetches the file, decodes with Web Audio API, converts to WAV PCM, and returns a blob URL
 * so the same <audio> element can play it with full seek/pause support.
 * @module utils/audioFallback
 */

/**
 * @brief Converts an AudioBuffer to a WAV (PCM 16-bit) Blob for playback in an audio element.
 * @param buffer Decoded audio from decodeAudioData.
 * @returns Blob with type 'audio/wav'.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2; // 16-bit = 2 bytes per sample
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  // WAV header (44 bytes)
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size (PCM)
  view.setUint16(20, 1, true);  // format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
  view.setUint16(32, numChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Interleave and convert float [-1,1] to int16
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      const v = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, v, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * @brief Fetches audio from URL, decodes with Web Audio API, converts to WAV, returns blob URL.
 * Caller must call URL.revokeObjectURL(url) when done to avoid leaks.
 * @param audioUrl Public URL of the audio file (must be CORS-enabled if cross-origin).
 * @param context AudioContext for decodeAudioData.
 * @returns Object URL for the WAV blob, or null if fetch/decode failed.
 */
export async function fetchDecodeAndCreateWavBlobUrl(
  audioUrl: string,
  context: AudioContext
): Promise<string | null> {
  try {
    const res = await fetch(audioUrl, { mode: 'cors' });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    const blob = audioBufferToWavBlob(audioBuffer);
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
