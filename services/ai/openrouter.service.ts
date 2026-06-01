import logger from "../../shared/logger/logger";

const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

const DEFAULT_MODEL = "mistralai/mistral-7b-instruct:free";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY not configured. Get a free key at https://openrouter.ai/keys");
  }
  return key;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<string> {
  const apiKey = getApiKey();

  const res = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://talent-hub.app",
      "X-Title": "TalentHub Interview AI",
    },
    body: JSON.stringify({
      model: options?.model || DEFAULT_MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 512,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    logger.error("OpenRouter API error", { status: res.status, error: errText });
    throw new Error(`OpenRouter API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as OpenRouterResponse;
  return data.choices?.[0]?.message?.content || "";
}

export async function getCodeFeedback(code: string, language: string, prompt?: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an expert coding interviewer. Review the candidate's ${language} solution and provide:
1. Brief feedback on their approach (2-3 sentences)
2. One specific improvement suggestion
3. A question about their solution to discuss further

Be encouraging but honest. Keep response under 150 words.`,
    },
    {
      role: "user",
      content: prompt
        ? `The candidate wrote this solution for: "${prompt}"\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``
        : `Review this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``,
    },
  ];

  return chatCompletion(messages, { temperature: 0.5, maxTokens: 300 });
}

export async function answerChatQuestion(
  question: string,
  context?: { phase?: string; codingPrompt?: string; code?: string }
): Promise<string> {
  const systemContext = buildSystemContext(context);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemContext,
    },
    {
      role: "user",
      content: question,
    },
  ];

  return chatCompletion(messages, { temperature: 0.7, maxTokens: 400 });
}

function buildSystemContext(context?: { phase?: string; codingPrompt?: string; code?: string }): string {
  let base = `You are an AI interview assistant for a technical job interview. Your role is to:
- Answer questions about the interview process
- Provide hints and guidance (but NOT the full solution) for coding challenges
- Explain technical concepts when asked
- Be helpful, concise, and professional

Current interview phase: ${context?.phase || "unknown"}`;

  if (context?.codingPrompt) {
    base += `\n\nThe current coding challenge is: "${context.codingPrompt}"`;
  }

  base += `\n\nIMPORTANT: Do not write the complete solution for the candidate. Give hints, explain concepts, and guide them. Keep responses under 200 words.`;

  return base;
}
