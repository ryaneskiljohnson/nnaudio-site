import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | NNAudio",
  description: "Terms that govern use of NNAudio products and nnaud.io.",
};

export default function TermsOfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
