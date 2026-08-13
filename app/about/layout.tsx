import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | NNAudio",
  description:
    "NNAudio makes plugins, packs, and NNAudio Access for a cleaner modern production workflow.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
