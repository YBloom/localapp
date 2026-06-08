<div align="center">

# LocalApp

### 给 AI agent 用的语义化 `lsof`

一次调用,告诉你 **localhost 上运行着什么、属于哪个项目、是否存活** — 消失了也能重新唤回。

[![npm version](https://img.shields.io/npm/v/%40yaobii%2Flocalapp?color=cb3837&logo=npm)](https://www.npmjs.com/package/@yaobii/localapp)
[![node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![platform](https://img.shields.io/badge/platform-macOS-000000?logo=apple)](#install)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/YBloom/localapp/issues)

[English](./README.md) · **简体中文**

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

> 一次调用 → 端口 · 项目 · 来源 · 存活状态，语义已随数据一同附带。加上 `--json`，agent 也能直接读取。

---

## 你为什么需要它

- 🔎 **一次调用，不用循环。** 用一个已解析的答案取代 `lsof + ps + grep + curl`：哪个端口、哪个项目、哪个 agent、是否存活。
- 🧠 **意义在 shell 关闭后依然存在。** 进程跑完了，终端早已关掉，agent 上下文也压缩了——LocalApp 记得 `5173` 到底是什么。
- 🔁 **唤回已消失的服务。** 重启机器忘了命令？LocalApp 重放录下的启动配方。
- 🚦 **不再堆叠端口。** `run` 会复用健康的服务器，而不是再开第五个一模一样的开发服务器。
- 🤝 **标注，而非拦截。** 它读取操作系统真实状态，只在上面加一层——忽略它的 agent 不会破坏任何东西。
- 🤖 **原生 agent 友好。** 处处支持 `--json`。它是 agent 触手可及的低成本工具，就像 `rg` 或 `jq` 一样。

## 问题所在

你整天和 AI agent 协作开发。每个需要预览的 agent 都会启动自己的开发服务器：

- Agent A 在 `5173` 上启动了一个服务。
- Agent B 不知道它的存在，为同一个项目开了 `5174`。
- 一天后 `5173` / `5174` / `7110` 全都在监听 —— 没人，包括你和下一个 agent，能说清哪个是真实的、属于哪个项目、哪个可以安全停掉。

进程还活着，但它的**身份已经蒸发**：shell 关了，agent 上下文被压缩了，你忘了。`5173` 退化成一个没人敢动的无意义数字。

现在，agent 回答"在跑什么？"要走一遍 `lsof + ps + grep + curl` — 多次调用、数千 token，最终还是猜哪个项目拥有这个端口。LocalApp 用**一次调用**返回已解析的答案：端口 → 项目 → 来源 → 存活状态，语义已随数据附带。

## 快速开始

```bash
npm install -g @yaobii/localapp
# 或者无需安装直接运行：
npx @yaobii/localapp ls
```

需要 **macOS** 和 **Node 20+**。

```bash
localapp ls            # what's running for this project?
localapp ls --all      # everything on this machine
localapp ls --json     # the same, for an agent
```

## 唤回已消失的服务

重启后服务没了？你记不清确切的命令。LocalApp 记得：

```bash
localapp open api
# Already alive? It just prints the URL. Gone? It replays the recorded
# recipe (command + cwd). If the project's own environment has rotted
# (venv, deps, env vars), it says so plainly and hands control back —
# it will not try to fix your environment.
```

## 启动服务，不堆叠端口

```bash
localapp run --note "checkout redesign" -- npm run dev
# If a healthy server for this project already exists, reuse it and print its URL.
# Otherwise start it, detect the port, and register it.
```

已经有服务在跑，但不是通过 LocalApp 启动的？直接原地标注，无需重启：

```bash
localapp adopt 8765 --note "patch panel"
```

## 为什么有效

LocalApp 读取操作系统的真实状态（`lsof`），只在上面**标注**一层 —— 补上内核无法重建的那一块：哪个项目、哪个 agent、为什么跑。这带来一个决定性特性：

> 忽略 LocalApp 的 agent 不会破坏它。它的服务器只是以未标注端口的形式出现。视图永远不会盲区，也永远不会失效。

agent 使用它的方式，和使用 `rg` 或 `jq` 一样：它是获取所需答案的低成本路径 —— 而不是一条必须记住去遵守的策略。

## 命令

| 命令 | 作用 |
|---|---|
| `localapp ls` | 列出当前项目的服务。`--all` 显示所有项目，`--running` / `--stopped` / `--status <s>` 过滤，`--json` 供 agent 使用。 |
| `localapp open <app>` | 按项目名或 id 重新打开已注册的服务 —— 若服务已存活则直接打印其 URL。 |
| `localapp run --note "…" -- <cmd>` | 启动（或复用）一个开发服务器并注册它。 |
| `localapp adopt <port> --note "…"` | 对已在监听的端口原地标注，无需重启。 |

运行 `localapp <command> --help` 查看每个命令的详细选项。

## 它不是什么

- **不是部署平台。** 它不会动 `package.json`、框架配置、Dockerfiles，也不碰 Vercel/Railway/Netlify 的任何设置。
- **不是 AI 应用构建器。**
- **不是守护进程或进程管理器。** 它按需读取实时运行状态，不向外发送任何数据。读取比拦截侵入性更低。

## 状态

私有内测版，**按现状**开放。macOS 优先、CLI 优先、单人维护 —— 不提供支持保障。欢迎提 Issue 和想法，但响应视精力而定。

## 许可证

[MIT](./LICENSE) © YBloom
