/**
 * @fileoverview Server layout for authenticated app routes. Kept dynamic so
 * dashboard/admin HTML is never CDN-cached as a public marketing page.
 * @module app/(private)/layout
 */

import PrivateGate from "./PrivateGate";

export const dynamic = "force-dynamic";

/**
 * @brief Wraps private routes with the client auth gate.
 * @param children Dashboard or admin page tree.
 * @returns Auth-gated children.
 */
export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PrivateGate>{children}</PrivateGate>;
}
