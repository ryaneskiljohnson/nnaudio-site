/**
 * @fileoverview Tests for the admin desktop/mobile list switch.
 * @module components/admin/__tests__/AdminResponsiveList.test
 */

/// <reference types="vitest/globals" />
// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AdminResponsiveList from "../AdminResponsiveList";

/**
 * @brief Installs a `matchMedia` stub for the given viewport.
 * @param matches Whether `(max-width: 768px)` should match.
 * @returns void
 */
function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminResponsiveList", () => {
  it("unmounts the desktop slot after a mobile breakpoint is known", async () => {
    mockMatchMedia(true);

    render(
      <AdminResponsiveList
        desktop={<div>Desktop table</div>}
        mobile={<div>Mobile cards</div>}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Mobile cards")).toBeTruthy();
      expect(screen.queryByText("Desktop table")).toBeNull();
    });
  });

  it("unmounts the mobile slot after a desktop breakpoint is known", async () => {
    mockMatchMedia(false);

    render(
      <AdminResponsiveList
        desktop={<div>Desktop table</div>}
        mobile={<div>Mobile cards</div>}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Desktop table")).toBeTruthy();
      expect(screen.queryByText("Mobile cards")).toBeNull();
    });
  });
});
