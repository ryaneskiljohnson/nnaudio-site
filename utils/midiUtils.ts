/**
 * Utility functions for MIDI handling
 */
// Removing unused import
// Define MIDIOutput interface if not already available
interface MIDIOutput {
  send: (data: number[]) => void;
  id?: string;
  name?: string;
}

// Declare Web MIDI API types for TypeScript
declare global {
  interface Navigator {
    requestMIDIAccess(options?: { sysex: boolean }): Promise<MIDIAccess>;
  }

  interface MIDIAccess {
    readonly outputs: MIDIOutputMap;
  }

  interface MIDIOutputMap {
    entries(): IterableIterator<[string, MIDIOutput]>;
    keys(): IterableIterator<string>;
    values(): IterableIterator<MIDIOutput>;
    forEach(
      callback: (output: MIDIOutput, key: string, map: MIDIOutputMap) => void
    ): void;
  }
}

/**
 * Initialize MIDI access for the application
 * @returns {Promise<Object>} Promise resolving to the MIDI access object
 */
export const initializeMIDI = async () => {
  if (!navigator.requestMIDIAccess) {
    console.warn("WebMIDI is not supported in this browser");
    return null;
  }

  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    console.log("MIDI access granted");

    // Get available outputs
    const outputs = Array.from(access.outputs.values());

    return {
      access,
      outputs,
      defaultOutput: outputs.length > 0 ? outputs[0] : null,
    };
  } catch (err) {
    console.error("MIDI access denied:", err);
    return null;
  }
};

/**
 * Send a MIDI note on message to a MIDI output
 * @param {Object} midiOutput - MIDI output device
 * @param {number} note - MIDI note number
 * @param {number} velocity - Note velocity (0-127)
 * @param {number} channel - MIDI channel (0-15)
 */
export const sendMIDINoteOn = (
  midiOutput: MIDIOutput | null,
  note: number,
  velocity = 100,
  channel = 0
) => {
  if (!midiOutput) return;

  const noteOnStatus = 0x90 + channel; // Note On on the specified channel
  midiOutput.send([noteOnStatus, note, velocity]);
};

/**
 * Send a MIDI note off message to a MIDI output
 * @param {Object} midiOutput - MIDI output device
 * @param {number} note - MIDI note number
 * @param {number} channel - MIDI channel (0-15)
 */
export const sendMIDINoteOff = (
  midiOutput: MIDIOutput | null,
  note: number,
  channel = 0
) => {
  if (!midiOutput) return;

  const noteOffStatus = 0x80 + channel; // Note Off on the specified channel
  midiOutput.send([noteOffStatus, note, 0]);
};

/**
 * Send a chord (multiple notes) via MIDI
 * @param {Object} midiOutput - MIDI output device
 * @param {Array<number>} notes - Array of MIDI note numbers
 * @param {number} velocity - Note velocity (0-127)
 * @param {number} channel - MIDI channel (0-15)
 */
export const sendMIDIChord = (
  midiOutput: MIDIOutput | null,
  notes: number[],
  velocity = 100,
  channel = 0
) => {
  if (!midiOutput || !notes) return;

  notes.forEach((note: number) => {
    sendMIDINoteOn(midiOutput, note, velocity, channel);
  });
};

/**
 * Turn off all notes on a MIDI channel (panic function)
 * @param {Object} midiOutput - MIDI output device
 * @param {number} channel - MIDI channel (0-15), or null for all channels
 */
export const allNotesOff = (
  midiOutput: MIDIOutput | null,
  channel: number | null = null
) => {
  if (!midiOutput) return;

  if (channel !== null) {
    // Send all notes off for specific channel
    midiOutput.send([0xb0 + channel, 0x7b, 0]);
  } else {
    // Send all notes off for all channels
    for (let ch = 0; ch < 16; ch++) {
      midiOutput.send([0xb0 + ch, 0x7b, 0]);
    }
  }
};
