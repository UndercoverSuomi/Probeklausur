export type DocumentStatus =
  | "uploaded"
  | "parsing"
  | "chunking"
  | "embedding"
  | "analyzing"
  | "ready"
  | "error";

export interface DocumentMetadata {
  id: string;
  userId: string;
  filename: string;
  fileSize: number;
  storagePath: string;
  pageCount: number | null;
  status: DocumentStatus;
  errorMessage: string | null;
  createdAt: string;
}

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocument {
  pages: ParsedPage[];
  metadata: {
    filename: string;
    fileType: string;
    pageCount: number;
  };
}

export interface DocumentChunkData {
  content: string;
  chunkIndex: number;
  pageStart: number | null;
  pageEnd: number | null;
  sectionTitle: string | null;
  chunkType: string;
  metadata: Record<string, unknown>;
}

export interface DocumentConcept {
  id: string;
  documentId: string;
  name: string;
  description: string | null;
  importanceScore: number;
  pageReferences: number[];
  parentConceptId: string | null;
}
