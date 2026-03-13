import type { ParsedDocument, ParsedPage } from "@/types/document";

export async function parsePdf(buffer: ArrayBuffer): Promise<ParsedDocument> {
  // Use unpdf which works in serverless environments (Vercel)
  const { extractText } = await import("unpdf");

  const result = await extractText(new Uint8Array(buffer));

  const pages: ParsedPage[] = [];

  if (result.text) {
    // unpdf returns full text — split by form feeds or double newlines for page approximation
    const rawPages = result.text.split(/\f/);

    for (let i = 0; i < rawPages.length; i++) {
      const text = rawPages[i].trim();
      if (text.length > 0) {
        pages.push({ pageNumber: i + 1, text });
      }
    }
  }

  return {
    pages,
    metadata: {
      filename: "",
      fileType: "pdf",
      pageCount: result.totalPages ?? pages.length,
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
    hasText: totalText > 100,
    estimatedTextLength: totalText,
    pageCount: result.metadata.pageCount,
  };
}
