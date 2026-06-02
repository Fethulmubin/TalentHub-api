import logger from "../../shared/logger/logger";

const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

const FREE_MODELS = [
  "openrouter/free",
  "openai/gpt-oss-20b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
];

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || FREE_MODELS[0];

export interface ChatMessage {
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

interface JobContext {
  title: string;
  description: string;
  skills: string;
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY not configured. Get a free key at https://openrouter.ai/keys");
  }
  return key;
}

async function tryModel(
  messages: ChatMessage[],
  model: string,
  temperature: number,
  maxTokens: number
): Promise<{ content: string; usedModel: string } | null> {
  const apiKey = getApiKey();
  try {
    const res = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://talent-hub.app",
        "X-Title": "TalentHub Interview AI",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (res.status === 429) {
      logger.warn("OpenRouter model rate-limited", { model });
      return null;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      logger.error("OpenRouter API error", { model, status: res.status, error: errText });
      return null;
    }

    const data = (await res.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content || "";
    return { content, usedModel: model };
  } catch {
    return null;
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<string> {
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 512;

  const modelChain = options?.model
    ? [options.model, ...FREE_MODELS.filter((m) => m !== options.model)]
    : FREE_MODELS;

  for (const model of modelChain) {
    const result = await tryModel(messages, model, temperature, maxTokens);
    if (result) {
      if (model !== modelChain[0]) {
        logger.info("OpenRouter fell back to alternate model", { model });
      }
      return result.content;
    }
  }

  throw new Error("All OpenRouter free models are rate-limited. Try again later or add your own API key at https://openrouter.ai/settings/integrations");
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
  context?: {
    phase?: string;
    codingPrompt?: string;
    code?: string;
    jobContext?: JobContext;
    conversationHistory?: ChatMessage[];
  }
): Promise<string> {
  const systemMessage = buildSystemContext(context);
  const messages: ChatMessage[] = [
    { role: "system", content: systemMessage },
    ...(context?.conversationHistory || []),
    { role: "user", content: question },
  ];

  return chatCompletion(messages, { temperature: 0.7, maxTokens: 400 });
}

function buildSystemContext(context?: {
  phase?: string;
  codingPrompt?: string;
  code?: string;
  jobContext?: JobContext;
}): string {
  let base = `You are an AI interview assistant for a technical job interview at TalentHub. Your role is to:
- Answer questions about the interview process
- Provide hints and guidance (but NOT the full solution) for coding challenges
- Explain technical concepts when asked
- Be helpful, concise, and professional

Current interview phase: ${context?.phase || "unknown"}`;

  if (context?.jobContext) {
    const { title, description, skills } = context.jobContext;
    base += `\n\nThis interview is for the position: "${title}"`;
    if (description) {
      base += `\nJob description: ${description.slice(0, 2000)}`;
    }
    if (skills) {
      base += `\nRequired skills: ${skills}`;
    }
    base += `\n\nIMPORTANT: Tailor your responses to this specific job role. Ask follow-up questions and provide examples relevant to ${title} and the required skills.`;
  }

  if (context?.codingPrompt) {
    base += `\n\nThe current coding challenge is: "${context.codingPrompt}"`;
  }

  base += `\n\nIMPORTANT: Do not write the complete solution for the candidate. Give hints, explain concepts, and guide them. Keep responses under 200 words.`;

  return base;
}

export async function generateOralQuestions(
  count: number,
  jobContext?: JobContext
): Promise<string[]> {
  let systemPrompt = `You are a technical interviewer creating oral interview questions.`;
  if (jobContext) {
    systemPrompt += `\n\nThe job is: "${jobContext.title}"`;
    if (jobContext.description) {
      systemPrompt += `\nDescription: ${jobContext.description.slice(0, 1500)}`;
    }
    if (jobContext.skills) {
      systemPrompt += `\nRequired skills: ${jobContext.skills}`;
    }
    systemPrompt += `\n\nGenerate questions that are SPECIFIC to this job role and its required skills. Avoid generic questions.`;
  } else {
    systemPrompt += `\n\nGenerate general technical interview questions.`;
  }

  systemPrompt += `\n\nReturn exactly ${count} questions as a JSON array of strings. Example: ["Question 1?", "Question 2?", "Question 3?"]. Only output the JSON array, nothing else.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Generate ${count} technical interview questions${jobContext ? ` for a ${jobContext.title} position` : ""}.` },
  ];

  try {
    const raw = await chatCompletion(messages, { temperature: 0.8, maxTokens: 1000 });
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const questions = JSON.parse(cleaned);
    if (Array.isArray(questions) && questions.length > 0) {
      return questions.slice(0, count);
    }
  } catch (err) {
    logger.warn("Failed to generate AI oral questions, falling back", { error: err instanceof Error ? err.message : err });
  }

  return [];
}

export async function generateCodingChallenge(jobContext?: JobContext): Promise<{
  prompt: string;
  starterCode: string;
  testCases: { input: string; expected: string }[];
} | null> {
  let systemPrompt = `You are a technical interviewer creating a coding challenge for a job interview.`;
  if (jobContext) {
    systemPrompt += `\n\nThe job is: "${jobContext.title}"`;
    if (jobContext.description) {
      systemPrompt += `\nDescription: ${jobContext.description.slice(0, 1500)}`;
    }
    if (jobContext.skills) {
      systemPrompt += `\nRequired skills: ${jobContext.skills}`;
    }
    systemPrompt += `\n\nCreate a coding challenge that tests skills RELEVANT to this specific job role.`;
  } else {
    systemPrompt += `\n\nCreate a general coding challenge.`;
  }

  systemPrompt += `
The challenge should be in JavaScript and test algorithmic thinking.

Return ONLY a JSON object with this exact structure:
{
  "prompt": "Write a function called solution that... Include examples.",
  "starterCode": "function solution(...) {\\n  // Your code here\\n}",
  "testCases": [
    { "input": "JSON.stringify(input)", "expected": "expected result as string" }
  ]
}

Rules:
- The function MUST be named "solution" (important for test runner)
- Include 3-5 test cases with various inputs
- test cases input/output must be valid JSON strings
- Output the JSON only, no explanation`

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Create a coding challenge${jobContext ? ` for a ${jobContext.title} position` : ""}.` },
  ];

  try {
    const raw = await chatCompletion(messages, { temperature: 0.8, maxTokens: 1500 });
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const challenge = JSON.parse(cleaned);
    if (challenge && challenge.prompt && challenge.starterCode && Array.isArray(challenge.testCases) && challenge.testCases.length >= 2) {
      return {
        prompt: challenge.prompt.replace(/^"(.*)"$/, "$1"),
        starterCode: challenge.starterCode,
        testCases: challenge.testCases.slice(0, 5).map((tc: any) => ({
          input: typeof tc.input === "string" ? tc.input : JSON.stringify(tc.input),
          expected: typeof tc.expected === "string" ? tc.expected : JSON.stringify(tc.expected),
        })),
      };
    }
  } catch (err) {
    logger.warn("Failed to generate AI coding challenge, falling back", { error: err instanceof Error ? err.message : err });
  }

  return null;
}
