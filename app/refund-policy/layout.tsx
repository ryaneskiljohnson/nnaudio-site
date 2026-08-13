import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | NNAudio",
  description: "NNAudio refund policy for plugins, packs, and subscriptions.",
};

export default function RefundPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
