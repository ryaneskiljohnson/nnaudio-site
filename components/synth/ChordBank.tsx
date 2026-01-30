import React from "react";
import styled from "styled-components";

interface ChordButtonProps {
  "data-note": string;
}

interface Chord {
  note: string;
  name: string;
  notes?: string[];
}

interface ChordBankProps {
  chordBank: Chord[];
  onChordClick: (
    chordName: string,
    event: React.MouseEvent | React.TouchEvent
  ) => void;
}

// Create a styled button with customizable gradient backgrounds
const ChordButton = styled.div<ChordButtonProps>`
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
  position: relative;
  overflow: hidden;
  color: white;
  font-weight: bold;
  font-size: 1.1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);

  /* Use pad_on.png as background */
  background-image: url("/img/pad_on.webp");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  /* Apply a single color overlay based on note */
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    mix-blend-mode: overlay;
    opacity: 0.95;
    border-radius: 10px;
    pointer-events: none;
    background: ${(props) => {
      // Assign a single color from the gradient spectrum
      const note = props["data-note"]?.charAt(0);

      // Use distinct colors from the teal-purple theme spectrum
      switch (note) {
        case "C":
          return "#6C63FF"; // Purple (start of gradient)
        case "D":
          return "#6159F5"; // Purple-blue
        case "E":
          return "#5A4FEA"; // Blue-purple
        case "F":
          return "#5277D8"; // Blue
        case "G":
          return "#4A97D0"; // Light blue
        case "A":
          return "#47B2CC"; // Blue-teal
        case "B":
          return "#4ECDC4"; // Teal (end of gradient)
        default:
          return "#6C63FF"; // Default purple
      }
    }};
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
    filter: brightness(1.1);
  }

  &:active {
    transform: translateY(1px);
    filter: brightness(0.95);
    background-image: url("/img/pad_on_pressed.webp");
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }
`;

const NumeralText = styled.div`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  margin-bottom: 5px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
`;

const ChordBank: React.FC<ChordBankProps> = ({ chordBank, onChordClick }) => {
  // Handle drag start
  const handleDragStart = (e: React.DragEvent, chord: Chord) => {
    // Pass the chord data as a JSON string
    const chordData = {
      note: chord.note,
      name: chord.name,
    };
    e.dataTransfer.setData("chord", JSON.stringify(chordData));
    e.dataTransfer.effectAllowed = "copy";
  };

  // Return the chord name without translation
  const getChordName = (chord: Chord): string => {
    // Just return the original chord name
    return chord.name;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "10px",
        width: "100%",
        maxWidth: "750px",
        margin: "0 auto",
        padding: "10px 30px 20px 30px",
        overflowX: "auto",
        justifyContent: "center",
        backgroundColor: "transparent",
        borderRadius: "8px",
        boxShadow: "none",
        marginBottom: "5px",
      }}
    >
      {chordBank.map((chord) => (
        <div
          key={chord.note}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <NumeralText>{getChordNumeral(chord.note)}</NumeralText>
          <ChordButton
            data-note={chord.note}
            onMouseDown={(e) => onChordClick(chord.name, e)}
            onTouchStart={(e) => {
              e.preventDefault(); // Prevent default touch behavior
              onChordClick(chord.name, e);
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, chord)}
          >
            {getChordName(chord)}
          </ChordButton>
        </div>
      ))}
    </div>
  );
};

// Helper to get roman numeral for chord position in key
const getChordNumeral = (note: string): string => {
  const numeralMap: Record<string, string> = {
    C: "I",
    D: "II",
    E: "III",
    F: "IV",
    G: "V",
    A: "VI",
    B: "VII",
  };

  return numeralMap[note] || "";
};

export default ChordBank;
