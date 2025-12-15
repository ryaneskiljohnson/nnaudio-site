import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import "server-only";

// Force Node.js runtime (not Edge) since we use fs and path APIs
export const runtime = 'nodejs';

// Languages we support - duplicated here to avoid importing from client component
const languages = ["en", "es", "fr", "it", "de", "pt", "tr", "zh", "ja"];
const defaultLanguage = "en";

// Deep merge of objects
const deepMerge = (target: any, source: any) => {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = deepMerge(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
};

const isObject = (item: any) =>
  item && typeof item === "object" && !Array.isArray(item);

// Fallback translations for when file system access fails
const getFallbackTranslations = (locale: string) => {
  const fallbacks: { [key: string]: any } = {
    en: {
      common: {
        loading: "Loading...",
        error: "Error",
        save: "Save",
        cancel: "Cancel",
        edit: "Edit",
        delete: "Delete",
        back: "Back",
        search: "Search",
        add: "Add",
        remove: "Remove"
      },
      subscriber: {
        details: "Subscriber Details",
        information: "Subscriber Information",
        audienceMemberships: "Audience Memberships",
        name: "Name",
        email: "Email",
        status: "Status",
        location: "Location",
        engagement: "Engagement Level",
        active: "Active",
        unsubscribed: "Unsubscribed",
        bounced: "Bounced",
        pending: "Pending",
        high: "High",
        medium: "Medium",
        low: "Low"
      }
    }
  };
  
  return fallbacks[locale] || fallbacks.en;
};

export async function GET(request: NextRequest) {
  try {
    // Add CORS headers for cross-origin requests
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
    };
    
    // Get the locale from the query parameter
    const { searchParams } = new URL(request.url);
    let locale = searchParams.get("locale") || defaultLanguage;

    console.log(`[translations-api] Request for locale: ${locale}`);

    // Validate the locale
    if (!languages.includes(locale)) {
      console.log(
        `[translations-api] Invalid locale requested: ${locale}, falling back to ${defaultLanguage}`
      );
      locale = defaultLanguage;
    }

    // Build the path to the locales directory using process.cwd() as fallback
    // For Vercel/production, use process.cwd() which points to the project root
    // For local dev, this also works correctly
    const localesDir = path.join(
      process.cwd(),
      "public",
      "locales"
    );
    
    console.log(`[translations-api] Locales directory: ${localesDir}`);

    // Try to load English translations as the base (fallback)
    let engData: any = {};
    try {
      const engFilePath = path.join(localesDir, `${defaultLanguage}.json`);
      console.log(`[translations-api] Looking for English translations at: ${engFilePath}`);
      const engFileContents = await fs.readFile(engFilePath, "utf8");
      engData = JSON.parse(engFileContents);

      console.log(
        `[translations-api] Loaded English base translations with ${
          Object.keys(engData).length
        } top-level keys`
      );
    } catch (engError) {
      console.error(`[translations-api] Failed to load English translations:`, engError);
      // Use fallback translations
      engData = getFallbackTranslations(defaultLanguage);
      console.log(`[translations-api] Using fallback English translations`);
    }

    // If locale is English, just return English translations
    if (locale === defaultLanguage) {
      return NextResponse.json(engData, { headers, status: 200 });
    }

    // Otherwise, try to load requested locale and merge with English for fallback
    try {
      const filePath = path.join(localesDir, `${locale}.json`);
      console.log(`[translations-api] Looking for locale file at: ${filePath}`);

      const fileContents = await fs.readFile(filePath, "utf8");
      const localeData = JSON.parse(fileContents);

      console.log(
        `[translations-api] Loaded ${locale} translations with ${
          Object.keys(localeData).length
        } top-level keys`
      );

      // Deep merge with English data, so English is used for missing keys
      const mergedData = deepMerge(engData, localeData);

      console.log(
        `[translations-api] Merged translations for ${locale} (using English fallbacks)`
      );

      return NextResponse.json(mergedData, { headers, status: 200 });
    } catch (localeError) {
      console.error(
        `[translations-api] Error loading locale ${locale}, falling back to English:`,
        localeError
      );
      
      // Try to get fallback translations for the requested locale
      const fallbackData = getFallbackTranslations(locale);
      const mergedData = deepMerge(engData, fallbackData);
      
      console.log(`[translations-api] Using fallback translations for ${locale}`);
      return NextResponse.json(mergedData, { headers, status: 200 });
    }
  } catch (error) {
    console.error("[translations-api] Error loading translations:", error);
    
    // Return basic fallback translations to prevent complete failure
    const fallbackData = getFallbackTranslations(defaultLanguage);
    return NextResponse.json(fallbackData, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
