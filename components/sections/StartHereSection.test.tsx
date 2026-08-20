/**
 * @fileoverview Homepage doors stay short: Free, Cymasphere $199, catalog.
 * @module components/sections/StartHereSection.test
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

import StartHereSection from "./StartHereSection";

describe("StartHereSection", () => {
  it("shows three short doors with Cymasphere at $199 one-time", () => {
    const html = renderToStaticMarkup(<StartHereSection />);

    expect(html).toContain("href=\"/free-tools\"");
    expect(html).toContain("href=\"/product/cymasphere\"");
    expect(html).toContain("href=\"/products\"");
    expect(html).toContain("$199 one-time");
    expect(html).not.toContain("$149");
    expect(html).not.toContain("$499");
    expect(html).not.toContain("Unstick the progression");
    expect(html).not.toContain("#free-products");
  });
});
