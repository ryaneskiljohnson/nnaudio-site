"use client";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaApple,
  FaWindows,
  FaDesktop,
  FaPlug,
  FaArrowRight,
  FaArrowLeft,
  FaCheckCircle,
  FaMusic,
  FaDownload,
  FaCog,
  FaPlay,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

const WizardContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;

  @media (max-width: 768px) {
    padding: 20px 5px;
  }
`;

const WizardHeader = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const WizardTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const WizardSubtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-wrap: nowrap;
    gap: 0.25rem;
    margin-bottom: 2rem;
    padding: 0;
    width: 100%;
  }
`;

const StepDot = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s ease;
  position: relative;
  flex-shrink: 0;

  ${(props) => {
    if (props.$completed) {
      return `
        background: linear-gradient(135deg, var(--primary), var(--accent));
        color: white;
      `;
    }
    if (props.$active) {
      return `
        background: var(--primary);
        color: white;
        transform: scale(1.1);
      `;
    }
    return `
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-secondary);
    `;
  }}

  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;

    ${(props) => {
      if (props.$active) {
        return `
          transform: scale(1.05);
        `;
      }
      return "";
    }}
  }
`;

const StepLine = styled.div<{ $completed: boolean }>`
  width: 60px;
  height: 2px;
  background: ${(props) =>
    props.$completed
      ? "linear-gradient(90deg, var(--primary), var(--accent))"
      : "rgba(255, 255, 255, 0.1)"};
  transition: all 0.3s ease;
  flex-shrink: 0;

  @media (max-width: 768px) {
    flex: 1;
    min-width: 8px;
    max-width: 20px;
  }
`;

const StepContent = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    padding: 1rem 0.75rem;
  }
`;

const StepTitle = styled.h2`
  font-size: 1.75rem;
  margin-bottom: 1rem;
  color: var(--text);

  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }
`;

