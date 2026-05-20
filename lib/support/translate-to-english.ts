/**
 * @fileoverview Support ticket translation: detect language, translate to English, or translate replies to the customer’s language.
 * @module lib/support/translate-to-english
 */

import OpenAI from "openai";

/** Result of language detection across customer messages. */
export type DetectCustomerLanguageResult = {
  /** ISO 639-1 language code (e.g. `en`, `de`, `ja`). */
  detectedLanguage: string;
  /** Human-readable language name in English. */
  detectedLanguageName: string;
  /** True when the customer appears to be writing in English. */
  isEnglish: boolean;
};

/** Result of language detection and optional translation to English. */
export type TranslateToEnglishResult = {
  /** ISO 639-1 language code (e.g. `en`, `de`, `ja`). */
  detectedLanguage: string;
  /** Human-readable language name in English. */
  detectedLanguageName: string;
  /** True when the source text is already English (no translation applied). */
  isEnglish: boolean;
  /** English text — original when already English, otherwise the translation. */
  translatedText: string;
};

/** Result of translating admin reply text into the customer’s language. */
export type TranslateToLanguageResult = {
  /** ISO 639-1 target language code. */
  targetLanguage: string;
  /** Human-readable target language name in English. */
  targetLanguageName: string;
  /** Translated text in the target language. */
  translatedText: string;
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * @brief Detects the language of `text` and returns an English version when needed.
 * @param text - Raw support ticket message or subject text.
 * @returns Detection metadata and English text.
 * @throws When OpenAI is not configured or the API call fails.
 * @note Uses `gpt-4o-mini` with JSON output for reliable parsing.
 * @example
 * ```ts
 * const result = await translateToEnglish("Bonjour, j'ai un problème");
 * // result.detectedLanguage === "fr"
 * // result.translatedText === "Hello, I have a problem"
 * ```
 */
export async function translateToEnglish(
  text: string,
): Promise<TranslateToEnglishResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      detectedLanguage: "en",
      detectedLanguageName: "English",
      isEnglish: true,
      translatedText: "",
    };
  }

  if (!openai) {
    throw new Error("OpenAI API key is not configured");
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You help support agents read customer messages. Given user text:
1. Detect the primary language (ISO 639-1 code and English name).
2. If the text is already English (including informal English), set isEnglish to true and set translatedText to the original text unchanged.
3. Otherwise set isEnglish to false and set translatedText to a faithful English translation. Preserve tone, line breaks, and technical terms (DAW names, plugin formats, etc.).

Respond with JSON only:
{
  "detectedLanguage": "de",
  "detectedLanguageName": "German",
  "isEnglish": false,
  "translatedText": "..."
}`,
      },
      {
        role: "user",
        content: trimmed,
      },
    ],
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty response from translation service");
  }

  let parsed: {
    detectedLanguage?: string;
    detectedLanguageName?: string;
    isEnglish?: boolean;
    translatedText?: string;
  };

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid response from translation service");
  }

  const detectedLanguage = (parsed.detectedLanguage || "unknown").toLowerCase();
  const detectedLanguageName =
    parsed.detectedLanguageName?.trim() || detectedLanguage;
  const isEnglish =
    parsed.isEnglish === true || detectedLanguage === "en";
  const translatedText =
    typeof parsed.translatedText === "string" && parsed.translatedText.trim()
      ? parsed.translatedText.trim()
      : trimmed;

  return {
    detectedLanguage,
    detectedLanguageName,
    isEnglish,
    translatedText,
  };
}

/**
 * @brief Infers the customer’s primary language from their ticket messages.
 * @param texts - Non-admin message bodies (and optionally subject/description).
 * @returns Detected language metadata.
 * @throws When OpenAI is not configured or the API call fails.
 */
export async function detectCustomerLanguage(
  texts: string[],
): Promise<DetectCustomerLanguageResult> {
  const samples = texts.map((t) => t.trim()).filter(Boolean).slice(0, 12);
  if (samples.length === 0) {
    return {
      detectedLanguage: "en",
      detectedLanguageName: "English",
      isEnglish: true,
    };
  }

  if (!openai) {
    throw new Error("OpenAI API key is not configured");
  }

  const combined = samples
    .map((text, i) => `--- Message ${i + 1} ---\n${text}`)
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You analyze customer support messages to determine what language the customer primarily writes in.

Given multiple messages from the same customer, return the primary language they use for support (ISO 639-1 code and English name).
- If they write mostly in English (including informal English), set isEnglish to true.
- If they mix languages, pick the non-English language they use most for substantive content.
- Ignore signatures, product names, and DAW/plugin terms.

Respond with JSON only:
{
  "detectedLanguage": "de",
  "detectedLanguageName": "German",
  "isEnglish": false
}`,
      },
      {
        role: "user",
        content: combined,
      },
    ],
    max_tokens: 256,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty response from language detection");
  }

  let parsed: {
    detectedLanguage?: string;
    detectedLanguageName?: string;
    isEnglish?: boolean;
  };

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid response from language detection");
  }

  const detectedLanguage = (parsed.detectedLanguage || "unknown").toLowerCase();
  const detectedLanguageName =
    parsed.detectedLanguageName?.trim() || detectedLanguage;
  const isEnglish =
    parsed.isEnglish === true || detectedLanguage === "en";

  return {
    detectedLanguage,
    detectedLanguageName,
    isEnglish,
  };
}

/**
 * @brief Translates support reply text into the customer’s language.
 * @param text - Admin draft reply (usually English).
 * @param targetLanguage - ISO 639-1 target code.
 * @param targetLanguageName - Human-readable target language name.
 * @returns Translated reply text.
 * @throws When OpenAI is not configured or the API call fails.
 */
export async function translateToLanguage(
  text: string,
  targetLanguage: string,
  targetLanguageName: string,
): Promise<TranslateToLanguageResult> {
  const trimmed = text.trim();
  const lang = targetLanguage.toLowerCase().trim();
  const langName = targetLanguageName.trim() || lang;

  if (!trimmed) {
    return {
      targetLanguage: lang,
      targetLanguageName: langName,
      translatedText: "",
    };
  }

  if (!openai) {
    throw new Error("OpenAI API key is not configured");
  }

  if (lang === "en") {
    return {
      targetLanguage: "en",
      targetLanguageName: "English",
      translatedText: trimmed,
    };
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You help support agents reply to customers in their language.

Translate the support agent's reply into ${langName} (ISO 639-1: ${lang}).
- Preserve tone: professional, friendly, and helpful.
- Keep line breaks, lists, and formatting.
- Leave product names, DAW names, file paths, URLs, and email addresses unchanged.
- Do not add explanations — only output the translated reply.

Respond with JSON only:
{
  "translatedText": "..."
}`,
      },
      {
        role: "user",
        content: trimmed,
      },
    ],
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty response from translation service");
  }

  let parsed: { translatedText?: string };

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid response from translation service");
  }

  const translatedText =
    typeof parsed.translatedText === "string" && parsed.translatedText.trim()
      ? parsed.translatedText.trim()
      : trimmed;

  return {
    targetLanguage: lang,
    targetLanguageName: langName,
    translatedText,
  };
}

/**
 * @brief Whether the OpenAI client is available for translation.
 * @returns True when `OPENAI_API_KEY` is set.
 */
export function isTranslateToEnglishAvailable(): boolean {
  return openai !== null;
}
