/**
 * @fileoverview RAG (retrieve-and-generate) for NNAudio site chat: knowledge base, NEPQ-driven responses, verification.
 * @module lib/rag
 *
 * Loads static knowledge from lib/rag-knowledge (nnaudio-base.md, products-and-bundles.md), embeds and retrieves
 * relevant chunks, then generates responses with an NNAudio-focused NEPQ system prompt.
 */

import { ChatOpenAI } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { readFileSync } from "fs";
import { join } from "path";

const RAG_KNOWLEDGE_PATH = join(process.cwd(), "lib", "rag-knowledge");

/** Build full NNAudio knowledge base from static markdown files (base + products/bundles). */
function loadNNAudioKnowledgeBase(): string {
  let base = "";
  let products = "";
  try {
    base = readFileSync(join(RAG_KNOWLEDGE_PATH, "nnaudio-base.md"), "utf8");
  } catch {
    base = "# NNAudio\n\nnnaud.io is the NNAudio website. Use /support for help, support@nnaud.io.";
  }
  try {
    products = readFileSync(join(RAG_KNOWLEDGE_PATH, "products-and-bundles.md"), "utf8");
  } catch {
    products = "";
  }
  return products ? `${base}\n\n${products}` : base;
}

/**
 * Load the category quick reference from products-and-bundles.md (intro + category list).
 * Prepended to every retrieval so discovery queries ("options", "what do you have") always have product categories and names to recommend.
 */
function loadCategoryQuickReference(): string {
  try {
    const raw = readFileSync(join(RAG_KNOWLEDGE_PATH, "products-and-bundles.md"), "utf8");
    const productBlockStart = raw.indexOf("\n## Product:");
    if (productBlockStart === -1) return "";
    return raw.slice(0, productBlockStart).trim();
  } catch {
    return "";
  }
}

class NNAudioRAG {
  private vectorStore: MemoryVectorStore | null = null;
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0, // Deterministic; reduces fabrication
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async initialize() {
    const knowledgeBase = loadNNAudioKnowledgeBase();
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1200,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.createDocuments([knowledgeBase]);
    this.vectorStore = await MemoryVectorStore.fromDocuments(docs, this.embeddings);
  }

