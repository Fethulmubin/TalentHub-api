import fs from "fs";
import logger from "../../shared/logger/logger";

export async function parsePdf(filePath: string): Promise<string> {
  try {
    const pdf = await import("pdf-parse");
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf.default(dataBuffer);
    const text = data.text || "";
    logger.info("PDF parsed", { filePath, pages: data.numpages, chars: text.length });
    return text;
  } catch (err) {
    logger.error("PDF parse failed", { filePath, error: (err as Error).message });
    throw new Error(`Failed to parse PDF: ${(err as Error).message}`);
  }
}
