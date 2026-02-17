"use client";

/**
 * @fileoverview Searchable dropdown for country and state selection in billing forms.
 * Matches existing checkout/billing input styling; supports optional options (combobox when options empty).
 * @module components/common/SearchableSelect
 */

import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";

export type SelectOption = { value: string; label: string };

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Input = styled.input<{ $open?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  padding-right: 36px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${(p) => (p.$open ? "rgba(78, 205, 196, 0.5)" : "rgba(255, 255, 255, 0.1)")};
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #4ecdc4;
    background: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:disabled {
    background: rgba(255, 255, 255, 0.03);
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const Chevron = styled.span<{ $open?: boolean }>`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%) rotate(${(p) => (p.$open ? "180deg" : "0")});
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
  transition: transform 0.2s ease;
`;

const List = styled.ul`
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  max-height: 220px;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
  background: rgba(20, 20, 30, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 100;
`;

const OptionItem = styled.li<{ $selected?: boolean }>`
  padding: 10px 16px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.95rem;
  background: ${(p) => (p.$selected ? "rgba(78, 205, 196, 0.15)" : "transparent")};

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const EmptyHint = styled.div`
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
`;

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  /** When true, allow typing any value when options are empty or no match (e.g. state for non-US/CA). */
  allowCustomValue?: boolean;
  /** Optional: map current value to display label (e.g. when value is "US", show "United States"). */
  getLabelForValue?: (value: string) => string | undefined;
}

/**
 * Searchable select / combobox. Filters options by input; supports custom value when allowCustomValue and options empty.
 * @param props - value, onChange, options, placeholder, id, required, disabled, allowCustomValue, getLabelForValue
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  id,
  required,
  disabled,
  allowCustomValue = true,
  getLabelForValue,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const displayLabel = value
    ? (getLabelForValue?.(value) ?? options.find((o) => o.value === value)?.label ?? value)
    : "";

  useEffect(() => {
    if (!open) {
      setInputValue(displayLabel);
    }
  }, [open, displayLabel]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setInputValue(displayLabel);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, displayLabel]);

  const search = (inputValue || "").toLowerCase().trim();
  const filtered =
    options.length === 0
      ? []
      : options.filter(
          (o) =>
            o.label.toLowerCase().includes(search) || o.value.toLowerCase().includes(search)
        );

  const handleFocus = () => {
    setOpen(true);
    setInputValue(displayLabel);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    setOpen(true);
    if (allowCustomValue && options.length === 0) {
      onChange(v);
    }
  };

  const handleSelect = (option: SelectOption) => {
    onChange(option.value);
    setInputValue(option.label);
    setOpen(false);
  };

  const handleBlur = () => {
    if (allowCustomValue && options.length === 0) {
      onChange(inputValue.trim());
    } else {
      setInputValue(displayLabel);
    }
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setInputValue(displayLabel);
    }
    if (e.key === "Enter" && open && filtered.length === 1) {
      handleSelect(filtered[0]);
      e.preventDefault();
    }
  };

  return (
    <Wrapper ref={wrapperRef}>
      <Input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={open ? `${id}-list` : undefined}
        id={id}
        value={open ? inputValue : displayLabel}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        $open={open}
        autoComplete="off"
      />
      <Chevron $open={open} aria-hidden>
        ▼
      </Chevron>
      {open && (
        <List id={id ? `${id}-list` : undefined} role="listbox">
          {filtered.length === 0 ? (
            <EmptyHint>
              {options.length === 0 && allowCustomValue
                ? "Type your state or region"
                : "No matches"}
            </EmptyHint>
          ) : (
            filtered.map((option) => (
              <OptionItem
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                $selected={option.value === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(option);
                }}
              >
                {option.label}
              </OptionItem>
            ))
          )}
        </List>
      )}
    </Wrapper>
  );
}
