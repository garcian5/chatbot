import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildContextBlock, readContextDocuments } from "../src/services/contextSource.js";

test("reads supported context files in sorted order", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "chatbot-context-"));
  await fs.writeFile(path.join(dir, "b.txt"), "Second");
  await fs.writeFile(path.join(dir, "a.md"), "First");
  await fs.writeFile(path.join(dir, "ignore.png"), "Nope");

  const documents = await readContextDocuments(dir);

  assert.deepEqual(
    documents.map((document) => document.name),
    ["a.md", "b.txt"]
  );
});

test("builds a readable context block", () => {
  const block = buildContextBlock([{ name: "facts.md", content: "The sky is blue." }]);

  assert.equal(block, "# facts.md\nThe sky is blue.");
});
