interface ExtractedSkill {
  name: string;
  confidence: number;
}

interface ExtractedEducation {
  degree: string;
  institution: string;
  year?: number;
}

interface ExtractedProject {
  name: string;
  description: string;
  technologies: string[];
}

interface ExtractionResult {
  skills: ExtractedSkill[];
  education: ExtractedEducation[];
  yearsExperience: number | null;
  technologies: string[];
  projects: ExtractedProject[];
  summary: string;
}

const SKILL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "c#", "c++", "go", "rust",
  "react", "next.js", "vue", "angular", "node.js", "express", "nestjs",
  "postgresql", "mongodb", "redis", "mysql", "prisma", "typeorm",
  "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "terraform",
  "graphql", "rest", "grpc", "websocket",
  "html", "css", "sass", "tailwind", "bootstrap",
  "git", "github", "gitlab", "jira",
  "agile", "scrum", "tdd", "microservices", "serverless",
];

const DEGREE_PATTERNS = [
  /(bachelor|master|phd|ph\.d|doctorate|b\.?[seac]\s*|m\.?[seac]\s*)/i,
];

const INSTITUTION_KEYWORDS = [
  "university", "college", "institute", "school of",
];

const EXP_PATTERN = /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i;

export function extractResumeData(text: string): ExtractionResult {
  const lower = text.toLowerCase();

  const skills: ExtractedSkill[] = [];
  const seen = new Set<string>();
  for (const keyword of SKILL_KEYWORDS) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\.");
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = keyword;
      if (!seen.has(name)) {
        seen.add(name);
        skills.push({ name, confidence: 0.8 });
      }
    }
  }

  const education: ExtractedEducation[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (DEGREE_PATTERNS.some((p) => p.test(line))) {
      const inst =
        lines.slice(i, i + 3).find((l) =>
          INSTITUTION_KEYWORDS.some((k) => l.toLowerCase().includes(k))
        ) || "";
      const yearMatch = line.match(/(19|20)\d{2}/);
      education.push({
        degree: line.trim().substring(0, 120),
        institution: inst.trim().substring(0, 120),
        year: yearMatch ? parseInt(yearMatch[0]) : undefined,
      });
    }
  }

  const expMatch = text.match(EXP_PATTERN);
  const yearsExperience = expMatch ? parseFloat(expMatch[1]) : null;

  const technologies = skills.map((s) => s.name);

  const projectRegex = /project[:\s]+([^\n]+)/gi;
  const projects: ExtractedProject[] = [];
  let projMatch;
  while ((projMatch = projectRegex.exec(text)) !== null) {
    projects.push({
      name: projMatch[1].trim().substring(0, 100),
      description: "",
      technologies: [],
    });
  }

  const summary = extractSummary(text);

  return { skills, education, yearsExperience, technologies, projects, summary };
}

function extractSummary(text: string): string {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const firstLines = lines.slice(0, 5).join(" ").trim();
  return firstLines.length > 500 ? firstLines.substring(0, 500) + "..." : firstLines;
}

export { SKILL_KEYWORDS };
