/**
 * @fileoverview Generates a branded, single-page PDF with serial code redemption instructions for nnaud.io
 * @module utils/redeemInstructionsPdf
 */

import jsPDF from "jspdf";
import fs from "fs";
import path from "path";

/** Brand colors (match app/globals.css) */
const PRIMARY_RGB = { r: 108, g: 99, b: 255 };
const ACCENT_RGB = { r: 78, g: 205, b: 196 };
const HEADER_BG = { r: 15, g: 14, b: 23 };
const TEXT_DARK = { r: 45, g: 55, b: 72 };
const TEXT_MUTED = { r: 100, g: 116, b: 139 };
const CARD_BG = { r: 248, g: 250, b: 252 };
const BORDER = { r: 226, g: 232, b: 240 };

const REDEEM_URL = "https://nnaud.io/redeem";
const DOWNLOADS_URL = "https://nnaud.io/dashboard/downloads";

/** Logo paths to try (first existing wins) */
const LOGO_PATHS = [
  "public/images/nnaud-io/NNAudio-logo-white.png",
  "public/images/nnaud-io/NNAudio-logo-white.webp",
  "public/images/nnaud-io/nnaudio-logo.png",
  "public/images/nnaud-io/nnaudio-logo.webp",
];

function getPngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  try {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return width > 0 && height > 0 ? { width, height } : null;
  } catch {
    return null;
  }
}

function loadLogoBase64(): { dataUrl: string; width: number; height: number } | null {
  const cwd = process.cwd();
  for (const rel of LOGO_PATHS) {
    const fullPath = path.join(cwd, rel);
    if (!fs.existsSync(fullPath)) continue;
    const ext = path.extname(fullPath).toLowerCase();
    if (ext === ".webp") continue;
    try {
      const buf = fs.readFileSync(fullPath);
      const dims = ext === ".png" ? getPngDimensions(buf) : null;
      const b64 = buf.toString("base64");
      const mime = ext === ".png" ? "PNG" : "JPEG";
      const dataUrl = `data:image/${mime.toLowerCase()};base64,${b64}`;
      if (dims) return { dataUrl, width: dims.width, height: dims.height };
      return { dataUrl, width: 445, height: 283 };
    } catch {
      continue;
    }
  }
  return null;
}

function fitInBox(
  imgW: number,
  imgH: number,
  maxW: number,
  maxH: number
): { width: number; height: number } {
  const scale = Math.min(maxW / imgW, maxH / imgH, 1);
  return { width: imgW * scale, height: imgH * scale };
}

export interface RedeemInstructionsPdfOptions {
  /** Product name (optional, for product-specific handouts) */
  product_name?: string;
}

/**
 * @brief Build a branded, single-page PDF with redemption instructions
 * @param options - Optional product_name
 * @returns PDF as Uint8Array
 */
