import type { ParsedDocument, ParsedPage } from "@/types/document";

export async function parsePdf(buffer: ArrayBuffer): Promise<ParsedDocument> {
  // Dynamic import for server-side only
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;

  const pages: ParsedPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Build text with proper spacing
    let lastY: number | null = null;
    const textParts: string[] = [];

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const textItem = item as { str: string; transform: number[] };
      const currentY = textItem.transform[5];

      // Detect line breaks based on Y position change
      if (lastY !== null && Math.abs(currentY - lastY) > 2) {
        textParts.push("\n");
      } else if (textParts.length > 0 && !textParts[textParts.length - 1].endsWith(" ")) {
        textParts.push(" ");
      }

      textParts.push(textItem.str);
      lastY = currentY;
    }

    const text = textParts.join("").trim();

    if (text.length > 0) {
      pages.push({ pageNumber: i, text });
    }
  }

  return {
    pages,
    metadata: {
      filename: "",
      fileType: "pdf",
      pageCount: pdf.numPages,
    },
  };
}

/**
 * Check if a PDF has extractable text or is scan-based
 */
export async function checkPdfTextContent(buffer: ArrayBuffer): Promise<{
  hasText: boolean;
  estimatedTextLength: number;
  pageCount: number;
}> {
  const result = await parsePdf(buffer);
  const totalText = result.pages.reduce((acc, p) => acc + p.text.length, 0);

  return {
    hasText: totalText > 100, // Minimal threshold
    estimatedTextLength: totalText,
    pageCount: result.metadata.pageCount,
  };
}
