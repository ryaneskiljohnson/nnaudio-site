import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NNAudio",
  description: "Discover Sound in a New Way",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
} 