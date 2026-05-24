const CHARS_PER_TOKEN = 4;

export function chunkText(
  text: string,
  maxTokens = 700,
  overlapTokens = 100
): string[] {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    const candidate = currentChunk ? `${currentChunk}\n${para}` : para;

    if (candidate.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      const words = currentChunk.split(/\s+/);
      let overlap = "";
      let overlapLen = 0;
      for (let i = words.length - 1; i >= 0; i--) {
        if (overlapLen + words[i].length + 1 > overlapChars) break;
        overlap = `${words[i]} ${overlap}`;
        overlapLen += words[i].length + 1;
      }

      currentChunk = overlap.trim() ? `${overlap.trim()}\n${para}` : para;
    } else {
      currentChunk = candidate;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
