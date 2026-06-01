export interface CodingEvalInput {
  testPassRate: number;
  testTotal: number;
  code: string;
  language: string;
}

export interface OralEvalInput {
  transcript: string;
  question: string;
}

export interface CodingEvalScore {
  overall: number;
  testPassRate: number;
  codeQuality: number;
  efficiency: number;
  explanation: string;
}

export interface OralEvalScore {
  overall: number;
  fluency: number;
  accuracy: number;
  relevance: number;
  clarity: number;
  explanation: string;
}

export function evaluateCoding(input: CodingEvalInput): CodingEvalScore {
  const { testPassRate, testTotal, code } = input;

  const tpScore = testTotal > 0 ? (testPassRate / testTotal) * 100 : 0;

  const codeQualityScore = analyzeCodeQuality(code);

  const efficiencyScore = analyzeEfficiency(code);

  const overall = Math.round(tpScore * 0.5 + codeQualityScore * 0.3 + efficiencyScore * 0.2);

  return {
    overall: Math.min(100, overall),
    testPassRate: Math.round(tpScore),
    codeQuality: Math.round(codeQualityScore),
    efficiency: Math.round(efficiencyScore),
    explanation: buildCodingExplanation(tpScore, codeQualityScore, efficiencyScore),
  };
}

export function evaluateOral(input: OralEvalInput): OralEvalScore {
  const { transcript, question } = input;

  const fluency = analyzeFluency(transcript);
  const accuracy = analyzeAccuracy(transcript, question);
  const relevance = analyzeRelevance(transcript, question);
  const clarity = analyzeClarity(transcript);

  const overall = fluency * 0.2 + accuracy * 0.3 + relevance * 0.3 + clarity * 0.2;

  return {
    overall: Math.min(100, Math.round(overall)),
    fluency: Math.round(fluency),
    accuracy: Math.round(accuracy),
    relevance: Math.round(relevance),
    clarity: Math.round(clarity),
    explanation: buildOralExplanation(fluency, accuracy, relevance, clarity),
  };
}

