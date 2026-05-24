import fs from "node:fs/promises";
import path from "node:path";
import type { ContextDocument } from "../types.js";

const SUPPORTED_EXTENSIONS = new Set([".md", ".txt", ".json"]);
const MAX_FILE_BYTES = 256_000;
const MAX_TOTAL_BYTES = 1_000_000;

export async function readContextDocuments(contextDir: string): Promise<ContextDocument[]> {
  try {
    const entries = await fs.readdir(contextDir, { withFileTypes: true });
    const documents: ContextDocument[] = [];
    let totalBytes = 0;

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(extension)) {
        continue;
      }

      const filePath = path.join(contextDir, entry.name);
      const stats = await fs.stat(filePath);
      if (stats.size > MAX_FILE_BYTES || totalBytes + stats.size > MAX_TOTAL_BYTES) {
        continue;
      }

      const content = await fs.readFile(filePath, "utf8");
      documents.push({ name: entry.name, content });
      totalBytes += stats.size;
    }

    return documents.sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      await fs.mkdir(contextDir, { recursive: true });
      return [];
    }

    throw error;
  }
}

export function buildContextBlock(documents: ContextDocument[]): string {
  if (documents.length === 0) {
    return "No local context files were found.";
  }

  return documents
    .map((document) => `# ${document.name}\n${document.content.trim()}`)
    .join("\n\n---\n\n");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
