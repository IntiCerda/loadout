import type { Item } from '@/lib/types'

/**
 * Seed catalog. Covers 7 of the 8 installers; `claude-plugin` is deliberately
 * absent until a marketplace ref is verified against the real CLI, because a
 * catalog entry becomes an install command someone runs as root.
 *
 * Three `linux` refs below are provisional: `code` needs Microsoft's apt repo
 * and `ollama` has no apt package at all (it ships a curl installer). Both are
 * corrected to `{ installer: 'script' }` in Task 14, which is where that
 * variant is introduced.
 */
export const catalog: Item[] = [
  // --- languages ---
  {
    id: 'go',
    name: 'Go',
    description: 'The Go toolchain and compiler.',
    category: 'languages',
    installer: 'winget',
    ref: 'GoLang.Go',
    linux: { installer: 'apt', ref: 'golang-go' },
    sizeMb: 130,
  },
  {
    id: 'node',
    name: 'Node.js LTS',
    description: 'Node.js runtime and npm, installed via fnm.',
    category: 'languages',
    installer: 'winget',
    ref: 'Schniz.fnm',
    linux: { installer: 'apt', ref: 'nodejs' },
    sizeMb: 60,
    note: 'Installs fnm, then pulls the current LTS.',
  },
  {
    id: 'python',
    name: 'Python 3.12',
    description: 'CPython 3.12 with pip.',
    category: 'languages',
    installer: 'winget',
    ref: 'Python.Python.3.12',
    linux: { installer: 'apt', ref: 'python3.12' },
    sizeMb: 110,
  },

  {
    id: 'ruff',
    name: 'Ruff',
    description: 'Fast Python linter and formatter.',
    category: 'languages',
    installer: 'pipx',
    ref: 'ruff',
    requires: ['python'],
    sizeMb: 25,
  },

  // --- editors ---
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    description: 'Microsoft code editor. Required by every extension.',
    category: 'editors',
    installer: 'winget',
    ref: 'Microsoft.VisualStudioCode',
    linux: { installer: 'apt', ref: 'code' },
    sizeMb: 350,
  },

  // --- tools ---
  {
    id: 'git',
    name: 'Git',
    description: 'Distributed version control.',
    category: 'tools',
    installer: 'winget',
    ref: 'Git.Git',
    linux: { installer: 'apt', ref: 'git' },
    sizeMb: 65,
  },

  // --- containers ---
  {
    id: 'docker',
    name: 'Docker Desktop',
    description: 'Containers on the WSL2 backend.',
    category: 'containers',
    installer: 'winget',
    ref: 'Docker.DockerDesktop',
    // No `linux` ref: Docker Desktop is a Windows/macOS product. Skipped on Linux.
    requires: ['ubuntu'],
    sizeMb: 1400,
    note: 'Needs virtualization enabled in BIOS.',
  },

  // --- ai apps ---
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run local LLMs. Required by every local model.',
    category: 'ai-apps',
    installer: 'winget',
    ref: 'Ollama.Ollama',
    linux: { installer: 'apt', ref: 'ollama' },
    sizeMb: 700,
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Anthropic coding agent in the terminal.',
    category: 'ai-apps',
    installer: 'npm',
    ref: '@anthropic-ai/claude-code',
    requires: ['node'],
    sizeMb: 90,
  },

  // --- ai models ---
  {
    id: 'qwen2.5-coder-7b',
    name: 'Qwen2.5 Coder 7B',
    description: 'Local coding model. Strong at fill-in-the-middle.',
    category: 'ai-models',
    installer: 'ollama',
    ref: 'qwen2.5-coder:7b',
    requires: ['ollama'],
    sizeMb: 4700,
  },
  {
    id: 'nomic-embed-text',
    name: 'Nomic Embed Text',
    description: 'Embedding model for local RAG.',
    category: 'ai-models',
    installer: 'ollama',
    ref: 'nomic-embed-text',
    requires: ['ollama'],
    sizeMb: 274,
  },

  // --- extensions ---
  {
    id: 'ext-gitlens',
    name: 'GitLens',
    description: 'Blame, history and authorship inside VS Code.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'eamodio.gitlens',
    requires: ['vscode'],
    sizeMb: 15,
  },
  {
    id: 'ext-continue',
    name: 'Continue',
    description: 'Local AI autocomplete and chat in VS Code.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'Continue.continue',
    requires: ['vscode', 'ollama'],
    sizeMb: 30,
  },

  {
    id: 'ext-eslint',
    name: 'ESLint',
    description: 'JavaScript and TypeScript linting inside VS Code.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'dbaeumer.vscode-eslint',
    requires: ['vscode'],
    sizeMb: 12,
  },
  {
    id: 'ext-prettier',
    name: 'Prettier',
    description: 'Opinionated code formatter for the web stack.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'esbenp.prettier-vscode',
    requires: ['vscode'],
    sizeMb: 10,
  },

  // --- fonts ---
  {
    id: 'font-jetbrains-mono',
    name: 'JetBrains Mono',
    description: 'Monospace typeface with programming ligatures.',
    category: 'fonts',
    installer: 'font',
    ref: 'https://download.jetbrains.com/fonts/JetBrainsMono-2.304.zip',
    sizeMb: 8,
  },

  // --- linux ---
  {
    id: 'ubuntu',
    name: 'Ubuntu (WSL2)',
    description: 'Ubuntu on the Windows Subsystem for Linux.',
    category: 'linux',
    installer: 'wsl',
    ref: 'Ubuntu',
    sizeMb: 500,
    note: 'Requires a reboot on a machine where WSL was not enabled.',
  },
]
