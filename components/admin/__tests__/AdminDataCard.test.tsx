/**
 * @fileoverview Tests for admin mobile data-card click and a11y behavior.
 * @module components/admin/__tests__/AdminDataCard.test
 */

/// <reference types="vitest/globals" />
// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AdminDataCard,
  AdminDataCardActions,
  AdminDataCardHeader,
} from "../AdminDataCard";

describe("AdminDataCard", () => {
  it("does not expose a clickable card as role=button", () => {
    render(
      <AdminDataCard onClick={() => undefined}>
        <AdminDataCardHeader title="Jane Doe" />
        <AdminDataCardActions>
          <button type="button">View</button>
        </AdminDataCardActions>
      </AdminDataCard>
    );

    expect(screen.queryByRole("button", { name: /jane doe/i })).toBeNull();
    expect(screen.getByRole("button", { name: "View" })).toBeTruthy();
  });

  it("fires onClick when the card body is clicked", () => {
    const onClick = vi.fn();

    render(
      <AdminDataCard onClick={onClick}>
        <AdminDataCardHeader title="Jane Doe" />
      </AdminDataCard>
    );

    fireEvent.click(screen.getByText("Jane Doe"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire card onClick when an action button is clicked", () => {
    const onClick = vi.fn();

    render(
      <AdminDataCard onClick={onClick}>
        <AdminDataCardHeader title="Jane Doe" />
        <AdminDataCardActions>
          <button type="button">View</button>
        </AdminDataCardActions>
      </AdminDataCard>
    );

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