function analyzeCodeQuality(code: string): number {
  let score = 70;
  const lines = code.split("\n").filter((l) => l.trim().length > 0);

  if (lines.some((l) => l.includes("//") || l.includes("/*") || l.includes("*"))) score += 5;
  if (lines.length < 3) score -= 10;
  if (code.includes("function") || code.includes("=>") || code.includes("class")) score += 5;
  if (code.includes("const") || code.includes("let") || code.includes("var")) score += 5;
  if (lines.some((l) => l.trim().startsWith("//") && l.trim().length > 4)) score += 5;

  const indentLevels = new Set(lines.map((l) => l.search(/\S/)));
  if (indentLevels.size > 1) score += 5;

  const totalLines = lines.length;
  if (totalLines > 40) score -= 10;
  else if (totalLines > 20) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function analyzeEfficiency(code: string): number {
  let score = 75;

  const hasNestedLoops = (code.match(/for\s*\(/g) || []).length > 1 && code.includes("{") && code.includes("}");
  if (hasNestedLoops) score -= 15;

  if (code.includes("map") || code.includes("filter") || code.includes("reduce")) score += 10;
  if (code.includes("Set") || code.includes("Map") || code.includes("{}")) score += 5;
  if (code.includes("break") || code.includes("return")) score += 5;
  if ((code.match(/for\s*\(/g) || []).length <= 1) score += 5;

  if (code.includes("O(n") || code.includes("O(1") || code.includes("O(log")) score += 5;

  return Math.max(0, Math.min(100, score));
}

function analyzeFluency(transcript: string): number {
  const words = transcript.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const fillerWords = ["um", "uh", "like", "you know", "sort of", "kind of", "basically", "actually"];
  const fillerCount = fillerWords.reduce((count, fw) => {
    const regex = new RegExp(fw, "gi");
    return count + (transcript.match(regex) || []).length;
  }, 0);

  const wordCount = words.length;
  const fillerRatio = fillerCount / wordCount;

  let score = 80;
  if (fillerRatio > 0.15) score -= 20;
  else if (fillerRatio > 0.1) score -= 10;
  else if (fillerRatio > 0.05) score -= 5;

  if (wordCount < 5) score = Math.min(score, 40);
  else if (wordCount > 50) score += 5;

  return Math.max(0, Math.min(100, score));
}

function analyzeAccuracy(transcript: string, question: string): number {
  const qWords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const tWords = transcript.toLowerCase().split(/\s+/);

  const matchedTerms = qWords.filter((qw) => tWords.some((tw) => tw.includes(qw)));
  const matchRatio = qWords.length > 0 ? matchedTerms.length / qWords.length : 0;

  const technicalKeywords = [
    "function", "variable", "array", "object", "loop", "async", "await",
    "promise", "callback", "event", "component", "state", "hook", "api",
    "database", "server", "client", "algorithm", "data", "structure",
    "class", "method", "property", "interface", "type", "error",
  ];
  const techUsed = technicalKeywords.filter((kw) => transcript.toLowerCase().includes(kw));
  const techBonus = Math.min(techUsed.length * 5, 20);

  let score = matchRatio * 60 + techBonus + 20;

  return Math.max(0, Math.min(100, score));
}

function analyzeRelevance(transcript: string, question: string): number {
  const qTokens = new Set(question.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const tTokens = transcript.toLowerCase().split(/\s+/);

  const intersection = [...qTokens].filter((t) => tTokens.includes(t));
  const jaccard = qTokens.size > 0 ? intersection.length / qTokens.size : 0;

  let score = jaccard * 80 + 20;

  if (transcript.length > question.length * 0.5) score += 5;
  if (transcript.length > question.length * 1.5) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function analyzeClarity(transcript: string): number {
  if (!transcript) return 0;

  const sentences = transcript.split(/[.!?]+/).filter(Boolean);
  const avgWordsPerSentence = sentences.length > 0
    ? transcript.split(/\s+/).length / sentences.length
    : 0;

  let score = 70;

  if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 20) score += 15;
  else if (avgWordsPerSentence > 20) score -= 10;
  else if (avgWordsPerSentence < 5) score -= 15;

  const repeatWords = detectExcessiveRepetition(transcript);
  score -= repeatWords * 5;

  return Math.max(0, Math.min(100, score));
}

function detectExcessiveRepetition(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const freq: Record<string, number> = {};
  let repeats = 0;

  for (const word of words) {
    if (word.length < 3) continue;
    freq[word] = (freq[word] || 0) + 1;
  }

  for (const count of Object.values(freq)) {
    if (count > 3) repeats++;
  }

  return repeats;
}

function buildCodingExplanation(testScore: number, quality: number, efficiency: number): string {
  const parts: string[] = [];
  parts.push(`Test Pass Rate: ${Math.round(testScore)}%`);
  parts.push(`Code Quality: ${Math.round(quality)}%`);
  parts.push(`Efficiency: ${Math.round(efficiency)}%`);

  if (testScore >= 80) parts.push("Strong test performance.");
  else if (testScore >= 50) parts.push("Moderate test coverage; review edge cases.");
  else parts.push("Low test pass rate; verify logic for all test cases.");

  if (quality >= 80) parts.push("Well-structured code with good readability.");
  else if (quality >= 50) parts.push("Acceptable code structure; consider adding comments and consistent formatting.");
  else parts.push("Code quality needs improvement; focus on organization and readability.");

  if (efficiency >= 80) parts.push("Efficient solution with optimal time complexity.");
  else if (efficiency >= 50) parts.push("Reasonable performance; review for potential optimizations.");
  else parts.push("Inefficient approach; consider alternative algorithms.");

  return parts.join(" ");
}

function buildOralExplanation(fluency: number, accuracy: number, relevance: number, clarity: number): string {
  const parts: string[] = [];
  parts.push(`Fluency: ${Math.round(fluency)}%`);
  parts.push(`Accuracy: ${Math.round(accuracy)}%`);
  parts.push(`Relevance: ${Math.round(relevance)}%`);
  parts.push(`Clarity: ${Math.round(clarity)}%`);

  if (fluency >= 80) parts.push("Smooth delivery with minimal fillers.");
  else if (fluency >= 50) parts.push("Adequate fluency; reduce filler words.");
  else parts.push("Hesitant speech; practice structured responses.");

  if (accuracy >= 80) parts.push("Technically accurate and precise.");
  else if (accuracy >= 50) parts.push("Partially accurate; review technical concepts.");
  else parts.push("Limited technical accuracy; needs foundational knowledge.");

  return parts.join(" ");
}

export const InterviewEvaluator = {
  evaluateCoding,
  evaluateOral,
};
