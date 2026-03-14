/**
 * Synthesizer Presets for NNAudio
 *
 * This file contains various presets for the polysynth
 * Each preset defines synth parameters and effects settings
 */

// Main preset collection
const SYNTH_PRESETS = {
  // Default clean preset
  default: {
    name: "Default",
    description: "A clean, balanced polysynth sound",
    synthType: "polysynth",
    synthParams: {
      oscillator: {
        type: "sine",
      },
      envelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.4,
        release: 1.0,
      },
      volume: -15,
    },
    effects: {
      reverb: {
        wet: 0.3,
        decay: 2.5,
        preDelay: 0.01,
      },
      delay: {
        wet: 0.2,
        delayTime: 0.25,
        feedback: 0.3,
      },
    },
  },

  // Lush atmospheric sound
  atmospheric: {
    name: "Atmospheric",
    description: "Dreamy, lush pad with long release",
    synthType: "polysynth",
    synthParams: {
      oscillator: {
        type: "sine8",
      },
      envelope: {
        attack: 0.5,
        decay: 1.0,
        sustain: 0.7,
        release: 4.0,
      },
      volume: -18,
    },
    effects: {
      reverb: {
        wet: 0.6,
        decay: 8.0,
        preDelay: 0.02,
      },
      delay: {
        wet: 0.4,
        delayTime: 0.5,
        feedback: 0.4,
      },
      chorus: {
        wet: 0.5,
        frequency: 1.5,
        depth: 0.7,
      },
    },
  },

  // Digital bell-like sound
  bells: {
    name: "Digital Bells",
    description: "Bright bell-like tones with quick decay",
    synthType: "polysynth",
    synthParams: {
      oscillator: {
        type: "sine4",
      },
      envelope: {
        attack: 0.01,
        decay: 0.8,
        sustain: 0.1,
        release: 1.5,
      },
      volume: -16,
    },
    effects: {
      reverb: {
        wet: 0.5,
        decay: 4.0,
        preDelay: 0.01,
      },
      delay: {
        wet: 0.3,
        delayTime: 0.333,
        feedback: 0.2,
      },
    },
  },

  // Warm, analog-style sound
  analog: {
    name: "Analog Warm",
    description: "Warm analog-style synthesizer with filter",
    synthType: "polysynth",
    synthParams: {
      oscillator: {
        type: "triangle",
      },
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.6,
        release: 1.0,
      },
      filter: {
        frequency: 2000,
        Q: 1,
      },
      filterEnvelope: {
        attack: 0.1,
        decay: 0.5,
        sustain: 0.2,
        release: 1.0,
        baseFrequency: 300,
        octaves: 3,
      },
      volume: -16,
    },
    effects: {
      reverb: {
        wet: 0.2,
        decay: 1.5,
        preDelay: 0.01,
      },
      filter: {
        frequency: 1000,
        Q: 1,
        type: "lowpass",
      },
    },
  },

  // Plucky synth sound
  pluck: {
    name: "Pluck",
    description: "Short plucky sound with quick attack and decay",
    synthType: "polysynth",
    synthParams: {
      oscillator: {
        type: "triangle",
      },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.2,
        release: 0.4,
      },
      volume: -14,
    },
    effects: {
      reverb: {
        wet: 0.2,
        decay: 1.0,
        preDelay: 0.01,
      },
      delay: {
        wet: 0.1,
        delayTime: 0.16,
        feedback: 0.1,
      },
    },
  },

  // Bright, digital synth
  digital: {
    name: "Digital Bright",
    description: "Bright modern digital synthesizer sound",
    synthType: "polysynth",
    synthParams: {
      oscillator: {
        type: "square",
      },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.5,
        release: 0.5,
      },
      volume: -18,
    },
    effects: {
      distortion: {
        wet: 0.2,
        distortion: 0.3,
      },
      delay: {
        wet: 0.2,
        delayTime: 0.25,
        feedback: 0.2,
      },
      reverb: {
        wet: 0.2,
        decay: 1.0,
        preDelay: 0.01,
      },
    },
  },

  // Ambient pad synth
  "ambient-pad": {
    name: "Ambient Pad",
    description: "Spacious, evolving ambient pad with long release",
    synthType: "padsynth",
    synthParams: {
      oscillator: {
        type: "sine",
      },
      envelope: {
        attack: 0.8,
        decay: 1.5,
        sustain: 0.8,
        release: 8.0,
      },
      volume: -20,
    },
    effects: {
      reverb: {
        wet: 0.8,
        decay: 10.0,
        preDelay: 0.05,
      },
      delay: {
        wet: 0.5,
        delayTime: 0.75,
        feedback: 0.6,
      },
      chorus: {
        wet: 0.6,
        frequency: 0.8,
        depth: 0.8,
      },
      stereoWidener: {
        wet: 1.0,
        width: 0.9,
      },
    },
  },

  // Lead synth for melodies
  leadSynth: {
    name: "Lead Synth",
    description: "Bright, cutting lead synth for melodies with reverb",
    synthType: "polysynth",
    synthParams: {
      oscillator: {
        type: "sawtooth",
      },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.6,
        release: 0.8,
      },
      volume: -12,
    },
    effects: {
      reverb: {
        wet: 0.4,
        decay: 2.0,
        preDelay: 0.01,
      },
      delay: {
        wet: 0.25,
        delayTime: 0.16,
        feedback: 0.25,
      },
      filter: {
        frequency: 3000,
        Q: 1,
        type: "lowpass",
      },
    },
  },
};

// Define type for preset keys
export type PresetId = keyof typeof SYNTH_PRESETS;

// Export the presets
export default SYNTH_PRESETS;

// Helper function to get preset names for dropdown menu
export const getPresetOptions = () => {
  return Object.entries(SYNTH_PRESETS).map(([id, preset]) => ({
    value: id,
    label: preset.name,
  }));
};

// Function to get a preset by ID
export const getPresetById = (presetId: PresetId) => {
  return SYNTH_PRESETS[presetId] || SYNTH_PRESETS.default;
};
