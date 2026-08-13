import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | NNAudio",
  description: "How NNAudio collects, uses, and protects your information.",
  robots: { index: true },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
