/**
 * @fileoverview Public contact/support page with form that sends emails to admin.
 * @module app/contact/page
 */

import { Metadata } from "next";
import ContactSection from "@/components/sections/ContactSection";

export const metadata: Metadata = {
  title: "Contact | NNAud.io",
  description:
    "Get support or send feedback. We'll get back to you as soon as possible.",
};

/**
 * @brief Renders the public contact page (support form).
 * Submissions go to /api/contact and are emailed to admin (support@nnaud.io).
 */
export default function ContactPage() {
  return <ContactSection />;
}
