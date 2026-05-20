/**
 * @fileoverview Admin API: detect customer language and translate support ticket text (to/from English).
 * @module app/api/admin/support-tickets/translate/route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkAdmin } from "@/app/actions/user-management";
import {
  detectCustomerLanguage,
  isTranslateToEnglishAvailable,
  translateToEnglish,
  translateToLanguage,
} from "@/lib/support/translate-to-english";

/**
 * @brief POST — detect language or translate support ticket text.
 * @param request - JSON body; see action variants below.
 * @returns JSON result or error.
 *
 * **Detect customer language** — `{ "action": "detect", "texts": string[] }`
 *
 * **200**
 * ```json
 * {
 *   "success": true,
 *   "detectedLanguage": "de",
 *   "detectedLanguageName": "German",
 *   "isEnglish": false
 * }
 * ```
 *
 * **Translate to English** — `{ "text": string }`
 *
 * **Translate reply to customer** — `{ "text": string, "targetLanguage": "de", "targetLanguageName": "German" }`
 *
 * **401** — Not an admin · **503** — OpenAI not configured · **500** — Translation failed
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTranslateToEnglishAvailable()) {
    return NextResponse.json(
      {
        error: "Translation is not available. OpenAI API key is not configured.",
        errorCode: "OPENAI_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let body: {
    action?: unknown;
    text?: unknown;
    texts?: unknown;
    targetLanguage?: unknown;
    targetLanguageName?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action === "detect") {
    const texts = Array.isArray(body.texts)
      ? body.texts.filter((t): t is string => typeof t === "string")
      : [];

    if (texts.length === 0) {
      return NextResponse.json(
        { error: "texts array is required for detect action" },
        { status: 400 },
      );
    }

    const totalLength = texts.reduce((sum, t) => sum + t.length, 0);
    if (totalLength > 24000) {
      return NextResponse.json(
        { error: "Combined texts exceed maximum length" },
        { status: 400 },
      );
    }

    try {
      const result = await detectCustomerLanguage(texts);
      return NextResponse.json({ success: true, ...result });
    } catch (error: unknown) {
      console.error("[Support translate detect]", error);
      const message =
        error instanceof Error ? error.message : "Language detection failed";
      return NextResponse.json(
        { error: message, errorCode: "DETECTION_FAILED" },
        { status: 500 },
      );
    }
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  if (text.length > 12000) {
    return NextResponse.json(
      { error: "text exceeds maximum length (12000 characters)" },
      { status: 400 },
    );
  }

  const targetLanguage =
    typeof body.targetLanguage === "string"
      ? body.targetLanguage.trim().toLowerCase()
      : "";
  const targetLanguageName =
    typeof body.targetLanguageName === "string"
      ? body.targetLanguageName.trim()
      : "";

  try {
    if (targetLanguage && targetLanguage !== "en") {
      const result = await translateToLanguage(
        text,
        targetLanguage,
        targetLanguageName || targetLanguage,
      );
      return NextResponse.json({ success: true, ...result });
    }

    const result = await translateToEnglish(text);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error("[Support translate]", error);
    const message =
      error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json(
      { error: message, errorCode: "TRANSLATION_FAILED" },
      { status: 500 },
    );
  }
}
