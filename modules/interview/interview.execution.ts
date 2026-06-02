import Docker from "dockerode";
import path from "path";
import os from "os";
import fs from "fs/promises";
import logger from "../../shared/logger/logger";

const docker = new Docker();

const MEMORY_LIMIT = 256 * 1024 * 1024;
const CPU_QUOTA = 50000;
const CPU_PERIOD = 100000;
const EXEC_TIMEOUT = 60000;

interface ExecResult {
  output: string;
  error: string;
  timedOut: boolean;
}

const LANGUAGE_CONFIG: Record<string, { image: string; filename: string; cmd: string[] }> = {
  javascript: { image: "node:18-alpine", filename: "/tmp/code.js", cmd: ["node", "/tmp/code.js"] },
  typescript: { image: "node:18-alpine", filename: "/tmp/code.ts", cmd: ["sh", "-c", "cd /tmp && npx ts-node code.ts"] },
  python: { image: "python:3.11-alpine", filename: "/tmp/code.py", cmd: ["python3", "/tmp/code.py"] },
  java: { image: "openjdk:17-alpine", filename: "/tmp/Main.java", cmd: ["sh", "-c", "cd /tmp && javac Main.java && java Main"] },
  cpp: { image: "gcc:13-alpine", filename: "/tmp/code.cpp", cmd: ["sh", "-c", "cd /tmp && g++ code.cpp -o code && ./code"] },
  c: { image: "gcc:13-alpine", filename: "/tmp/code.c", cmd: ["sh", "-c", "cd /tmp && gcc code.c -o code && ./code"] },
  go: { image: "golang:1.21-alpine", filename: "/tmp/code.go", cmd: ["go", "run", "/tmp/code.go"] },
  rust: { image: "rust:1.73-alpine", filename: "/tmp/code.rs", cmd: ["sh", "-c", "cd /tmp && rustc code.rs -o code && ./code"] },
  ruby: { image: "ruby:3.2-alpine", filename: "/tmp/code.rb", cmd: ["ruby", "/tmp/code.rb"] },
};

async function ensureImage(image: string): Promise<void> {
  try {
    await docker.getImage(image).inspect();
  } catch {
    logger.info(`Pulling Docker image: ${image}...`);
    await new Promise<void>((resolve, reject) => {
      docker.pull(image, {}, (err: Error | null, stream?: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        if (!stream) return reject(new Error(`Failed to pull image: ${image}`));
        docker.modem.followProgress(stream, (pullErr: Error | null) => {
          if (pullErr) return reject(pullErr);
          resolve();
        });
      });
    });
  }
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
  const cfg = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG["javascript"];
  const wrappedCode = wrapCode(code, language, testCases);

  await ensureImage(cfg.image);

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "talenthub-"));
  const srcFile = path.join(tmpDir, path.basename(cfg.filename));
  await fs.writeFile(srcFile, wrappedCode);

  let container: Docker.Container | null = null;

  try {
    container = await docker.createContainer({
      Image: cfg.image,
      Cmd: cfg.cmd,
      WorkingDir: "/tmp",
      HostConfig: {
        Memory: MEMORY_LIMIT,
        MemorySwap: MEMORY_LIMIT,
        CpuQuota: CPU_QUOTA,
        CpuPeriod: CPU_PERIOD,
        NetworkMode: "none",
        Binds: [`${tmpDir}:/tmp:ro`],
      },
      Tty: false,
      OpenStdin: false,
    });

    const startTime = Date.now();

    await container.start();

    const waitResult = await Promise.race([
      container.wait(),
      timeout(EXEC_TIMEOUT),
    ]);

    const duration = Date.now() - startTime;

    let timedOut = false;
    if ("timedOut" in waitResult) {
      timedOut = true;
      try { await container.kill(); } catch { }
    }

    let stdout = "";
    let stderr = "";
    try {
      const logs = await container.logs({ stdout: true, stderr: true });
      const demuxed = demuxLogs(logs);
      stdout = demuxed.stdout;
      stderr = demuxed.stderr;
    } catch (logErr: any) {
      logger.warn("Failed to read container logs", { error: logErr.message });
    }

    if (timedOut) {
      return {
        results: testCases.map((tc, i) => ({
          testIndex: i,
          passed: false,
          actual: "",
          expected: tc.expected,
          error: "Execution timed out (30s)",
          duration,
        })),
        overallOutput: stdout,
        overallError: "Execution timed out (30s)",
      };
    }

    const results = parseTestResults(stdout, stderr, testCases);
    return { results, overallOutput: stdout, overallError: stderr };
  } catch (err: any) {
    logger.error("Docker execution error", { error: err.message });
    return {
      results: testCases.map((tc, i) => ({
        testIndex: i,
        passed: false,
        actual: "",
        expected: tc.expected,
        error: err.message,
        duration: 0,
      })),
      overallOutput: "",
      overallError: err.message,
    };
  } finally {
    if (container) {
      try { await container.remove({ force: true }); } catch { }
    }
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
};

function timeout(ms: number): Promise<{ timedOut: true }> {
  return new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), ms));
}

function demuxLogs(buffer: Buffer): { stdout: string; stderr: string } {
  let stdout = "";
  let stderr = "";
  let offset = 0;

  while (offset < buffer.length) {
    const streamType = buffer[offset];
    const payloadLen = buffer.readUInt32BE(offset + 4);
    offset += 8;
    const payload = buffer.subarray(offset, offset + payloadLen).toString("utf-8");
    if (streamType === 1) stdout += payload;
    else if (streamType === 2) stderr += payload;
    offset += payloadLen;
  }

  return { stdout, stderr };
}

function wrapCode(code: string, language: string, testCases: { input?: string; expected?: string }[]): string {
  const wrap = (wrapped: string) => wrapped;

  if (language === "javascript" || language === "typescript") {
    return wrap(`
${code}

const testCases = ${JSON.stringify(testCases)};
testCases.forEach((tc, i) => {
  try {
    const inputVal = tc.input !== undefined ? JSON.parse(tc.input) : undefined;
    const result = solution(inputVal);
    const actualStr = JSON.stringify(result);
    const expectedStr = tc.expected !== undefined ? String(tc.expected) : undefined;
    const passed = actualStr === expectedStr;
    console.log(\`[TEST_RESULT] index=\${i} passed=\${passed} actual=\${actualStr} expected=\${tc.expected}\`);
  } catch (e) {
    console.log(\`[TEST_RESULT] index=\${i} passed=false actual="" error=\${(e).message}\`);
  }
});
`);
  }
  if (language === "python") {
    return wrap(`
${code}

import json
test_cases = ${JSON.stringify(testCases)}
for i, tc in enumerate(test_cases):
    try:
        input_val = json.loads(tc.get("input")) if tc.get("input") is not None else None
        result = solution(input_val)
        actual_str = json.dumps(result)
        expected_str = str(tc.get("expected"))
        passed = actual_str == expected_str
        print(f'[TEST_RESULT] index={i} passed={str(passed).lower()} actual={actual_str} expected={tc.get("expected")}')
    except Exception as e:
        print(f'[TEST_RESULT] index={i} passed=false actual="" error={str(e)}')
`);
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