  async retrieveRelevantContext(query: string): Promise<string> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    const results = await this.vectorStore!.similaritySearch(query, 5);
    const retrieved = results.map((doc: Document) => doc.pageContent).join("\n\n");
    const categoryBlock = loadCategoryQuickReference();
    if (categoryBlock) {
      return `${categoryBlock}\n\n---\n\n${retrieved}`;
    }
    return retrieved;
  }

  /** Extract NEPQ state from conversation (implementation on prototype). */
  declare extractNEPQState: (
    conversationHistory: any[],
    query: string
  ) => { needs: string[]; pains: string[]; currentTools: string[]; experienceLevel: string; budget: string; decisionContext: string };

  async generateResponse(query: string, conversationHistory: any[] = []): Promise<string> {
    const context = await this.retrieveRelevantContext(query);
    const nepqState = this.extractNEPQState(conversationHistory, query);

    const systemPrompt = `You are a helpful support and sales assistant for NNAudio (nnaud.io). You help with products, NNAudio Access, downloads, redemption, purchases, subscriptions, and account management. You strictly follow NEPQ.

ANTI-HALLUCINATION (MANDATORY):
- Use ONLY information that appears in the CONTEXT block below. Do not infer, extrapolate, guess, or make up any facts.
- If the user asks for something not in the context (e.g. a specific price, product feature, or step), say "I don't have that information" or "That isn't in my knowledge base" and point them to the relevant page (e.g. /support, /#pricing, /product/[slug], /redeem).
- Do not state prices, product names, or procedures unless they appear in the context. When in doubt, say you don't know and direct to the site or support.
- You may paraphrase or summarize only what is explicitly in the context. Do not add details that are not there.

NEPQ STRATEGY (one step at a time):
- Need: Identify the user's goal (e.g. buy a plugin, redeem a code, get downloads, browse products).
- Economic Buyer: Only if relevant (e.g. team purchase).
- Pain: Uncover what's blocking them (e.g. can't find product, redeem not working, install issues).
- Question: Ask ONE precise question per turn to move forward.

RECOMMENDATIONS AND PRODUCT INTEREST:
- The CONTEXT always includes a "Category quick reference" section listing product names by type (Instrument plugins, Audio FX plugins, Packs, Bundles, etc.). Use it to answer "what options do you have?", "recommend something", "what do you sell?", etc.
- When the user asks for options or recommendations, name the categories and/or specific products from the context (e.g. "We have instrument plugins like Albanju, Apache Flute, Tetrad Guitars; audio FX like Crystal Ball, Freeverb; MIDI packs, and bundles…") and ask what type they're interested in (plugins, packs, bundles) or suggest 1–3 items from the context with links.
- You MAY recommend specific products or bundles that appear in the CONTEXT. Use the exact product/bundle name and link: /product/{slug} or /bundles/{slug} as shown in the context.
- When the user is exploring or asking what NNAudio offers, either (1) list categories and product names from the Category quick reference and ask what type they want, or (2) suggest 1–3 products/bundles from the context with name, short tagline, and link.
- Once they mention a type or style, suggest 1–3 products or bundles from the context that match (name + short tagline/summary from context + link). Only recommend items that appear in the context.
- Do not invent products. If the context has no good match, say so and point them to /plugins, /packs, /bundles, or /products to browse.

CRITICAL RULES:
1) Every factual claim (product name, price, URL, step, feature) MUST come from the context. If it's not in context, do not say it.
2) For emotional or "stuck" messages, be empathetic and direct them to Support (/support) or Downloads (/downloads).
3) Never invent product names, prices, or features. Never describe admin-only areas; direct those to support.
4) Prefer short, clear answers. When relevant, include concrete links only if they appear in context: /downloads, /my-products, /redeem, /support, /billing, /settings, /#pricing, /product/{slug}, /bundles/{slug}.
5) Ask exactly ONE follow-up question when appropriate (e.g. "What type of products are you interested in—plugins, packs, or bundles?").

KNOWN NEPQ STATE (from chat so far):
- Needs: ${nepqState.needs.join(", ") || "unknown"}
- Pains: ${nepqState.pains.join(", ") || "unknown"}
- Current tools: ${nepqState.currentTools.join(", ") || "unknown"}
- Experience level: ${nepqState.experienceLevel || "unknown"}
- Budget: ${nepqState.budget || "unknown"}
- Decision context: ${nepqState.decisionContext || "unknown"}

CONTEXT:
${context}

Instructions for this turn:
- Answer ONLY from the context above. If the answer is not there, say so and point to the site or /support.
- Then ask ONE tailored question if it helps (or end with a clear next step).`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-8).map((msg: any) => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.text,
      })),
      { role: "user", content: query },
    ];

    const response = await this.llm.invoke(messages);
    return response.content as string;
  }

  /**
   * Extract price-like numbers ($X, $X.XX, X dollars) from text for grounding check.
   * @returns Set of normalized number strings (e.g. "99", "6.00") that appear in a price context
   */
  private static extractPriceNumbers(text: string): Set<string> {
    const numbers = new Set<string>();
    const re = new RegExp(
      "\\$?\\s*(\\d+(?:\\.\\d{1,2})?)\\s*(?:dollars?|USD|/month|/year|monthly|yearly)?",
      "gi"
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      numbers.add(m[1]!);
    }
    const simpleDollar = new RegExp("\\$(\\d+(?:\\.\\d{1,2})?)", "g");
    while ((m = simpleDollar.exec(text)) !== null) {
      numbers.add(m[1]!);
    }
    return numbers;
  }

  /**
   * Reject response if it states a specific price that does not appear in context (likely fabrication).
   */
  private static hasUnsupportedPrices(response: string, context: string): boolean {
    const contextPrices = NNAudioRAG.extractPriceNumbers(context);
    const responsePrices = NNAudioRAG.extractPriceNumbers(response);
    if (responsePrices.size === 0) return false;
    for (const p of responsePrices) {
      if (!contextPrices.has(p)) return true;
    }
    return false;
  }

  async verifyResponse(response: string, context: string): Promise<boolean> {
    const lower = response.toLowerCase();

    if (NNAudioRAG.hasUnsupportedPrices(response, context)) {
      return false;
    }

    const keyTerms = [
      "nnaud.io",
      "nnaudio",
      "NNAudio Access",
      "my products",
      "plugins",
      "vst3",
      "au",
      "redeem",
      "dashboard",
      "support",
      "billing",
      "subscription",
      "download",
      "install",
      "product",
      "bundle",
    ];
    const grounded = keyTerms.some((term) => lower.includes(term.toLowerCase()));

    const looksLikeDiscovery =
      response.trim().endsWith("?") ||
      /what|which|how|when|who|why|where/i.test(response.split("\n")[0] || "");

    const honestUnknown =
      lower.includes("i don't know") ||
      lower.includes("i don't have that") ||
      lower.includes("isn't in my knowledge") ||
      lower.includes("that information");

    const isEmpathetic =
      lower.includes("totally get") ||
      lower.includes("understand") ||
      lower.includes("sorry") ||
      lower.includes("help you") ||
      lower.includes("support");

    const denylist = [
      "redemption inside NNAudio Access app",
      "redeem in the app",
      "cymasphere-only",
      "web-based platform",
      "browser-based daw",
      "mobile app only",
      "ios only",
      "android only",
    ];
    const hitsDenylist = denylist.some((term) => lower.includes(term));

    const tooShort = response.trim().length < 20;

    return (grounded || looksLikeDiscovery || honestUnknown || isEmpathetic) && !tooShort && !hitsDenylist;
  }
}

