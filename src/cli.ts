#!/usr/bin/env node
import { runAdopt, type AdoptOptions } from "./commands/adopt.js";
import { runOpen, type OpenOptions } from "./commands/open.js";
import { runLocalApp, type RunOptions } from "./commands/run.js";
import { filterServices, type ServiceStatusFilter } from "./core/filter.js";
import { joinServices } from "./core/join.js";
import { renderHuman } from "./output/human.js";
import { renderJson } from "./output/json.js";
import { resolveProject, scanListeningPorts } from "./process/inspect.js";
import { readProjection } from "./registry/projection.js";

type CliOptions = HelpOptions | LsOptions | RunCliOptions | AdoptCliOptions | OpenCliOptions;

interface HelpOptions {
  command: "help";
  topic: "root" | "ls" | "run" | "adopt" | "open";
}

interface LsOptions {
  command: "ls";
  json: boolean;
  all: boolean;
  status: ServiceStatusFilter;
}

interface RunCliOptions extends RunOptions {
  command: "run";
}

interface AdoptCliOptions extends AdoptOptions {
  command: "adopt";
}

interface OpenCliOptions extends OpenOptions {
  command: "open";
}

async function main(argv: string[]): Promise<void> {
  const options = parseArgs(argv);
  if (options.command === "help") {
    process.stdout.write(renderHelp(options.topic));
    return;
  }

  if (options.command === "run") {
    process.exitCode = await runLocalApp(options);
    return;
  }

  if (options.command === "adopt") {
    process.exitCode = await runAdopt(options);
    return;
  }

  if (options.command === "open") {
    process.exitCode = await runOpen(options, await readProjection());
    return;
  }

  const [osScan, annotations, currentProject] = await Promise.all([
    scanListeningPorts(),
    readProjection(),
    resolveProject(process.cwd())
  ]);
  const allServices = joinServices(osScan, annotations);
  const services = filterServices(allServices, {
    showAll: options.all,
    status: options.status,
    currentProjectPath: currentProject.path
  });

  process.stdout.write(
    options.json
      ? `${renderJson(services)}\n`
      : `${renderHuman(services, {
          emptyReason: allServices.length === 0 ? "no_services" : "filtered"
        })}\n`
  );
}

function parseArgs(argv: string[]): CliOptions {
  const [command = "ls", ...flags] = argv;
  if (isHelpFlag(command)) return { command: "help", topic: "root" };
  if (command === "help") return parseHelpArgs(flags);
  if (command === "run") return parseRunArgs(flags);
  if (command === "adopt") return parseAdoptArgs(flags);
  if (command === "open") return parseOpenArgs(flags);
  if (command !== "ls" && command !== "list") {
    throw new CliError(`Unknown command: ${command}`);
  }

  if (flags.some(isHelpFlag)) return { command: "help", topic: "ls" };

  const options: LsOptions = {
    command: "ls",
    json: false,
    all: false,
    status: "default"
  };

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--json") {
      options.json = true;
      continue;
    }

    if (flag === "--all") {
      options.all = true;
      continue;
    }

    if (flag === "--running") {
      setLsStatus(options, "running", flag);
      continue;
    }

    if (flag === "--stopped") {
      setLsStatus(options, "stopped", flag);
      continue;
    }

    if (flag === "--status") {
      const value = readFlagValue(flags, index, flag);
      if (value !== "running" && value !== "stopped") {
        throw new CliError(`Invalid status: ${value}`);
      }
      setLsStatus(options, value, flag);
      index += 1;
      continue;
    }

    throw new CliError(`Unknown option: ${flag}`);
  }

  return options;
}

function parseHelpArgs(args: string[]): HelpOptions {
  const [topic = "root", ...rest] = args;
  if (rest.length > 0) throw new CliError(`Unknown help topic: ${rest[0]}`);
  if (
    topic === "root" ||
    topic === "ls" ||
    topic === "list" ||
    topic === "run" ||
    topic === "adopt" ||
    topic === "open"
  ) {
    return { command: "help", topic: topic === "list" ? "ls" : topic };
  }
  throw new CliError(`Unknown help topic: ${topic}`);
}

function parseOpenArgs(args: string[]): OpenCliOptions | HelpOptions {
  if (args.some(isHelpFlag)) return { command: "help", topic: "open" };
  const [app, ...rest] = args;
  if (!app) throw new CliError("Missing app");
  if (rest.length > 0) throw new CliError(`Unknown argument: ${rest[0]}`);
  return { command: "open", app };
}

function parseRunArgs(args: string[]): RunCliOptions | HelpOptions {
  if (args.some(isHelpFlag)) return { command: "help", topic: "run" };

  const separatorIndex = args.indexOf("--");
  if (separatorIndex < 0) throw new CliError("Missing -- before command");

  const flags = args.slice(0, separatorIndex);
  const commandArgs = args.slice(separatorIndex + 1);
  if (commandArgs.length === 0) throw new CliError("Missing command after --");

  const options: RunCliOptions = {
    command: "run",
    commandArgs,
    projectPath: null,
    source: null,
    note: null,
    noReuse: false
  };

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--no-reuse") {
      options.noReuse = true;
      continue;
    }

    if (flag === "--source") {
      options.source = readFlagValue(flags, index, flag);
      if (!isSourceValue(options.source)) throw new CliError(`Invalid source: ${options.source}`);
      index += 1;
      continue;
    }

    if (flag === "--project") {
      options.projectPath = readFlagValue(flags, index, flag);
      index += 1;
      continue;
    }

    if (flag === "--note") {
      options.note = readFlagValue(flags, index, flag);
      index += 1;
      continue;
    }

    throw new CliError(`Unknown option: ${flag}`);
  }

  return options;
}

