import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const runnerPath = fileURLToPath(import.meta.url);
const repoRoot = process.cwd();
const isWindows = process.platform === "win32";
const startupTimeoutMs = 30_000;
let activePreview;
let activeTarget;
let cleaningUp = false;

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function describeError(error) {
  return error instanceof Error ? error.stack || error.message : String(error);
}

function appendOutput(target, chunk) {
  const next = `${target.value}${chunk.toString()}`;
  target.value = next.length > 12_000 ? next.slice(-12_000) : next;
}

function reserveLocalPort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : undefined;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
        } else if (typeof port === "number") {
          resolvePort(port);
        } else {
          reject(new Error("Could not reserve a local preview port."));
        }
      });
    });
  });
}

function waitForExit(child, timeoutMs = 5_000) {
  if (!child || child.exitCode !== null || child.signalCode) return Promise.resolve();

  return new Promise((resolveExit) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveExit();
    };
    const timer = setTimeout(finish, timeoutMs);
    child.once("exit", finish);
    child.once("error", finish);
  });
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode) return;

  const signalChild = (signal) => {
    try {
      if (!isWindows && child.pid) {
        process.kill(-child.pid, signal);
      } else {
        child.kill(signal);
      }
      return true;
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ESRCH") return false;
      throw error;
    }
  };

  signalChild("SIGTERM");
  await waitForExit(child);

  if (child.exitCode === null && !child.signalCode) {
    signalChild("SIGKILL");
    await waitForExit(child, 1_000);
  }
}

async function cleanupChildren() {
  if (cleaningUp) return;
  cleaningUp = true;
  try {
    await stopChild(activeTarget);
    await stopChild(activePreview);
  } finally {
    activeTarget = undefined;
    activePreview = undefined;
    cleaningUp = false;
  }
}

function waitForChildResult(child) {
  return new Promise((resolveResult, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveResult({ code, signal }));
  });
}

async function waitForPreview(child, baseUrl, output) {
  const deadline = Date.now() + startupTimeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode) {
      const text = `${output.stdout.value}${output.stderr.value}`.trim();
      const error = new Error(`Astro preview exited before becoming ready.${text ? `\n${text}` : ""}`);
      error.portLost = /EADDRINUSE|address already in use/i.test(text);
      throw error;
    }

    try {
      const response = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) {
        await delay(100);
        if (child.exitCode === null && !child.signalCode) return;
      }
    } catch (error) {
      lastError = error;
    }

    await delay(150);
  }

  const text = `${output.stdout.value}${output.stderr.value}`.trim();
  const error = new Error(
    `Timed out waiting for Astro preview at ${baseUrl}.${lastError ? ` ${describeError(lastError)}` : ""}${
      text ? `\n${text}` : ""
    }`
  );
  error.portLost = /EADDRINUSE|address already in use/i.test(text);
  throw error;
}

async function startPreview() {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const port = await reserveLocalPort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const output = { stdout: { value: "" }, stderr: { value: "" } };
    const child = spawn(process.execPath, [runnerPath, "--preview-server", String(port)], {
      cwd: repoRoot,
      detached: !isWindows,
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout?.on("data", (chunk) => appendOutput(output.stdout, chunk));
    child.stderr?.on("data", (chunk) => appendOutput(output.stderr, chunk));

    activePreview = child;
    try {
      await waitForPreview(child, baseUrl, output);
      return { baseUrl, child };
    } catch (error) {
      await stopChild(child);
      activePreview = undefined;
      if (attempt === 0 && error && typeof error === "object" && error.portLost) continue;
      throw error;
    }
  }

  throw new Error("Astro preview could not acquire a local port.");
}

async function runPreviewServer(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid preview port: ${port}`);
  }

  const { preview } = await import("astro");
  const server = await preview({
    root: repoRoot,
    server: { host: "127.0.0.1", port },
    // Astro forwards this Vite preview option. It prevents a port collision from
    // silently moving the child to a different port after reservation.
    vite: { preview: { strictPort: true } }
  });

  await server.closed();
}

async function runTarget(targetPath, targetArgs, baseUrl) {
  const child = spawn(process.execPath, [targetPath, ...targetArgs], {
    cwd: repoRoot,
    detached: !isWindows,
    env: { ...process.env, BASE_URL: baseUrl },
    stdio: "inherit"
  });
  activeTarget = child;
  const result = await waitForChildResult(child);
  activeTarget = undefined;

  if (result.signal) {
    throw new Error(`Browser target ended from ${result.signal}.`);
  }
  return result.code ?? 1;
}

async function main() {
  const [command, ...commandArgs] = process.argv.slice(2);

  if (command === "--preview-server") {
    await runPreviewServer(Number(commandArgs[0]));
    return;
  }

  if (!command) {
    throw new Error("Usage: node scripts/run-browser-check.mjs <browser-script> [...args]");
  }
  if (!existsSync(resolve(repoRoot, "dist"))) {
    throw new Error("dist/ does not exist. Run npm run build before running a browser check.");
  }

  const targetPath = resolve(repoRoot, command);
  if (!existsSync(targetPath)) {
    throw new Error(`Browser target does not exist: ${command}`);
  }

  const { baseUrl } = await startPreview();
  try {
    process.exitCode = await runTarget(targetPath, commandArgs, baseUrl);
  } finally {
    await cleanupChildren();
  }
}

function terminateForSignal(signal) {
  cleanupChildren()
    .catch((error) => console.error(describeError(error)))
    .finally(() => process.exit(128 + (signal === "SIGINT" ? 2 : 15)));
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(signal, () => terminateForSignal(signal));
}

process.once("uncaughtException", (error) => {
  console.error(describeError(error));
  cleanupChildren().finally(() => process.exit(1));
});

process.once("unhandledRejection", (reason) => {
  console.error(describeError(reason));
  cleanupChildren().finally(() => process.exit(1));
});

try {
  await main();
} catch (error) {
  console.error(describeError(error));
  process.exitCode = 1;
  await cleanupChildren();
}