export const nnaudioRAG = new NNAudioRAG();

// --- NEPQ state extractor (NNAudio-focused) ---
(NNAudioRAG as any).prototype.extractNEPQState = function extractNEPQState(
  conversationHistory: any[] = [],
  latestUserMessage: string = ""
) {
  const recent = [...(conversationHistory || [])].slice(-10);
  const texts = recent.map((m) => m?.text || "").concat(latestUserMessage || "");
  const joined = texts.join("\n").toLowerCase();

  const needs: string[] = [];
  const pains: string[] = [];
  const currentTools: string[] = [];
  let experienceLevel: string | null = null;
  let budget: string | null = null;
  let decisionContext: string | null = null;

  if (/plugin|vst|au|instrument|effect/.test(joined)) needs.push("plugins");
  if (/pack|midi|sample|loop|preset/.test(joined)) needs.push("packs or bundles");
  if (/download|install|nnaudio access|access app/.test(joined)) needs.push("downloads / installation");
  if (/redeem|serial|code|license/.test(joined)) needs.push("redemption");
  if (/subscription|monthly|annual|lifetime|purchase|buy/.test(joined)) needs.push("purchase or subscription");
  if (/account|profile|settings|billing|payment/.test(joined)) needs.push("account or billing");
  if (/support|ticket|help|problem/.test(joined)) needs.push("support");

  if (/can't find|don't see|missing|not showing/.test(joined)) pains.push("product or order not visible");
  if (/redeem|serial|code not working|invalid/.test(joined)) pains.push("redemption issue");
  if (/download|install|won't install|error/.test(joined)) pains.push("download or install issue");
  if (/billing|subscription|cancel|payment/.test(joined)) pains.push("billing or subscription");
  if (/delete account|remove account/.test(joined)) pains.push("account deletion");

  if (/ableton|fl studio|logic|reaper|bitwig|pro tools|studio one|cubase|daw/.test(joined)) currentTools.push("DAW mentioned");
  if (/nnaudio access|access app/.test(joined)) currentTools.push("NNAudio Access");

  if (/beginner|new to|just starting|first (plugin|product)/.test(joined)) experienceLevel = "beginner";
  else if (/intermediate|some experience/.test(joined)) experienceLevel = "intermediate";
  else if (/advanced|expert|pro/.test(joined)) experienceLevel = "advanced";

  if (/(budget|price range|too expensive|afford|cost)/.test(joined)) budget = "budget sensitive";
  if (/(manager|boss|team|client|approval)/.test(joined)) decisionContext = "multiple stakeholders";

  return {
    needs: Array.from(new Set(needs)),
    pains: Array.from(new Set(pains)),
    currentTools: Array.from(new Set(currentTools)),
    experienceLevel: experienceLevel || "",
    budget: budget || "",
    decisionContext: decisionContext || "",
  };
};