function parseAdoptArgs(args: string[]): AdoptCliOptions | HelpOptions {
  if (args.some(isHelpFlag)) return { command: "help", topic: "adopt" };
  const [rawPort, ...flags] = args;
  if (!rawPort) throw new CliError("Missing port");
  const port = parsePositiveInteger(rawPort);
  if (port === null) throw new CliError(`Invalid port: ${rawPort}`);

  const options: AdoptCliOptions = {
    command: "adopt",
    port,
    note: null,
    keep: null,
    source: null
  };

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--keep") {
      if (options.keep === false) throw new CliError("Cannot combine --keep and --no-keep");
      options.keep = true;
      continue;
    }

    if (flag === "--no-keep") {
      if (options.keep === true) throw new CliError("Cannot combine --keep and --no-keep");
      options.keep = false;
      continue;
    }

    if (flag === "--source") {
      options.source = readFlagValue(flags, index, flag);
      if (!isSourceValue(options.source)) throw new CliError(`Invalid source: ${options.source}`);
      index += 1;
      continue;
    }

    if (flag === "--note") {
      options.note = readFlagValue(flags, index, flag);
      index += 1;
      continue;
    }

    throw new CliError(`Unknown option: ${flag}`);
  }

  return options;
}

function readFlagValue(flags: string[], index: number, flag: string): string {
  const value = flags[index + 1];
  if (!value || value.startsWith("--")) throw new CliError(`Missing value for ${flag}`);
  return value;
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function isSourceValue(value: string): boolean {
  return ["human", "codex", "claude", "cursor", "cline", "aider", "unknown"].includes(value);
}

function isHelpFlag(value: string): boolean {
  return value === "--help" || value === "-h";
}

function setLsStatus(options: LsOptions, status: ServiceStatusFilter, flag: string): void {
  if (options.status !== "default") throw new CliError(`Cannot combine ${flag} with another status filter`);
  options.status = status;
}

function renderHelp(topic: HelpOptions["topic"]): string {
  if (topic === "run") {
    return [
      "Usage: localapp run [options] -- <command>",
      "",
      "Start or reuse a local dev service and write LocalApp registry events.",
      "",
      "Options:",
      "  --note <text>       One-line intent for agents and humans",
      "  --source <source>   Override source: human, codex, claude, cursor, cline, aider, unknown",
      "  --project <path>    Use a project path other than the current directory",
      "  --no-reuse          Skip conservative reuse checks",
      "  -h, --help          Show this help",
      ""
    ].join("\n");
  }

  if (topic === "adopt") {
    return [
      "Usage: localapp adopt <port> [options]",
      "",
      "Annotate an already-listening localhost service without restarting it.",
      "",
      "Options:",
      "  --note <text>       One-line meaning for this service",
      "  --keep              Mark as a kept app label; does not keep it alive",
      "  --no-keep           Clear the kept label (re-adopt otherwise preserves it)",
      "  --source <source>   Override source: human, codex, claude, cursor, cline, aider, unknown",
      "  -h, --help          Show this help",
      ""
    ].join("\n");
  }

  if (topic === "open") {
    return [
      "Usage: localapp open <app|service-id>",
      "",
      "Reopen a registered service recipe, or print its URL if it is already running.",
      "",
      "Options:",
      "  -h, --help          Show this help",
      ""
    ].join("\n");
  }

  if (topic === "ls") {
    return [
      "Usage: localapp ls [options]",
      "",
      "List localhost services joined with LocalApp registry annotations.",
      "",
      "Options:",
      "  --json              Print valid JSON for agents",
      "  --all               Show services outside the current project",
      "  --running           Show only running services",
      "  --stopped           Show stopped/stale services, including non-kept records",
      "  --status <status>   Filter status: running, stopped",
      "  -h, --help          Show this help",
      ""
    ].join("\n");
  }

  return [
    "Usage: localapp <command> [options]",
    "",
    "Commands:",
    "  ls                  List local services (default)",
    "  open                Reopen a registered local service",
    "  run                 Start or reuse a local dev service",
    "  adopt               Annotate an already-listening local service",
    "",
    "Examples:",
    "  localapp ls --json",
    "  localapp open localapp",
    "  localapp run --note \"checkout redesign\" -- npm run dev",
    "  localapp adopt 8765 --note \"SakuraCat patch panel\" --keep",
    "",
    "Use localapp <command> --help for command-specific help.",
    ""
  ].join("\n");
}

class CliError extends Error {}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof CliError) {
    process.stderr.write(`${message}\n`);
  } else {
    process.stderr.write(`localapp ls failed: ${message}\n`);
  }
  process.exitCode = 1;
});
