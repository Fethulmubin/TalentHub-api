import redis from "../database/redis";
import logger from "../logger/logger";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const TTL = 60 * 60 * 4;

function key(sessionId: string): string {
  return `interview:conversation:${sessionId}`;
}

export async function getHistory(sessionId: string): Promise<ChatMessage[]> {
  try {
    const raw = await redis.get(key(sessionId));
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch (err) {
    logger.warn("Failed to load conversation history", {
      sessionId,
      error: err instanceof Error ? err.message : err,
    });
    return [];
  }
}

export async function addMessage(
  sessionId: string,
  role: ChatMessage["role"],
  content: string
): Promise<void> {
  try {
    const history = await getHistory(sessionId);
    history.push({ role, content });
    await redis.setex(key(sessionId), TTL, JSON.stringify(history));
  } catch (err) {
    logger.warn("Failed to save conversation message", {
      sessionId,
      error: err instanceof Error ? err.message : err,
    });
  }
}

export async function clearHistory(sessionId: string): Promise<void> {
  try {
    await redis.del(key(sessionId));
  } catch (err) {
    logger.warn("Failed to clear conversation history", {
      sessionId,
      error: err instanceof Error ? err.message : err,
    });
  }
}