export function generateRedeemInstructionsPdf(
  options: RedeemInstructionsPdfOptions = {}
): Uint8Array {
  const { product_name } = options;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  doc.setProperties({
    title: "NNAudio – How to Redeem Your Product Code",
    subject: "Serial code redemption instructions",
    author: "NNAudio",
    creator: "nnaud.io",
  });

  let y = 0;

  // —— Header ——
  const headerH = 42;
  doc.setFillColor(HEADER_BG.r, HEADER_BG.g, HEADER_BG.b);
  doc.rect(0, 0, pageWidth, headerH, "F");
  doc.setFillColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
  doc.rect(0, headerH - 5, pageWidth, 5, "F");

  const logoData = loadLogoBase64();
  if (logoData) {
    const maxLogoW = 70;
    const maxLogoH = 20;
    const { width: logoW, height: logoH } = fitInBox(
      logoData.width,
      logoData.height,
      maxLogoW,
      maxLogoH
    );
    try {
      doc.addImage(
        logoData.dataUrl,
        "PNG",
        pageWidth / 2 - logoW / 2,
        8 + (maxLogoH - logoH) / 2,
        logoW,
        logoH
      );
    } catch {
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("NNAudio", pageWidth / 2, 22, { align: "center" });
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("NNAudio", pageWidth / 2, 22, { align: "center" });
  }

  y = headerH + 14;

  // —— H1 ——
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  doc.text("How to Redeem Your Product Code", margin, y);
  y += 10;

  // —— Intro ——
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  const introLines = doc.splitTextToSize(
    "Thank you for your purchase. Follow the steps below to redeem your serial code and add your product to your NNAudio account. You will need an internet connection and a free NNAudio account.",
    contentWidth
  );
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 12;

  // —— Where to find your code ——
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  doc.text("Where to Find Your Serial Code", margin, y);
  y += 6;

  doc.setFillColor(CARD_BG.r, CARD_BG.g, CARD_BG.b);
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, contentWidth, 18, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  const whereLines = doc.splitTextToSize(
    "Your serial code may be in your order confirmation email, on your receipt, printed on product packaging, or provided by your retailer. Codes are alphanumeric and may include hyphens (e.g., ABCD-1234-EFGH).",
    contentWidth - 16
  );
  doc.text(whereLines, margin + 8, y + 7);
  y += 22;

  if (product_name?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
    doc.text(`Product: ${product_name.trim()}`, margin, y + 4);
    y += 10;
  }

  const steps = [
    {
      num: "1",
      title: "Go to the redemption page",
      body: "Visit nnaud.io/redeem in your web browser.",
    },
    {
      num: "2",
      title: "Sign in or create an account",
      body: "Log in with your NNAudio account, or create a free account if you don't have one.",
    },
    {
      num: "3",
      title: "Enter your serial code",
      body: "Type or paste your code into the field.",
    },
    {
      num: "4",
      title: "Click Redeem Code",
      body: "Your product will be added to your account immediately and will appear in your dashboard.",
    },
    {
      num: "5",
      title: "Download NNAudio Access",
      body: "Use NNAudio Access to download and install all your products. Click here to download.",
      bodyLink: { text: "here", url: DOWNLOADS_URL },
    },
  ];

  const stepH = 16;
  for (const step of steps) {
    doc.setFillColor(CARD_BG.r, CARD_BG.g, CARD_BG.b);
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.rect(margin, y, contentWidth, stepH, "FD");
    doc.setFillColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
    doc.circle(margin + 12, y + 9, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(step.num, margin + 12, y + 10, { align: "center" });
    doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(step.title, margin + 24, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const bodyY = y + 13;
    const bodyX = margin + 24;
    const bodyMaxWidth = contentWidth - 32;
    if ("bodyLink" in step && step.bodyLink) {
      const { text: linkText, url } = step.bodyLink as { text: string; url: string };
      const before = step.body.slice(0, step.body.indexOf(linkText)).trimEnd();
      const after = step.body.slice(step.body.indexOf(linkText) + linkText.length);
      doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
      doc.text(before, bodyX, bodyY);
      let x = bodyX + doc.getTextWidth(before);
      doc.text("  ", x, bodyY);
      x += doc.getTextWidth("  ");
      doc.setTextColor(0, 102, 204);
      doc.textWithLink(linkText, x, bodyY, { url });
      x += doc.getTextWidth(linkText);
      doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
      doc.text(after, x, bodyY);
    } else {
      const bodyLines = doc.splitTextToSize(step.body, bodyMaxWidth);
      doc.text(bodyLines, bodyX, bodyY);
    }
    y += stepH + 4;
  }

  // —— Important notes ——
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  doc.text("Important", margin, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(TEXT_MUTED.r, TEXT_MUTED.g, TEXT_MUTED.b);
  const noteBullets = [
    "Serial codes are case-insensitive.",
    "You must be logged in to redeem.",
    "Each code can only be redeemed once.",
    "Keep your code in a safe place until you have redeemed it.",
  ];
  let noteY = y + 11;
  for (const bullet of noteBullets) {
    const wrapped = doc.splitTextToSize(`• ${bullet}`, contentWidth - 8);
    doc.text(wrapped, margin + 4, noteY);
    noteY += wrapped.length * 5;
  }
  y = noteY + 8;

  // —— Footer ——
  const footerH = 18;
  doc.setFillColor(HEADER_BG.r, HEADER_BG.g, HEADER_BG.b);
  doc.rect(0, pageHeight - footerH, pageWidth, footerH, "F");
  doc.setDrawColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
  doc.setLineWidth(0.3);
  doc.line(0, pageHeight - footerH, pageWidth, pageHeight - footerH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const footerY = pageHeight - 7;
  doc.setTextColor(180, 180, 190);
  doc.text("Redeem:", margin, footerY);
  doc.setTextColor(ACCENT_RGB.r, ACCENT_RGB.g, ACCENT_RGB.b);
  doc.textWithLink("nnaud.io/redeem", margin + 22, footerY, { url: REDEEM_URL });
  doc.setTextColor(180, 180, 190);
  doc.text(" | ", margin + 68, footerY);
  doc.text("Downloads:", margin + 80, footerY);
  doc.setTextColor(ACCENT_RGB.r, ACCENT_RGB.g, ACCENT_RGB.b);
  doc.textWithLink("nnaud.io/downloads", margin + 108, footerY, { url: DOWNLOADS_URL });
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("nnaud.io", pageWidth - margin, footerY, { align: "right" });

  const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(arrayBuffer);
}
