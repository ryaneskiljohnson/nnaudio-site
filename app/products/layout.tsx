import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products | NNAudio",
  description:
    "Browse NNAudio plugins, sample packs, MIDI, and free tools for music producers.",
  openGraph: {
    title: "Products | NNAudio",
    description:
      "Browse NNAudio plugins, sample packs, MIDI, and free tools for music producers.",
    type: "website",
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
