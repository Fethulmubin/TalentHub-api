import Docker from "dockerode";
import { Duplex } from "stream";
import logger from "../../shared/logger/logger";

const docker = new Docker();

const MEMORY_LIMIT = 256 * 1024 * 1024;
const CPU_QUOTA = 50000;
const CPU_PERIOD = 100000;
const EXEC_TIMEOUT = 30000;

interface ExecResult {
  output: string;
  error: string;
  timedOut: boolean;
}

export const executeCodeInDocker = async (
  code: string,
  language: string,
  testCases: { input?: string; expected?: string }[]
): Promise<{
  results: { testIndex: number; passed: boolean; actual: string; expected?: string; error?: string; duration: number }[];
  overallOutput: string;
  overallError: string;
}> => {
  const image = getImageForLanguage(language);
  const wrappedCode = wrapCode(code, language, testCases);
  const container = await docker.createContainer({
    Image: image,
    Cmd: getCommand(language),
    AttachStdout: true,
    AttachStderr: true,
    HostConfig: {
      Memory: MEMORY_LIMIT,
      MemorySwap: MEMORY_LIMIT,
      CpuQuota: CPU_QUOTA,
      CpuPeriod: CPU_PERIOD,
      NetworkMode: "none",
      ReadonlyRootfs: true,
      AutoRemove: true,
    },
    OpenStdin: true,
    StdinOnce: true,
  });

  try {
    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
    });

    const result = await Promise.race([
      pipeStream(stream, wrappedCode),
      timeout(EXEC_TIMEOUT).then(() => ({ output: "", error: "Execution timed out", timedOut: true })),
    ]);

    if (result.timedOut) {
      try {
        await container.kill();
      } catch { }
      return {
        results: testCases.map((_, i) => ({
          testIndex: i,
          passed: false,
          actual: "",
          expected: testCases[i]?.expected,
          error: "Execution timed out",
          duration: EXEC_TIMEOUT,
        })),
        overallOutput: "",
        overallError: "Execution timed out",
      };
    }

    const { output, error } = result;
    const results = parseTestResults(output, error, testCases);

    return { results, overallOutput: output, overallError: error };
  } finally {
    try {
      await container.remove({ force: true });
    } catch { }
  }
};

function getImageForLanguage(language: string): string {
  const images: Record<string, string> = {
    javascript: "node:18-alpine",
    typescript: "node:18-alpine",
    python: "python:3.11-alpine",
    java: "openjdk:17-alpine",
    cpp: "gcc:13-alpine",
    c: "gcc:13-alpine",
    go: "golang:1.21-alpine",
    rust: "rust:1.73-alpine",
    ruby: "ruby:3.2-alpine",
  };
  return images[language] || "node:18-alpine";
}

function getCommand(language: string): string[] {
  const commands: Record<string, string[]> = {
    javascript: ["node", "/tmp/code.js"],
    typescript: ["sh", "-c", "npx ts-node /tmp/code.ts"],
    python: ["python3", "/tmp/code.py"],
    java: ["sh", "-c", "javac /tmp/Main.java && java -cp /tmp Main"],
    cpp: ["sh", "-c", "g++ /tmp/code.cpp -o /tmp/code && /tmp/code"],
    c: ["sh", "-c", "gcc /tmp/code.c -o /tmp/code && /tmp/code"],
    go: ["go", "run", "/tmp/code.go"],
    rust: ["sh", "-c", "rustc /tmp/code.rs -o /tmp/code && /tmp/code"],
    ruby: ["ruby", "/tmp/code.rb"],
  };
  return commands[language] || ["node", "/tmp/code.js"];
}

function wrapCode(code: string, language: string, testCases: { input?: string; expected?: string }[]): string {
  if (language === "javascript" || language === "typescript") {
    return `
${code}

const testCases = ${JSON.stringify(testCases)};
testCases.forEach((tc, i) => {
  try {
    const result = solution(tc.input);
    const passed = String(result) === String(tc.expected);
    console.log(\`[TEST_RESULT] index=\${i} passed=\${passed} actual=\${JSON.stringify(result)} expected=\${JSON.stringify(tc.expected)}\`);
  } catch (e) {
    console.log(\`[TEST_RESULT] index=\${i} passed=false actual= error=\${e.message}\`);
  }
});
`;
  }
  if (language === "python") {
    return `
${code}

import json
test_cases = ${JSON.stringify(testCases)}
for i, tc in enumerate(test_cases):
    try:
        result = solution(tc.get("input"))
        passed = str(result) == str(tc.get("expected"))
        print(f"[TEST_RESULT] index={i} passed={passed} actual={json.dumps(result)} expected={json.dumps(tc.get('expected'))}")
    except Exception as e:
        print(f"[TEST_RESULT] index={i} passed=False actual= error={str(e)}")
`;
  }
  return code;
}

function parseTestResults(
  output: string,
  error: string,
  testCases: { input?: string; expected?: string }[]
): { testIndex: number; passed: boolean; actual: string; expected?: string; error?: string; duration: number }[] {
  const lines = output.split("\n");
  const results: { testIndex: number; passed: boolean; actual: string; expected?: string; error?: string; duration: number }[] = [];

  for (const line of lines) {
    const match = line.match(/\[TEST_RESULT\] index=(\d+) passed=(true|false) actual=(.*?)(?: expected=(.*))?$/);
    if (match) {
      results.push({
        testIndex: parseInt(match[1]),
        passed: match[2] === "true",
        actual: match[3],
        expected: match[4] || testCases[parseInt(match[1])]?.expected,
        duration: 0,
      });
    }
  }

  if (results.length < testCases.length) {
    const missing = testCases.slice(results.length);
    for (let i = 0; i < missing.length; i++) {
      results.push({
        testIndex: results.length + i,
        passed: false,
        actual: "",
        expected: missing[i]?.expected,
        error: error || "No output produced",
        duration: 0,
      });
    }
  }

  return results;
}

function pipeStream(stream: NodeJS.ReadWriteStream, input: string): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    let output = "";
    let error = "";

    stream.write(input + "\n");

    stream.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      const clean = text.replace(/[^ -~\n\t]/g, "");
      output += clean;
    });

    stream.on("error", (err: Error) => {
      error += err.message;
    });

    (stream as any).on("end", () => {
      (stream as any).destroy();
      resolve({ output, error, timedOut: false });
    });

    setTimeout(() => {
      (stream as any).destroy();
      resolve({ output, error: "Stream timeout", timedOut: true });
    }, EXEC_TIMEOUT);
  });
}

function timeout(ms: number): Promise<{ output: string; error: string; timedOut: true }> {
  return new Promise((resolve) => setTimeout(() => resolve({ output: "", error: "Execution timed out", timedOut: true }), ms));
}