const StepDescription = styled.p`
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const OptionCard = styled(motion.div)<{ $selected: boolean }>`
  background: ${(props) =>
    props.$selected
      ? "linear-gradient(135deg, rgba(108, 99, 255, 0.2), rgba(78, 205, 196, 0.2))"
      : "rgba(30, 30, 46, 0.5)"};
  border: 2px solid
    ${(props) =>
      props.$selected ? "var(--primary)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 12px;
  padding: 2rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;

  &:hover {
    transform: translateY(-5px);
    border-color: var(--primary);
    box-shadow: 0 8px 20px rgba(108, 99, 255, 0.2);
  }

  @media (max-width: 768px) {
    padding: 1.25rem 0.75rem;
  }
`;

const OptionIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--primary);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const OptionName = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
`;

const OptionDescription = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const DAWGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const DAWCard = styled(motion.div)<{ $selected: boolean; $disabled?: boolean }>`
  position: relative;
  background: ${(props) =>
    props.$disabled
      ? "rgba(30, 30, 46, 0.3)"
      : props.$selected
      ? "linear-gradient(135deg, rgba(108, 99, 255, 0.2), rgba(78, 205, 196, 0.2))"
      : "rgba(30, 30, 46, 0.5)"};
  border: 2px solid
    ${(props) =>
      props.$disabled
        ? "rgba(255, 255, 255, 0.05)"
        : props.$selected
        ? "var(--primary)"
        : "rgba(255, 255, 255, 0.1)"};
  border-radius: 12px;
  padding: 1.5rem;
  cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
  transition: all 0.3s ease;
  text-align: center;
  opacity: ${(props) => (props.$disabled ? 0.5 : 1)};

  &:hover {
    transform: ${(props) => (props.$disabled ? "none" : "translateY(-3px)")};
    border-color: ${(props) =>
      props.$disabled ? "rgba(255, 255, 255, 0.05)" : "var(--primary)"};
  }

  @media (max-width: 768px) {
    padding: 1rem 0.5rem;
  }
`;

const DAWName = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
`;

const ComingSoonBadge = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const InstructionsContainer = styled.div`
  margin-top: 2rem;

  @media (max-width: 768px) {
    margin-top: 1.5rem;
  }
`;

const InstructionStep = styled.div`
  background: rgba(30, 30, 46, 0.5);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid var(--primary);

  @media (max-width: 768px) {
    padding: 1rem 0.75rem;
    margin-bottom: 1rem;
  }
`;

const InstructionStepNumber = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  font-weight: 600;
  margin-right: 1rem;
  font-size: 0.9rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
    margin-right: 0.75rem;
  }
`;

const InstructionTitle = styled.h3`
  font-size: 1.2rem;
  color: var(--text);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }
`;

const InstructionContent = styled.div`
  color: var(--text-secondary);
  line-height: 1.6;
  margin-left: 3rem;

  ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
    list-style-type: decimal;
    list-style-position: outside;
  }

  ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
    list-style-type: disc;
    list-style-position: outside;
  }

  li {
    margin: 0.5rem 0;
    padding-left: 0.5rem;
  }

  @media (max-width: 768px) {
    margin-left: 0;
    margin-top: 0.75rem;

    ol,
    ul {
      padding-left: 1.25rem;
    }
  }

  code {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9em;
  }

  a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
      color: var(--accent);
      text-decoration: underline;
    }
  }
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  gap: 1rem;
`;

const NavButton = styled.button<{ $primary?: boolean; $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
  transition: all 0.3s ease;
  border: none;
  opacity: ${(props) => (props.$disabled ? 0.5 : 1)};

  ${(props) => {
    if (props.$primary) {
      return `
        background: linear-gradient(135deg, var(--primary), var(--accent));
        color: white;
        
        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(108, 99, 255, 0.3);
        }
      `;
    }
    return `
      background: rgba(255, 255, 255, 0.1);
      color: var(--text);
      
      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
      }
    `;
  }}
`;

const CompletionScreen = styled(motion.div)`
  text-align: center;
  padding: 2rem;
`;

const CompletionIcon = styled.div`
  font-size: 5rem;
  color: var(--primary);
  margin-bottom: 1.5rem;
`;

const CompletionTitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--text);
`;

const CompletionMessage = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
`;

// Download step styled components (moved outside render function to fix hooks order)
const DownloadItem = styled.div`
  display: flex;
  flex-direction: column;
  background-color: rgba(30, 30, 46, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  max-width: 600px;
  margin: 0 auto 2rem;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
`;

const DownloadHeader = styled.div`
  background: linear-gradient(
    135deg,
    rgba(108, 99, 255, 0.2),
    rgba(78, 205, 196, 0.2)
  );
  padding: 1.5rem;
  display: flex;
  align-items: center;
`;

const DownloadIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;

  svg {
    font-size: 1.8rem;
    color: var(--primary);
  }
`;

const DownloadInfo = styled.div`
  flex: 1;
`;

const DownloadName = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
`;

const DownloadVersion = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const DownloadDetails = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const DownloadDescription = styled.p`
  color: var(--text-secondary);
  margin-bottom: 1rem;
  font-size: 0.95rem;
  line-height: 1.5;
`;

const DownloadMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

const DownloadSize = styled.span``;

const DownloadDate = styled.span``;

const DownloadButtonStyled = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  width: 100%;

  svg {
    margin-right: 0.5rem;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(108, 99, 255, 0.3);
    text-decoration: none;
    color: white;
  }
`;

type OS = "macos" | "windows" | null;
type InstallationType = "standalone" | "plugin" | null;
type DAW =
  | "logic"
  | "ableton"
  | "flstudio"
  | "protools"
  | "cubase"
  | "reaper"
  | "studioone"
  | "other"
  | null;

interface InstructionData {
  title: string;
  steps: string[];
}

const getInstructions = (
  os: OS,
  type: InstallationType,
  daw: DAW
): InstructionData[] => {
  if (!os || !type || !daw) return [];

  const instructions: InstructionData[] = [];

  // Virtual MIDI setup (required for standalone only, not for plugin versions)
  if (type === "standalone") {
    if (os === "macos") {
      instructions.push({
        title: "Set Up Virtual MIDI Device (IAC Driver)",
        steps: [
          'Open "Audio MIDI Setup" (Applications > Utilities)',
          'Click "Window" > "Show MIDI Studio"',
          'Double-click "IAC Driver"',
          'Check "Device is online"',
          'Click "Done"',
        ],
      });
    } else {
      instructions.push({
        title: "Set Up Virtual MIDI Device (LoopMIDI)",
        steps: [
          'Download and install the free <a href="https://www.tobias-erichsen.de/software/loopmidi.html" target="_blank" rel="noopener noreferrer">LoopMIDI</a> software, which allows you to create a virtual MIDI device that you can route MIDI from NNAudio to',
          "Launch LoopMIDI and click '+' to create a new port",
          'Name it (e.g., "NNAudio MIDI")',
          "Keep LoopMIDI running while using NNAudio",
        ],
      });
    }
  }

  // DAW-specific instructions
  if (daw === "logic") {
    if (type === "standalone") {
      instructions.push({
        title: "Configure Logic Pro for Standalone",
        steps: [
          "Create a software instrument track",
          "Add an External Instrument track",
          `Set the MIDI destination to ${
            os === "macos" ? "IAC Driver" : "your LoopMIDI port"
          }`,
          "Add an instrument track with any virtual instrument",
          "Record-enable the instrument track",
          "NNAudio will output MIDI to the virtual MIDI device, which will come back into Logic Pro like an external keyboard",
        ],
      });
      instructions.push({
        title: "MIDI Map Transport Controls (Optional but Recommended)",
        steps: [
          "This allows you to use NNAudio's transport control to sync with Logic Pro's transport",
          "In Logic Pro, go to Logic Pro > Control Surfaces > Learn Assignment for...",
          "Select the control you want to map (e.g., Play, Stop, Record)",
          "In NNAudio, click the corresponding transport button",
          "Logic Pro will detect the MIDI message and create the assignment",
          "Repeat for other transport controls (Play, Stop, Record, etc.)",
          "Now NNAudio's transport controls will control Logic Pro's transport!",
        ],
      });
    } else {
      instructions.push({
        title: "Add NNAudio as Plugin in Logic Pro",
        steps: [
          "Create a new software instrument track",
          "Add NNAudio as a MIDI FX",
          "In the instrument slot, under Utility, add External Instrument to the same track",
          `Open External Instrument and set MIDI Destination to ${
            os === "macos" ? "IAC Driver" : "your LoopMIDI port"
          }`,
          "Create a new software instrument track with any virtual instrument",
          "Set the MIDI input channel of the instrument track to 1, 2, 3, or the appropriate channel",
          "Record-enable the instrument track",
          "Open NNAudio and press voicing buttons in Palette view—you should see the instrument track metering and hear audio",
        ],
      });
      instructions.push({
        title: "MIDI Map Transport Controls (Optional but Recommended)",
        steps: [
          "This allows you to use NNAudio's transport control to sync with Logic Pro's transport",
          "In Logic Pro, go to Logic Pro > Control Surfaces > Learn Assignment for...",
          "Select the control you want to map (e.g., Play, Stop, Record)",
          "In NNAudio, click the corresponding transport button",
          "Logic Pro will detect the MIDI message and create the assignment",
          "Repeat for other transport controls (Play, Stop, Record, etc.)",
          "Now NNAudio's transport controls will control Logic Pro's transport!",
        ],
      });
    }
  } else if (daw === "ableton") {
    if (type === "standalone") {
      instructions.push({
        title: "Configure Ableton Live for Standalone",
        steps: [
          "Create a MIDI track",
          `Set the MIDI input to ${
            os === "macos" ? "IAC Driver" : "your LoopMIDI port"
          }`,
          "Create an instrument track with any virtual instrument",
          "Arm both tracks for recording",
          "NNAudio will send MIDI to Ableton through the virtual MIDI device",
        ],
      });
      instructions.push({
        title: "MIDI Map Transport Controls (Optional but Recommended)",
        steps: [
          "This allows you to use NNAudio's transport control to sync with Ableton Live's transport",
          `Go to Preferences > MIDI and enable ${
            os === "macos" ? "IAC Driver" : "your LoopMIDI port"
          } as a Remote input`,
          "In Ableton Live, click the MIDI button in the top right corner (or press Cmd/Ctrl + M) to enter MIDI Map Mode",
          "Click on the transport control you want to map in Ableton (e.g., Play button, Stop button, Record button)",
          "In NNAudio, click the corresponding transport button",
          "Ableton will detect the MIDI message and create the assignment",
          "Repeat for other transport controls you want to map",
          "Click the MIDI button again (or press Cmd/Ctrl + M) to exit MIDI Map Mode",
          "Now NNAudio's transport controls will control Ableton Live's transport!",
        ],
      });
    } else {
      instructions.push({
        title: "Set Up NNAudio Plugin in Ableton Live",
        steps: [
          "Open the plugin menu on the side, navigate to NNAudio plugins, and drag it to create a new track",
          "For each instrument you want to use, create a MIDI track and set its input to the NNAudio track",
          `Change the input dropdown from "Post FX" to "NNAudio"`,
          `Set the MIDI Out to ${
            os === "macos" ? "IAC Driver" : "your LoopMIDI port"
          } and select the appropriate MIDI channel (1, 2, 3, etc.)`,
          "Create an instrument track with any virtual instrument",
          "Record-enable both the MIDI track and instrument track (not the NNAudio track)",
          "Open NNAudio and press voicing buttons in Palette view—you'll see MIDI flow from NNAudio → MIDI track → instrument track",
        ],
      });
      instructions.push({
        title: "MIDI Map Transport Controls (Optional but Recommended)",
        steps: [
          "This allows you to use NNAudio's transport control to sync with Ableton Live's transport",
          `Go to Preferences > MIDI and enable ${
            os === "macos" ? "IAC Driver" : "your LoopMIDI port"
          } as a Remote input`,
          "In Ableton Live, click the MIDI button in the top right corner (or press Cmd/Ctrl + M) to enter MIDI Map Mode",
          "Click on the transport control you want to map in Ableton (e.g., Play button, Stop button, Record button)",
          "In NNAudio, click the corresponding transport button",
          "Ableton will detect the MIDI message and create the assignment",
          "Repeat for other transport controls you want to map",
          "Click the MIDI button again (or press Cmd/Ctrl + M) to exit MIDI Map Mode",
          "Now NNAudio's transport controls will control Ableton Live's transport!",
        ],
      });
    }
  } else if (daw === "studioone") {
    if (type === "standalone") {
      instructions.push({
        title: "Configure Studio One for Standalone",
        steps: [
          "Create a MIDI track",
          `Set the MIDI input to ${
            os === "macos" ? "IAC Driver" : "your LoopMIDI port"
          }`,
          "Create an instrument track with any virtual instrument",
          "Arm both tracks for recording",
          "NNAudio will send MIDI to Studio One through the virtual MIDI device",
        ],
      });
      instructions.push({
        title: "MIDI Map Transport Controls (Optional but Recommended)",
        steps: [
          "This allows you to use NNAudio's transport control to sync with Studio One's transport",
          `Go to Studio One > ${
            os === "macos" ? "Preferences" : "Options"
          } > External Devices`,
          "Click the 'Add' button to add a new device",
          "Select 'New Control Surface' or choose your virtual MIDI device from the list",
          `Set 'Receive From' to ${
            os === "macos" ? "IAC Driver" : "your LoopMIDI port"
          }`,
          "Click 'MIDI Learn' button in the device settings",
          "In NNAudio, click the transport control you want to map (e.g., Play, Stop, Record)",
          "Right-click the corresponding control in Studio One and assign the command (e.g., Start, Stop, Record)",
          "Repeat for other transport controls you want to map",
          "Click 'OK' to save the device settings",
          "Now NNAudio's transport controls will control Studio One's transport!",
        ],
      });
    } else {
      instructions.push({
        title: "Set Up NNAudio Plugin in Studio One",
        steps: [
          "Create a new instrument track",
          "Add NNAudio as an instrument plugin on this track",
          "For each instrument you want to use, create a new instrument track with your desired virtual instrument",
          "On each instrument track, set the MIDI input to the NNAudio instrument track",
          "Select the appropriate MIDI channel (1, 2, 3, etc.) for each instrument track",
          "Record-enable the instrument tracks (not the NNAudio track)",
          "Open NNAudio and press voicing buttons in Palette view—you'll see MIDI flow from NNAudio → instrument tracks",
        ],
      });
      instructions.push({
        title: "MIDI Map Transport Controls (Optional but Recommended)",
        steps: [
          "This allows you to use NNAudio's transport control to sync with Studio One's transport",
          `Go to Studio One > ${
            os === "macos" ? "Preferences" : "Options"
          } > External Devices`,
          "Click the 'Add' button to add a new device",
          "Select 'New Control Surface'",
          "In the device settings, click 'MIDI Learn'",
          "In NNAudio, click the transport control you want to map (e.g., Play, Stop, Record)",
          "Right-click the corresponding control in Studio One and assign the command (e.g., Start, Stop, Record)",
          "Repeat for other transport controls you want to map",
          "Click 'OK' to save the device settings",
          "Now NNAudio's transport controls will control Studio One's transport!",
        ],
      });
    }
  } else if (daw === "other") {
    instructions.push({
      title: "General Setup Instructions",
      steps: [
        `Set up your virtual MIDI device (${
          os === "macos" ? "IAC Driver on macOS" : "LoopMIDI on Windows"
        })`,
        type === "plugin"
          ? "Add NNAudio as a MIDI Effect (VST3 or AU)"
          : "Configure your DAW to receive MIDI from the virtual device",
        "Create an instrument track with your desired virtual instrument",
        "Route MIDI from NNAudio through the virtual device to your instrument",
        "Record-enable the instrument track",
        "Open NNAudio and test with Palette view voicing buttons",
        "For specific help, join our Discord community at discord.gg/gXGqqYR47B",
      ],
    });
  }

  return instructions;
};

export default function GettingStartedWizard() {
  const { t } = useTranslation();
  const { supabase, user, refreshUser } = useAuth();

  // Refresh pro status on mount (same as login)
  useEffect(() => {
    refreshUser();
  }, [refreshUser]); // Run on mount and when refreshUser changes

  const [currentStep, setCurrentStep] = useState(1);
  const [os, setOS] = useState<OS>(null);
  const [installationType, setInstallationType] =
    useState<InstallationType>(null);
  const [daw, setDAW] = useState<DAW>(null);
  const [fileInfo, setFileInfo] = useState({
    windows: { size: "Loading...", lastModified: "Loading..." },
    macos: { size: "Loading...", lastModified: "Loading..." },
  });
  const [versionInfo, setVersionInfo] = useState({
    version: "Loading...",
    loading: true,
  });

  const totalSteps = 5;

  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        // Fetch version info from manifest file
        try {
          const { data: manifestData, error: manifestError } =
            await supabase.storage.from("builds").download("manifest.json");

          if (manifestError) {
            setVersionInfo({ version: "1.2.3", loading: false });
          } else if (manifestData) {
            const manifestText = await manifestData.text();
            const manifest = JSON.parse(manifestText);
            setVersionInfo({
              version: manifest.version || manifest.app_version || "1.2.3",
              loading: false,
            });
          }
        } catch {
          setVersionInfo({ version: "1.2.3", loading: false });
        }

        // Fetch file information from the builds bucket
        const { data: files, error } = await supabase.storage
          .from("builds")
          .list("", {
            limit: 100,
            sortBy: { column: "name", order: "asc" },
          });

        if (error) {
          return;
        }

        if (files) {
          const windowsFile = files.find(
            (file) =>
              file.name.includes("NNAudio_Installer") &&
              file.name.endsWith(".exe")
          );
          const macosFile = files.find(
            (file) => file.name === "NNAudio_Installer.pkg"
          );

          const formatFileSize = (bytes: number | null | undefined): string => {
            if (!bytes) return "Unknown";
            const mb = bytes / (1024 * 1024);
            return `${mb.toFixed(2)} MB`;
          };

          const formatDate = (
            dateString: string | null | undefined
          ): string => {
            if (!dateString) return "Unknown";
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
          };

          setFileInfo({
            windows: {
              size: windowsFile?.metadata?.size
                ? formatFileSize(windowsFile.metadata.size)
                : "Loading...",
              lastModified: windowsFile?.updated_at
                ? formatDate(windowsFile.updated_at)
                : "Loading...",
            },
            macos: {
              size: macosFile?.metadata?.size
                ? formatFileSize(macosFile.metadata.size)
                : "Loading...",
              lastModified: macosFile?.updated_at
                ? formatDate(macosFile.updated_at)
                : "Loading...",
            },
          });
        }
      } catch {
        setFileInfo({
          windows: { size: "Loading...", lastModified: "Loading..." },
          macos: { size: "Loading...", lastModified: "Loading..." },
        });
        setVersionInfo({ version: "1.2.3", loading: false });
      }
    };

    fetchFileInfo();
  }, [supabase]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return os !== null;
      case 2:
        return true; // Installation step - can always proceed
      case 3:
        return installationType !== null;
      case 4:
        return daw !== null;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <StepTitle>Select Your Operating System</StepTitle>
            <StepDescription>
              Choose the operating system you're using to get customized
              instructions.
            </StepDescription>
            <OptionsGrid>
              <OptionCard
                $selected={os === "macos"}
                onClick={() => {
                  setOS("macos");
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <OptionIcon>
                  <FaApple />
                </OptionIcon>
                <OptionName>macOS</OptionName>
                <OptionDescription>
                  For Mac users (Apple Silicon & Intel)
                </OptionDescription>
              </OptionCard>
              <OptionCard
                $selected={os === "windows"}
                onClick={() => {
                  setOS("windows");
                  // Clear Logic Pro selection if Windows is selected (Logic Pro is macOS-only)
                  if (daw === "logic") {
                    setDAW(null);
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <OptionIcon>
                  <FaWindows />
                </OptionIcon>
                <OptionName>Windows</OptionName>
                <OptionDescription>For Windows 10/11 users</OptionDescription>
              </OptionCard>
            </OptionsGrid>
          </>
        );

      case 2:
        return (
          <>
            <StepTitle>Download & Install NNAudio</StepTitle>
            <StepDescription>
              Download the installer for your operating system if you haven't
              already.
            </StepDescription>
            <DownloadItem>
              <DownloadHeader>
                <DownloadIcon>
                  {os === "macos" ? <FaApple /> : <FaWindows />}
                </DownloadIcon>
                <DownloadInfo>
                  <DownloadName>
                    NNAudio for {os === "macos" ? "macOS" : "Windows"}
                  </DownloadName>
                  <DownloadVersion>
                    Version {versionInfo.version}
                  </DownloadVersion>
                </DownloadInfo>
              </DownloadHeader>
              <DownloadDetails>
                <DownloadDescription>
                  {os === "macos"
                    ? "Universal installer for macOS with standalone app and plugins (AU, VST3) for both Apple Silicon and Intel processors."
                    : "Complete installer for Windows 10/11 including standalone app and plugin formats (VST3)."}
                </DownloadDescription>
                <DownloadMeta>
                  <DownloadSize>
                    {os === "macos"
                      ? fileInfo.macos.size
                      : fileInfo.windows.size}
                  </DownloadSize>
                  <DownloadDate>
                    Updated:{" "}
                    {os === "macos"
                      ? fileInfo.macos.lastModified
                      : fileInfo.windows.lastModified}
                  </DownloadDate>
                </DownloadMeta>
                <DownloadButtonStyled
                  href={
                    os === "macos"
                        ? "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/builds//NNAudio_Installer.pkg"
                      : "https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/builds//NNAudio_Installer.exe"
                  }
                >
                  <FaDownload /> Download for{" "}
                  {os === "macos" ? "macOS" : "Windows"}
                </DownloadButtonStyled>
              </DownloadDetails>
            </DownloadItem>
            <InstructionsContainer>
              <InstructionStep>
                <InstructionTitle>
                  <InstructionStepNumber>
                    <FaCog />
                  </InstructionStepNumber>
                  Installation Instructions
                </InstructionTitle>
                <InstructionContent>
                  <ol>
                    <li>Run the downloaded installer</li>
                    <li>Follow the installation wizard</li>
                    <li>
                      {os === "macos"
                        ? "The installer will place NNAudio in your Applications folder and plugins in /Library/Audio/Plug-Ins/"
                        : "The installer will place NNAudio in C:\\Program Files\\NNAudio\\ and plugins in C:\\Program Files\\Common Files\\VST3\\"}
                    </li>
                    <li>
                      Once complete, click Next to configure your workflow!
                    </li>
                  </ol>
                </InstructionContent>
              </InstructionStep>
            </InstructionsContainer>
          </>
        );

      case 3:
        return (
          <>
            <StepTitle>Choose Installation Type</StepTitle>
            <StepDescription>
              How do you want to use NNAudio?
            </StepDescription>
            <OptionsGrid>
              <OptionCard
                $selected={installationType === "plugin"}
                onClick={() => setInstallationType("plugin")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <OptionIcon>
                  <FaPlug />
                </OptionIcon>
                <OptionName>Plugin</OptionName>
                <OptionDescription>
                  Use NNAudio as a plugin in your DAW
                </OptionDescription>
              </OptionCard>
              <OptionCard
                $selected={installationType === "standalone"}
                onClick={() => setInstallationType("standalone")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <OptionIcon>
                  <FaDesktop />
                </OptionIcon>
                <OptionName>Standalone</OptionName>
                <OptionDescription>
                  Run NNAudio as a separate application
                </OptionDescription>
              </OptionCard>
            </OptionsGrid>
          </>
        );

      case 4:
        return (
          <>
            <StepTitle>Select Your DAW</StepTitle>
            <StepDescription>
              Choose your digital audio workstation for specific setup
              instructions.
            </StepDescription>
            <DAWGrid>
              {[
                {
                  id: "logic",
                  name: "Logic Pro",
                  os: "macos",
                  comingSoon: false,
                },
                {
                  id: "ableton",
                  name: "Ableton Live",
                  os: "both",
                  comingSoon: false,
                },
                {
                  id: "flstudio",
                  name: "FL Studio",
                  os: "both",
                  comingSoon: true,
                },
                {
                  id: "protools",
                  name: "Pro Tools",
                  os: "both",
                  comingSoon: true,
                },
                { id: "cubase", name: "Cubase", os: "both", comingSoon: true },
                { id: "reaper", name: "Reaper", os: "both", comingSoon: true },
                {
                  id: "studioone",
                  name: "Studio One",
                  os: "both",
                  comingSoon: false,
                },
                { id: "other", name: "Other", os: "both", comingSoon: true },
              ].map((dawOption) => {
                const isDisabled =
                  dawOption.comingSoon ||
                  (dawOption.os === "macos" && os === "windows");
                return (
                  <DAWCard
                    key={dawOption.id}
                    $selected={daw === dawOption.id}
                    $disabled={isDisabled}
                    onClick={() => !isDisabled && setDAW(dawOption.id as DAW)}
                    whileHover={{ scale: isDisabled ? 1 : 1.05 }}
                    whileTap={{ scale: isDisabled ? 1 : 0.95 }}
                  >
                    {dawOption.comingSoon && (
                      <ComingSoonBadge>Coming Soon</ComingSoonBadge>
                    )}
                    <DAWName>{dawOption.name}</DAWName>
                  </DAWCard>
                );
              })}
            </DAWGrid>
          </>
        );

      case 5:
        const instructions = getInstructions(os, installationType, daw);
        return (
          <>
            <StepTitle>Setup Instructions</StepTitle>
            <StepDescription>
              Follow these steps to get NNAudio working with your setup.
            </StepDescription>
            <InstructionsContainer>
              {instructions.map((instruction, index) => (
                <InstructionStep key={index}>
                  <InstructionTitle>
                    <InstructionStepNumber>{index + 1}</InstructionStepNumber>
                    {instruction.title}
                  </InstructionTitle>
                  <InstructionContent>
                    <ol>
                      {instruction.steps.map((step, stepIndex) => (
                        <li
                          key={stepIndex}
                          dangerouslySetInnerHTML={{ __html: step }}
                        />
                      ))}
                    </ol>
                  </InstructionContent>
                </InstructionStep>
              ))}
            </InstructionsContainer>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <WizardContainer>
      <WizardHeader>
        <WizardTitle>Getting Started</WizardTitle>
        <WizardSubtitle>
          Let's get NNAudio set up for your specific setup
        </WizardSubtitle>
      </WizardHeader>

      <StepIndicator>
        {[1, 2, 3, 4, 5].map((step) => (
          <React.Fragment key={step}>
            <StepDot
              $active={currentStep === step}
              $completed={currentStep > step}
            >
              {currentStep > step ? <FaCheckCircle /> : step}
            </StepDot>
            {step < totalSteps && <StepLine $completed={currentStep > step} />}
          </React.Fragment>
        ))}
      </StepIndicator>

      <AnimatePresence mode="wait">
        <StepContent
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === totalSteps &&
          getInstructions(os, installationType, daw).length > 0 ? (
            <>
              {renderStepContent()}
              <NavigationButtons>
                <NavButton onClick={handleBack}>
                  <FaArrowLeft /> Back
                </NavButton>
                <NavButton
                  $primary
                  onClick={() => {
                    setCurrentStep(1);
                    setOS(null);
                    setInstallationType(null);
                    setDAW(null);
                  }}
                >
                  Start Over <FaPlay />
                </NavButton>
              </NavigationButtons>
            </>
          ) : (
            <>
              {renderStepContent()}
              <NavigationButtons>
                <NavButton onClick={handleBack} $disabled={currentStep === 1}>
                  <FaArrowLeft /> Back
                </NavButton>
                <NavButton
                  $primary
                  onClick={handleNext}
                  $disabled={!canProceed() || currentStep === totalSteps}
                >
                  {currentStep === totalSteps - 1
                    ? "View Instructions"
                    : "Next"}{" "}
                  <FaArrowRight />
                </NavButton>
              </NavigationButtons>
            </>
          )}
        </StepContent>
      </AnimatePresence>
    </WizardContainer>
  );
}
