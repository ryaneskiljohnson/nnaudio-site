/**
 * @fileoverview Homepage is three doors at $199, not a Cymasphere lander.
 * @module components/sections/StorefrontHome.test
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

import StorefrontHome from "./StorefrontHome";

describe("StorefrontHome", () => {
  it("is three doors with Cymasphere at $199 and no leftover prices", () => {
    const html = renderToStaticMarkup(<StorefrontHome />);

    expect(html).toContain("Get the free tools");
    expect(html).toContain('href="/free-tools"');
    expect(html).toContain("FreeQ, Freelay, Freeverb, Sterfreeo, Cowboy Harp");
    expect(html).toContain("Cymasphere · $199 one-time");
    expect(html).toContain("Get Cymasphere");
    expect(html).toContain('href="/product/cymasphere"');
    expect(html).toContain("The rest of the shop");
    expect(html).toContain('href="/products"');
    expect(html).toContain("Browse");
    expect(html).toContain("NNAudio Access");
    expect(html).not.toContain("$149");
    expect(html).not.toContain("$499");
    expect(html).not.toContain("line-through");
    expect(html).not.toContain("Unstick the progression");
    expect(html).not.toContain("Loading pricing");
    expect(html).not.toContain("Proof");
  });
});
