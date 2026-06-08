<div align="center">

# LocalApp

### The semantic `lsof` for AI agents.

One call tells you **what's running on localhost, whose it is, and whether it's alive** — and reopens it when it's gone.

[![npm version](https://img.shields.io/npm/v/localapp?color=cb3837&logo=npm)](https://www.npmjs.com/package/localapp)
[![node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![platform](https://img.shields.io/badge/platform-macOS-000000?logo=apple)](#install)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/YBloom/localapp/issues)

**English** · [简体中文](./README.zh-CN.md)

</div>

```text
$ localapp ls

Running
PORT   PROJECT   STATUS      URL                     NOTE
5173   web-app   ● running   http://localhost:5173   checkout redesign
5174   web-app   ● running   http://localhost:5174   (duplicate)

Not running
PORT   PROJECT   STATUS      URL                     NOTE
—      api       ○ stopped   —                       nightly worker   (kept)
```

> One call → port · project · source · liveness, meaning already attached. Add `--json` and an agent reads it too.

---

## Why you want this

- 🔎 **One call, not a loop.** Replace `lsof + ps + grep + curl` with a single resolved answer: which port, which project, which agent, alive or not.
- 🧠 **Meaning that survives the shell.** The process keeps running long after the terminal closes and the agent's context is compacted — LocalApp remembers what `5173` actually *is*.
- 🔁 **Reopen what evaporated.** Rebooted and forgot the command? LocalApp replays the recorded recipe.
- 🚦 **No more stacked ports.** `run` reuses a healthy server instead of opening a fifth copy of the same dev server.
- 🤝 **Annotate, don't intercept.** It reads OS truth and only adds a layer on top — an agent that ignores it doesn't break it.
- 🤖 **Agent-native.** `--json` everywhere. Built to be the cheaper path an agent reaches for, like `rg` or `jq`.

## The problem

You build with AI agents all day. Every agent that needs a preview starts its own dev server:

- Agent A starts a server on `5173`.
- Agent B doesn't know it exists and opens `5174` for the same project.
- A day later `5173` / `5174` / `7110` are all listening — and nobody, not you and not the next agent, can say which one is real, which project it belongs to, or which is safe to stop.

The process stays alive, but its **identity evaporates**: the shell closed, the agent's context was compacted, you forgot. `5173` decays into a meaningless number nobody dares touch.

Today an agent answers *"what's running?"* with a `lsof + ps + grep + curl` loop — several calls, thousands of tokens, and still a guess about which project owns a port. LocalApp returns the resolved answer in **one call**: port → project → source → liveness, meaning already attached.

## Quick start

```bash
npm install -g localapp
# or run without installing:
npx localapp ls
```

Requires **macOS** and **Node 20+**.

```bash
localapp ls            # what's running for this project?
localapp ls --all      # everything on this machine
localapp ls --json     # the same, for an agent
```

## Reopen what evaporated

Rebooted and your service is gone? You don't remember the exact command. LocalApp does:

```bash
localapp open api
# Already alive? It just prints the URL. Gone? It replays the recorded
# recipe (command + cwd). If the project's own environment has rotted
# (venv, deps, env vars), it says so plainly and hands control back —
# it will not try to fix your environment.
```

## Launch without stacking ports

```bash
localapp run --note "checkout redesign" -- npm run dev
# If a healthy server for this project already exists, reuse it and print its URL.
# Otherwise start it, detect the port, and register it.
```

Already have something running you didn't launch through LocalApp? Annotate it in place, without restarting:

```bash
localapp adopt 8765 --note "patch panel"
```

## Why it works

LocalApp reads OS truth (`lsof`) and only **annotates** it — adding the one layer the kernel can't reconstruct: which project, which agent, why. That has one decisive property:

> An agent that ignores LocalApp doesn't break it. Its server simply shows up as an un-annotated port. The view is never blind, and never goes stale.

Agents reach for it the same way they reach for `rg` or `jq`: it's the cheaper path to an answer they already need — not a policy they have to remember to obey.

## Commands

| Command | What it does |
|---|---|
| `localapp ls` | List services for the current project. `--all` for every project, `--running` / `--stopped` / `--status <s>` to filter, `--json` for agents. |
| `localapp open <app>` | Reopen a registered service by project name or id — or print its URL if it's already alive. |
| `localapp run --note "…" -- <cmd>` | Start (or reuse) a dev server and register it. |
| `localapp adopt <port> --note "…"` | Annotate an already-listening port without restarting it. |

Run `localapp <command> --help` for per-command options.

## What this is not

- **Not a deployment platform.** It never touches `package.json`, framework config, Dockerfiles, or Vercel/Railway/Netlify settings.
- **Not an AI app builder.**
- **Not a daemon or process supervisor.** It reads live runtime state on demand and sends nothing off your machine. Reading is less invasive than intercepting.

## Status

Private dogfood, shared **as-is**. macOS-first, CLI-first, single maintainer — no support guarantees. Issues and ideas are welcome, but response is best-effort.

## License

[MIT](./LICENSE) © YBloom
