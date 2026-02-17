/**
 * Utility functions to handle synth and effect parameter updates
 */

// Define interfaces for synth/effect parameter shapes (library-agnostic)
interface SignalValue {
  value: number;
}

interface EnvelopeParams {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  [key: string]: number | undefined;
}

interface SynthLike {
  envelope?: EnvelopeParams;
  detune?: SignalValue | number;
  volume?: SignalValue | number;
  voices?: Array<SynthLike> | Record<string, SynthLike>;
  modulationIndex?: SignalValue;
  harmonicity?: SignalValue;
  modulation?: {
    padFilter?: {
      frequency: SignalValue;
      Q: SignalValue;
    };
    vibrato?: {
      depth: SignalValue;
      frequency: SignalValue;
    };
    phaser?: {
      frequency: SignalValue;
      depth: SignalValue;
    };
    autoPanner?: {
      frequency: SignalValue;
      depth: SignalValue;
    };
  };
  get?: (param: string) => unknown;
  set?: (params: Record<string, unknown>) => void;
  [key: string]: unknown;
}

interface EffectLike {
  wet?: SignalValue;
  dry?: SignalValue;
  set?: (params: Record<string, unknown>) => void;
  [key: string]: unknown;
}

interface EffectsChainParam {
  masterVolume?: {
    volume: SignalValue;
  };
  [key: string]: EffectLike | undefined;
}

type SynthType = "polysynth" | "fmsynth" | "padsynth" | string;
type ParameterMapping = Record<string, unknown>;

/**
 * Type guard to check if an object is a SignalValue (.value)
 */
function isSignalValue(obj: unknown): obj is SignalValue {
  return obj !== null && typeof obj === "object" && "value" in obj;
}

/**
 * Updates a parameter on the selected synthesizer
 * @param synth - The synthesizer instance
 * @param synthType - The type of synthesizer
 * @param param - The parameter to update
 * @param value - The new value for the parameter
 */
export const updateSynthParameter = (
  synth: SynthLike,
  synthType: SynthType,
  param: string,
  value: number
): void => {
  if (!synth) {
    console.warn("Cannot update parameter: No synth provided");
    return;
  }

  // Ensure value is a valid number
  if (typeof value !== "number" || isNaN(value)) {
    console.warn(
      `Invalid parameter value for ${param}: ${value}. Must be a number.`
    );
    return;
  }

  try {
    console.log(`Setting ${synthType} parameter: ${param} = ${value}`);

    // Special handling for multi-voice padsynth
    if (synthType === "padsynth" && synth.voices) {
      handlePadSynthParameter(synth, param, value);
      return;
    }

    // Handle envelope parameters (common across many synths)
    if (param.includes("envelope.")) {
      const envParam = param.split(".")[1];

      // Try the most common methods of setting envelope params
      if (synth.envelope && typeof synth.envelope[envParam] !== "undefined") {
        // 1. Direct envelope property
        synth.envelope[envParam] = value;
        return;
      } else if (synth.set) {
        // 2. Use the set method available on many synth instruments
        synth.set({ envelope: { [envParam]: value } });
        return;
      } else {
        // 3. Try direct path setting for complex synths
        try {
          setPropByPath(synth, `envelope.${envParam}`, value);
          return;
        } catch (e: unknown) {
          const error = e as Error;
          console.warn(
            `Failed to set ${param} on ${synthType}: ${error.message}`
          );
        }
      }
    }

    // Handle type-specific parameters using built-in methods
    switch (synthType) {
      case "polysynth":
        handlePolySynthParameter(synth, param, value);
        break;

      case "fmsynth":
        handleFMSynthParameter(synth, param, value);
        break;

      case "padsynth":
        // Already handled by the special case above
        break;

      default:
        console.warn(`Unknown synth type: ${synthType}`);
    }
  } catch (err) {
    console.error(
      `Error updating synth parameter: ${param}=${value} for ${synthType}:`,
      err
    );
  }
};

/**
 * Handles a polyVolume parameter by properly setting the volume on the synth
 * Volume is a special parameter that needs careful handling for signal/value synths.
 */
