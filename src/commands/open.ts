import { basename } from "node:path";
import { isProcessAlive, liveListeningPort, probePort } from "../core/liveness.js";
import { runLocalApp, type RunOptions } from "./run.js";
import type { Annotation } from "../types.js";

export interface OpenOptions {
  app: string;
}

interface OpenDeps {
  runLocalApp: (options: RunOptions) => Promise<number>;
}

export async function runOpen(
  options: OpenOptions,
  annotations: Annotation[],
  deps: OpenDeps = { runLocalApp }
): Promise<number> {
  const targets = resolveOpenTargets(annotations, options.app);
  if (targets.length === 0) {
    process.stderr.write(
      `no registered service matching '${options.app}'\nTry: localapp ls --all\n`
    );
    return 1;
  }

  if (targets.length > 1) {
    process.stderr.write(renderOpenCandidates(targets));
    return 1;
  }

  const annotation = targets[0] as Annotation;
  const livePort = await livePortForAnnotation(annotation);
  if (livePort !== null) {
    const url =
      annotation.port === livePort && annotation.url
        ? annotation.url
        : `http://localhost:${livePort}`;
    process.stdout.write(`already running: ${url}\n`);
    return 0;
  }

  if (!annotation.command || !annotation.projectPath) {
    process.stderr.write("no launch recipe recorded for this service\n");
    return 1;
  }

  let replayDetectedPort = false;
  let replayStoppedBySignal = false;
  const exitCode = await deps.runLocalApp({
    commandArgs: ["sh", "-c", annotation.command],
    projectPath: annotation.projectPath,
    note: annotation.note,
    source: null,
    noReuse: true,
    onPortDetected: (detection) => {
      replayDetectedPort = detection.port !== null;
    },
    onExit: (exit) => {
      replayStoppedBySignal = exit.signal !== null;
    }
  });

  if (shouldPrintRecipeFailure(exitCode, replayDetectedPort, replayStoppedBySignal)) {
    process.stderr.write(
      "recipe failed to start - likely the project's own environment (venv / deps / env vars), not localapp's to fix\n"
    );
  }

  return exitCode;
}

export function shouldPrintRecipeFailure(
  exitCode: number,
  replayDetectedPort: boolean,
  replayStoppedBySignal: boolean
): boolean {
  return exitCode !== 0 && !replayDetectedPort && !replayStoppedBySignal;
}

export function resolveOpenTargets(annotations: Annotation[], app: string): Annotation[] {
  const exactId = annotations.filter((annotation) => annotation.id === app);
  if (exactId.length > 0) return exactId;

  const exactBasename = annotations.filter((annotation) => projectBasename(annotation) === app);
  if (exactBasename.length > 0) return exactBasename;

  return annotations.filter((annotation) => {
    const name = projectBasename(annotation);
    return name !== null && name.includes(app);
  });
}

async function livePortForAnnotation(annotation: Annotation): Promise<number | null> {
  if (!annotation.pid || !isProcessAlive(annotation.pid)) return null;
  const livePort = await liveListeningPort(annotation.pid, annotation.port ?? null);
  if (livePort === null) return null;
  if (!(await probePort(livePort))) return null;
  return livePort;
}

function renderOpenCandidates(annotations: Annotation[]): string {
  return [
    "multiple registered services match; choose one with: localapp open <id>",
    ...annotations.map((annotation) =>
      [
        annotation.id,
        projectBasename(annotation) ?? "-",
        annotation.command ?? "-",
        annotation.branch ?? "-",
        annotation.note ?? "-",
        annotation.lastSeenAt ?? "-",
        annotation.status ?? "unknown"
      ].join(" · ")
    ),
    ""
  ].join("\n");
}

function projectBasename(annotation: Annotation): string | null {
  return annotation.projectPath ? basename(annotation.projectPath) : null;
}
