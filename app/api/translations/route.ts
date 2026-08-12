import { NextRequest, NextResponse } from "next/server";
import "server-only";

// Import locale JSON so it is bundled into the serverless function.
// `public/**` is excluded from output file tracing (see next.config.js), so
// runtime fs reads of public/locales fail on Vercel with ENOENT.
import de from "@/public/locales/de.json";
import en from "@/public/locales/en.json";
import es from "@/public/locales/es.json";
import fr from "@/public/locales/fr.json";
import it from "@/public/locales/it.json";
import ja from "@/public/locales/ja.json";
import pt from "@/public/locales/pt.json";
import tr from "@/public/locales/tr.json";
import zh from "@/public/locales/zh.json";

export const runtime = "nodejs";

const defaultLanguage = "en";

const localeCatalog: Record<string, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  es: es as Record<string, unknown>,
  fr: fr as Record<string, unknown>,
  it: it as Record<string, unknown>,
  de: de as Record<string, unknown>,
  pt: pt as Record<string, unknown>,
  tr: tr as Record<string, unknown>,
  zh: zh as Record<string, unknown>,
  ja: ja as Record<string, unknown>,
};

const languages = Object.keys(localeCatalog);

const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> => {
  const output: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];
    if (isObject(targetValue) && isObject(sourceValue)) {
      output[key] = deepMerge(targetValue, sourceValue);
    } else {
      output[key] = sourceValue;
    }
  }
  return output;
};

const isObject = (item: unknown): item is Record<string, unknown> =>
  Boolean(item) && typeof item === "object" && !Array.isArray(item);

export async function GET(request: NextRequest) {
  try {
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    };

    const { searchParams } = new URL(request.url);
    let locale = searchParams.get("locale") || defaultLanguage;

    if (!languages.includes(locale)) {
      locale = defaultLanguage;
    }

    const engData = localeCatalog[defaultLanguage];
    if (locale === defaultLanguage) {
      return NextResponse.json(engData, { headers, status: 200 });
    }

    const localeData = localeCatalog[locale] ?? {};
    const mergedData = deepMerge(engData, localeData);
    return NextResponse.json(mergedData, { headers, status: 200 });
  } catch (error) {
    console.error("[translations-api] Error loading translations:", error);
    return NextResponse.json(localeCatalog[defaultLanguage] ?? {}, {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