function handleVolumeParameter(synth: SynthLike, value: number): boolean {
  console.log(`Setting volume to ${value}dB`);

  // Try multiple approaches to ensure volume is set
  try {
    // First approach: use volume.value if available
    if (synth.volume && isSignalValue(synth.volume)) {
      synth.volume.value = parseFloat(String(value));
      console.log(`Set volume to ${value}dB using volume.value`);
      return true;
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.warn("Error setting volume.value directly:", err.message);
  }

  try {
    // Second approach: use set method with volume parameter
    if (synth.set) {
      synth.set({ volume: parseFloat(String(value)) });
      console.log(`Set volume to ${value}dB using set method`);
      return true;
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.warn("Error setting volume using set method:", err.message);
  }

  try {
    // Last resort: try to access volume as a property
    if (typeof synth.volume === "number") {
      synth.volume = parseFloat(String(value));
      console.log(`Set volume to ${value}dB by direct assignment`);
      return true;
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.warn("Error setting volume directly:", err.message);
  }

  console.error("Failed to set volume using any method");
  return false;
}

/**
 * Helper function to handle PolySynth parameters
 */
function handlePolySynthParameter(
  synth: SynthLike,
  param: string,
  value: number
): void {
  // Handle general ADSR envelope parameters
  if (param.match(/^(attack|decay|sustain|release)$/)) {
    // Try to set envelope parameter directly
    if (synth.envelope && synth.envelope[param] !== undefined) {
      try {
        synth.envelope[param] = value;
      } catch (error: unknown) {
        const err = error as Error;
        console.warn(
          `Error setting ${param} directly on envelope:`,
          err.message
        );

        // Try alternative method
        if (synth.set) {
          try {
            synth.set({ envelope: { [param]: value } });
          } catch (setError: unknown) {
            const err = setError as Error;
            console.error(`Error setting ${param} via set:`, err.message);
          }
        }
      }
    } else if (synth.set) {
      // Try to set using the set method
      try {
        synth.set({ envelope: { [param]: value } });
      } catch (error: unknown) {
        const err = error as Error;
        console.error(`Error setting envelope.${param}:`, err.message);
      }
    }
  } else if (param === "detune") {
    // Handle detune parameter
    try {
      if (synth.detune && isSignalValue(synth.detune)) {
        synth.detune.value = value;
      } else if (synth.set) {
        synth.set({ detune: value });
      }

      // Also try to set detune on individual voices if this is a PolySynth
      if (synth.voices && Array.isArray(synth.voices)) {
        synth.voices.forEach((voice: SynthLike) => {
          if (voice.detune && isSignalValue(voice.detune)) {
            voice.detune.value = value;
          }
        });
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.warn("Error setting detune:", err.message);
    }
  } else if (param === "volume" || param === "polyVolume") {
    // Use our special volume handler
    handleVolumeParameter(synth, value);
  } else if (param.startsWith("poly")) {
    // Legacy parameter names (e.g., polyAttack -> envelope.attack)
    const mappedParam = mapLegacyParameter(param);
    if (mappedParam && synth.set) {
      try {
        synth.set(mappedParam);
      } catch (error: unknown) {
        const err = error as Error;
        console.warn(`Error setting legacy parameter ${param}:`, err.message);
      }
    }
  }
}

/**
 * Helper function to handle FMSynth parameters
 */
function handleFMSynthParameter(
  synth: SynthLike,
  param: string,
  value: number
): void {
  if (param === "modulationIndex") {
    // Try multiple ways to set modulationIndex
    if (synth.modulationIndex && isSignalValue(synth.modulationIndex)) {
      synth.modulationIndex.value = value;
    } else if (synth.set) {
      synth.set({ modulationIndex: value });
    }
  } else if (param === "harmonicity") {
    // Try multiple ways to set harmonicity
    if (synth.harmonicity && isSignalValue(synth.harmonicity)) {
      synth.harmonicity.value = value;
    } else if (synth.set) {
      synth.set({ harmonicity: value });
    }
  } else if (param === "volume" || param === "fmVolume") {
    // Use our special volume handler
    handleVolumeParameter(synth, value);
  } else if (param.startsWith("fm")) {
    // Legacy parameter names (e.g., fmAttack -> envelope.attack)
    const mappedParam = mapLegacyParameter(param);
    if (mappedParam && synth.set) {
      synth.set(mappedParam);
    }
  }
}

/**
 * Special handling for pad synth parameter updates
 * @param synth - The pad synth object
 * @param param - The parameter to update
 * @param value - The new parameter value
 */
const handlePadSynthParameter = (
  synth: SynthLike,
  param: string,
  value: number
): void => {
  if (!synth) {
    console.warn("Cannot update parameter: No pad synth provided");
    return;
  }

  if (!synth.voices) {
    console.warn("PadSynth has no voices property");
    return;
  }

  console.log(`Applying parameter ${param}=${value} to pad synth voices`);

  // For envelope parameters, we need special handling
  if (param.includes("envelope.")) {
    const envParam = param.split(".")[1];

    if (!envParam) {
      console.warn("Invalid envelope parameter format:", param);
      return;
    }

    let atLeastOneSuccess = false;

    // Apply to each voice individually
    Object.entries(synth.voices as Record<string, SynthLike>).forEach(
      ([voiceName, voice]) => {
        try {
          if (!voice) {
            console.warn(`Voice ${voiceName} is null or undefined`);
            return;
          }

          // Use multiple strategies to set the envelope parameter
          // Strategy 1: Through the voice's envelope object directly
          if (
            voice.envelope &&
            typeof voice.envelope[envParam] !== "undefined"
          ) {
            voice.envelope[envParam] = value;
            console.log(
              `Set ${envParam}=${value} on ${voiceName} envelope directly`
            );
            atLeastOneSuccess = true;
            return; // Exit this voice's setup once successful
          }

          // Strategy 2: Using the voice's set method
          if (voice.set) {
            try {
              voice.set({ envelope: { [envParam]: value } });
              console.log(
                `Set ${envParam}=${value} on ${voiceName} using set method`
              );
              atLeastOneSuccess = true;
              return; // Exit this voice's setup once successful
            } catch (setError: unknown) {
              const err = setError as Error;
              console.warn(
                `Failed to use set method for ${voiceName}:`,
                err.message
              );
              // Continue to next strategy
            }
          }

          // Strategy 3: Try capitalized property format (e.g. envelopeAttack)
          const capitalizedProp = `envelope${
            envParam.charAt(0).toUpperCase() + envParam.slice(1)
          }`;
          if (typeof voice[capitalizedProp] !== "undefined") {
            voice[capitalizedProp] = value;
            console.log(`Set ${capitalizedProp}=${value} on ${voiceName}`);
            atLeastOneSuccess = true;
            return; // Exit this voice's setup once successful
          }

          // Strategy 4: For PolySynth-based voices, try the voice's internal voices
          if (
            voice.voices &&
            Array.isArray(voice.voices) &&
            voice.voices.length > 0
          ) {
            let voiceSuccess = false;

            voice.voices.forEach((innerVoice: SynthLike, index: number) => {
              if (!innerVoice) return;

              try {
                if (
                  innerVoice.envelope &&
                  typeof innerVoice.envelope[envParam] !== "undefined"
                ) {
                  innerVoice.envelope[envParam] = value;
                  console.log(
                    `Set ${envParam}=${value} on ${voiceName} inner voice ${index}`
                  );
                  voiceSuccess = true;
                } else if (innerVoice.set) {
                  innerVoice.set({ envelope: { [envParam]: value } });
                  console.log(
                    `Set ${envParam}=${value} on ${voiceName} inner voice ${index} using set`
                  );
                  voiceSuccess = true;
                }
              } catch (innerError: unknown) {
                const err = innerError as Error;
                console.warn(
                  `Error setting envelope on ${voiceName} inner voice ${index}:`,
                  err.message
                );
              }
            });

            if (voiceSuccess) {
              atLeastOneSuccess = true;
              return; // Exit this voice's setup once successful
            }
          }

          // Strategy 5: Try direct parameter application for voice
          if (typeof voice[envParam] !== "undefined") {
            voice[envParam] = value;
            console.log(`Set ${envParam}=${value} directly on ${voiceName}`);
            atLeastOneSuccess = true;
            return;
          }

          console.warn(
            `Failed to find a way to set ${envParam} on ${voiceName}`
          );
        } catch (e: unknown) {
          const err = e as Error;
          console.warn(`Error setting ${param} on ${voiceName}:`, err.message);
        }
      }
    );

    if (!atLeastOneSuccess) {
      console.warn(
        `Failed to set envelope parameter ${envParam} on any voices`
      );
    }

    return;
  }

  // Handle detune parameter (very common)
  if (param === "detune") {
    let atLeastOneSuccess = false;

    Object.entries(synth.voices as Record<string, SynthLike>).forEach(
      ([voiceName, voice]) => {
        try {
          if (!voice) return;

          if (voice.detune && isSignalValue(voice.detune)) {
            voice.detune.value = value;
            console.log(
              `Set detune=${value} on ${voiceName} using detune.value`
            );
            atLeastOneSuccess = true;
          } else if (voice.detune !== undefined) {
            voice.detune = value;
            console.log(`Set detune=${value} on ${voiceName} directly`);
            atLeastOneSuccess = true;
          } else if (voice.set) {
            voice.set({ detune: value });
            console.log(`Set detune=${value} on ${voiceName} using set method`);
            atLeastOneSuccess = true;
          }
        } catch (e: unknown) {
          const err = e as Error;
          console.warn(`Error setting detune on ${voiceName}:`, err.message);
        }
      }
    );

    if (!atLeastOneSuccess) {
      console.warn(`Failed to set detune parameter on any voices`);
    }

    return;
  }

  // Handle volume parameter
  if (param === "volume") {
    let atLeastOneSuccess = false;

    Object.entries(synth.voices as Record<string, SynthLike>).forEach(
      ([voiceName, voice]) => {
        try {
          if (!voice) return;

          if (voice.volume && isSignalValue(voice.volume)) {
            voice.volume.value = value;
            console.log(
              `Set volume=${value} on ${voiceName} using volume.value`
            );
            atLeastOneSuccess = true;
          } else if (voice.volume !== undefined) {
            try {
              voice.volume = value;
              console.log(`Set volume=${value} on ${voiceName} directly`);
              atLeastOneSuccess = true;
            } catch (volumeError: unknown) {
              const err = volumeError as Error;
              console.warn(
                `Error setting volume directly on ${voiceName}:`,
                err.message
              );

              // Try alternative approach for volume
              if (voice.set) {
                voice.set({ volume: value });
                console.log(
                  `Set volume=${value} on ${voiceName} using set method after direct failure`
                );
                atLeastOneSuccess = true;
              }
            }
          } else if (voice.set) {
            voice.set({ volume: value });
            console.log(`Set volume=${value} on ${voiceName} using set method`);
            atLeastOneSuccess = true;
          }
        } catch (e: unknown) {
          const err = e as Error;
          console.warn(`Error setting volume on ${voiceName}:`, err.message);
        }
      }
    );

    if (!atLeastOneSuccess) {
      console.warn(`Failed to set volume parameter on any voices`);
    }

    return;
  }

  // Handle special parameters for padsynth modulation effects
  if (synth.modulation) {
    try {
      // Filter parameters
      if (param === "filterFreq" && synth.modulation.padFilter) {
        synth.modulation.padFilter.frequency.value = value;
        console.log(`Set filter frequency=${value} on padsynth modulation`);
        return;
      } else if (param === "filterQ" && synth.modulation.padFilter) {
        synth.modulation.padFilter.Q.value = value;
        console.log(`Set filter Q=${value} on padsynth modulation`);
        return;
      }

      // Vibrato parameters
      else if (param === "vibratoDepth" && synth.modulation.vibrato) {
        synth.modulation.vibrato.depth.value = value;
        console.log(`Set vibrato depth=${value} on padsynth modulation`);
        return;
      } else if (param === "vibratoRate" && synth.modulation.vibrato) {
        synth.modulation.vibrato.frequency.value = value;
        console.log(`Set vibrato rate=${value} on padsynth modulation`);
        return;
      }

      // Phaser parameters
      else if (param === "phaserFreq" && synth.modulation.phaser) {
        synth.modulation.phaser.frequency.value = value;
        console.log(`Set phaser frequency=${value} on padsynth modulation`);
        return;
      } else if (param === "phaserDepth" && synth.modulation.phaser) {
        synth.modulation.phaser.depth.value = value;
        console.log(`Set phaser depth=${value} on padsynth modulation`);
        return;
      }

      // AutoPanner parameters
      else if (param === "pannerRate" && synth.modulation.autoPanner) {
        synth.modulation.autoPanner.frequency.value = value;
        console.log(`Set panner rate=${value} on padsynth modulation`);
        return;
      } else if (param === "pannerDepth" && synth.modulation.autoPanner) {
        synth.modulation.autoPanner.depth.value = value;
        console.log(`Set panner depth=${value} on padsynth modulation`);
        return;
      }

      // If we get here, the parameter wasn't recognized
      console.warn(`Unrecognized pad synth parameter: ${param}`);
    } catch (modulationError: unknown) {
      const err = modulationError as Error;
      console.error(
        `Error setting modulation parameter ${param}:`,
        err.message
      );
    }
    return;
  } else {
    console.warn("No modulation property found on pad synth");
  }

  // If we get here, the parameter wasn't handled
  console.warn(`Unhandled pad synth parameter: ${param}`);
};

/**
 * Map legacy parameter names to the synth/effect parameter structure.
 */
function mapLegacyParameter(param: string): ParameterMapping | null {
  const paramMappings: Record<string, ParameterMapping> = {
    // PolySynth params
    polyVolume: { volume: null },
    polyDetune: { detune: null },
    polyAttack: { envelope: { attack: null } },
    polyDecay: { envelope: { decay: null } },
    polySustain: { envelope: { sustain: null } },
    polyRelease: { envelope: { release: null } },

    // FMSynth params
    fmVolume: { volume: null },
    fmModulationIndex: { modulationIndex: null },
    fmHarmonicity: { harmonicity: null },
    fmAttack: { envelope: { attack: null } },
    fmDecay: { envelope: { decay: null } },
    fmSustain: { envelope: { sustain: null } },
    fmRelease: { envelope: { release: null } },

    // PadSynth params
    padVolume: { volume: null },
    padDetune: { detune: null },
    padAttack: { envelope: { attack: null } },
    padDecay: { envelope: { decay: null } },
    padSustain: { envelope: { sustain: null } },
    padRelease: { envelope: { release: null } },
    padFilterFreq: { filterFrequency: null },
  };

  return paramMappings[param] || null;
}

/**
 * Safely set a deeply nested property by path
 */
function setPropByPath(obj: unknown, path: string, value: unknown): void {
  if (obj === null || typeof obj !== "object") {
    throw new Error("Cannot set property on a non-object");
  }

  const parts = path.split(".");
  let current = obj as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined) {
      throw new Error(
        `Property path does not exist: ${path} (stopped at ${parts[i]})`
      );
    }

    const nextPart = current[parts[i]];
    if (nextPart === null || typeof nextPart !== "object") {
      throw new Error(`Cannot traverse path: ${parts[i]} is not an object`);
    }

    current = nextPart as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (current[lastPart] !== undefined) {
    if (
      typeof current[lastPart] === "object" &&
      current[lastPart] !== null &&
      "value" in (current[lastPart] as object)
    ) {
      // Handle signal objects which have a .value property
      (current[lastPart] as { value: unknown }).value = value;
    } else {
      current[lastPart] = value;
    }
  } else {
    throw new Error(`Property ${lastPart} does not exist in ${path}`);
  }
}

/**
 * Updates a parameter on an audio effect
 * @param effectsChain - The effects chain object
 * @param effectType - The type of effect (e.g., 'reverb', 'delay')
 * @param param - The parameter to update (e.g., 'Decay', 'Time')
 * @param value - The new value for the parameter
 */
export const updateEffectParameter = (
  effectsChain: EffectsChainParam,
  effectType: string,
  param: string,
  value: number | string
): void => {
  if (!effectsChain) {
    console.warn("No effects chain provided");
    return;
  }

  const parsedValue = typeof value === "string" ? parseFloat(value) : value;

  try {
    // Special handling for masterVolume
    if (effectType === "masterVolume") {
      if (effectsChain.masterVolume) {
        console.log(`Setting master volume to ${parsedValue}dB`);
        effectsChain.masterVolume.volume.value = parsedValue;
        return;
      } else {
        console.warn("Master volume not found in effects chain");
        return;
      }
    }

    // Handle regular effects
    const effect = effectsChain[effectType];
    if (!effect) {
      console.warn(`Effect ${effectType} not found in effects chain`);
      return;
    }

    // Handle special parameters
    if (param === "wet" || param === "dry") {
      if (effect[param] && isSignalValue(effect[param])) {
        effect[param].value = parsedValue;
      } else if (effect.set) {
        effect.set({ [param]: parsedValue });
      }
    } else if (effect[param] && isSignalValue(effect[param])) {
      // Handle audio params
      effect[param].value = parsedValue;
    } else if (typeof effect[param] !== "undefined") {
      // Handle direct properties
      effect[param] = parsedValue;
    } else if (effect.set) {
      // Try the set method as a fallback
      effect.set({ [param]: parsedValue });
    } else {
      console.warn(
        `Could not update parameter ${param} on effect ${effectType}`
      );
    }
  } catch (error) {
    console.error(
      `Error updating effect parameter ${effectType}.${param}:`,
      error
    );
  }
};
