/**
 * @fileoverview Default FAQ Q&A used when i18n bundle is missing or lacks faq.questions (client-safe).
 * @module lib/faq-default-questions
 * @note Keep in sync with public/locales/en.json → faq.questions for English parity.
 */

export interface FaqQaItem {
  question: string;
  answer: string;
}

/** @brief Canonical English FAQ entries for NNAudio homepage/support. */
export const FAQ_DEFAULT_QUESTIONS: FaqQaItem[] = [
  {
    question: "What is NNAudio Access and how do I use it?",
    answer:
      'NNAudio Access is our free desktop app that lists everything you own, lets you download installers, and install or update plugins and packs in one place. Get it from the <a href="/product/nnaudio-access" target="_self" rel="noopener noreferrer">NNAudio Access product page</a> (free), install for macOS or Windows, then log in with your nnaud.io account. You can also download installers from <a href="/dashboard" target="_self" rel="noopener noreferrer">My Products</a> on the website if you prefer.',
  },
  {
    question: "Where do I see my products and how do updates work?",
    answer:
      'Log in and go to <a href="/dashboard" target="_self" rel="noopener noreferrer">Dashboard</a> → <strong>My Products</strong> to see all products linked to your account; the same list appears in NNAudio Access. The app shows when updates are available—download and run the latest installers when you\'re ready. We don\'t charge for updates; if you own a product, you get current and future versions.',
  },
  {
    question:
      "I purchased products before the new site and don't see them in my account. What should I do?",
    answer:
      'If you bought before we launched this website, your order may not be linked yet. <a href="/login" target="_self" rel="noopener noreferrer">Log in</a>, then go to <a href="/support" target="_self" rel="noopener noreferrer">Support</a> and create a ticket with the email you used when you purchased and any order or receipt details. We\'ll attach your past purchases to your account so they appear under My Products and in NNAudio Access.',
  },
  {
    question: "What's the difference between subscriptions and one-time purchases?",
    answer:
      '<strong>One-time purchases</strong> (including lifetime): Pay once, keep the product forever with current and future updates. Most plugins, packs, and many <a href="/bundles" target="_self" rel="noopener noreferrer">bundles</a> are sold this way.<br><br><strong>Subscriptions</strong> (monthly or annual): Recurring access while active; if you cancel, access ends when the period ends. Some bundles offer both lifetime and subscription options—check the product or bundle page.',
  },
  {
    question: "What formats and platforms are supported?",
    answer:
      "Plugins are typically AU and VST3 for major DAWs (Logic, Ableton, FL Studio, Cubase, Studio One, Reaper, Bitwig, etc.). Sample packs and MIDI are downloadable content. NNAudio Access runs on macOS and Windows. Check each product page for details.",
  },
  {
    question: "How do I get help or report a problem?",
    answer:
      'Log in, go to <a href="/support" target="_self" rel="noopener noreferrer">Support</a>, and create a ticket with your issue. You can also email support@nnaud.io.',
  },
];
