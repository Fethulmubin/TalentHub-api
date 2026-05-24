import logger from "../logger/logger";

let pipeline: any = null;

async function getPipeline() {
  if (!pipeline) {
    try {
      const { pipeline: p } = await import("@xenova/transformers");
      pipeline = await p("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      logger.info("Embedding model loaded (Xenova/all-MiniLM-L6-v2)");
    } catch (err) {
      logger.error("Failed to load embedding model", { error: (err as Error).message });
      throw err;
    }
  }
  return pipeline;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await getPipeline();
  const result = await model(text, { pooling: "mean", normalize: true });
  return Array.from(result.data) as number[];
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  return Promise.all(texts.map((t) => generateEmbedding(t)));
}
