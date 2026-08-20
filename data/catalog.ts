import type { Item } from '@/lib/types'

/**
 * The launch catalog. Data only -- no logic lives here.
 *
 * Every entry becomes a command that runs in an elevated shell, so every `ref`
 * was resolved against the real registry before it landed:
 *
 *  - `winget`  -> `winget search --id <ref> --exact`
 *  - `vscode`  -> HTTP 200 on marketplace.visualstudio.com/items?itemName=<ref>
 *  - `npm`     -> `npm view <ref> version`
 *  - `pipx`    -> pypi.org/pypi/<ref>/json
 *  - `ollama`  -> registry.ollama.ai manifest for that exact tag
 *  - `font`    -> HTTP 200 on a HEAD request for the zip
 *  - `wsl`     -> present in `wsl --list --online`
 *
 * `claude-plugin` is still deliberately absent. `claude plugin install <name>`
 * is real -- verified against the installed CLI -- but it only resolves plugins
 * from marketplaces the machine has already added with
 * `claude plugin marketplace add <source>`, which a fresh machine has not. A
 * one-shot `claude plugin install x@y` therefore fails on every clean box, so
 * shipping one would be shipping a line that cannot work.
 *
 * `sizeMb` is an approximate download size. For `ollama` items it is not
 * approximate: it is the summed layer size of that exact tag's manifest, in
 * MiB, which is the unit `formatSize` divides by 1024. For `font` items it is
 * the measured `Content-Length` of the zip.
 *
 * Only `winget` items may carry a `linux` ref. An item without one is skipped
 * on the Linux target rather than guessed at, and named in the generated script
 * so the omission is visible.
 *
 * Every `linux` ref below was verified against Ubuntu 24.04 (noble):
 *
 *  - `apt`     -> published binary in noble on packages.ubuntu.com, confirmed
 *                 against the Launchpad API for the exact version and component
 *  - `script`  -> HTTP 200 and a `#!` first line, read to confirm the script
 *                 installs the product this item names and not a sibling one
 *
 * Docker Desktop was not running, so no package was proved inside a real
 * `ubuntu:24.04` container. The evidence above is archive metadata, which
 * proves a package exists and is installable in principle, not that a specific
 * `apt-get install` run succeeds end to end.
 *
 * Items with no Linux target carry a comment saying why. There are two shapes:
 * no Linux product exists at all, or one exists but ships only as an AppImage,
 * a `.deb` or a tarball -- none of which `script_install` can consume, since it
 * runs the downloaded file with `bash`.
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
    id: 'java',
    name: 'Java 21 (Temurin)',
    description: 'Eclipse Temurin JDK 21, the current long-term-support Java.',
    category: 'languages',
    installer: 'winget',
    ref: 'EclipseAdoptium.Temurin.21.JDK',
    // Temurin ships no apt package and no install script -- only its own repo.
    // OpenJDK 21 is the same Java 21 LTS from a different build, and it is in
    // noble main.
    linux: { installer: 'apt', ref: 'openjdk-21-jdk' },
    sizeMb: 190,
  },
  {
    id: 'rust',
    name: 'Rust',
    description: 'The Rust toolchain, managed by rustup.',
    category: 'languages',
    installer: 'winget',
    ref: 'Rustlang.Rustup',
    // apt, not https://sh.rustup.rs, even though that script is official:
    // rustup-init asks for confirmation and `script_install` runs it with
    // stdin on /dev/null, so it would abort rather than install. `rust-all`
    // pulls rustc and cargo together and needs no terminal.
    linux: { installer: 'apt', ref: 'rust-all' },
    sizeMb: 300,
    note: 'Needs the MSVC build tools to link on Windows.',
  },
  {
    id: 'dotnet',
    name: '.NET SDK 9',
    description: 'The .NET SDK and runtime for C# and F#.',
    category: 'languages',
    installer: 'winget',
    ref: 'Microsoft.DotNet.SDK.9',
    // 8.0, not 9.0: noble publishes no dotnet-sdk-9.0 in any pocket. The
    // alternative, Microsoft's dotnet-install.sh, unpacks into $HOME and adds
    // nothing to PATH -- run as root that is /root/.dotnet, which the desktop
    // user never sees. A supported LTS that works beats a matching version
    // number that does not.
    linux: { installer: 'apt', ref: 'dotnet-sdk-8.0' },
    sizeMb: 280,
  },
  {
    id: 'deno',
    name: 'Deno',
    description:
      'Secure TypeScript runtime with a batteries-included toolchain.',
    category: 'languages',
    installer: 'winget',
    ref: 'DenoLand.Deno',
    // No apt package in noble. The vendor script is the documented Linux
    // install and is non-interactive.
    linux: { installer: 'script', ref: 'https://deno.land/install.sh' },
    sizeMb: 40,
  },
  {
    id: 'bun',
    name: 'Bun',
    description: 'Fast JavaScript runtime, bundler and package manager.',
    category: 'languages',
    installer: 'winget',
    ref: 'Oven-sh.Bun',
    // No apt package in noble. This is the install line from bun's own docs.
    linux: { installer: 'script', ref: 'https://bun.sh/install' },
    sizeMb: 55,
  },

  // --- editors ---
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    description: 'Microsoft code editor. Required by every extension.',
    category: 'editors',
    installer: 'winget',
    ref: 'Microsoft.VisualStudioCode',
    // No linux target. `code` is not in noble, and Microsoft publishes no
    // install script either -- only a .deb download and an apt repo to add by
    // hand. Neither fits `apt` or `script`, and `script_install` runs what it
    // downloads with `bash`, so a .deb there would be piped into a shell.
    // Named as unavailable rather than emitted broken.
    sizeMb: 350,
  },
  {
    id: 'neovim',
    name: 'Neovim',
    description: 'Modal terminal editor configured in Lua.',
    category: 'editors',
    installer: 'winget',
    ref: 'Neovim.Neovim',
    linux: { installer: 'apt', ref: 'neovim' },
    sizeMb: 35,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'VS Code fork built around an AI pair programmer.',
    category: 'editors',
    installer: 'winget',
    ref: 'Anysphere.Cursor',
    // No linux target, though a Linux build exists. The editor ships as an
    // AppImage, which `script_install` cannot run. https://cursor.com/install
    // is a real shell script but it installs Cursor Agent, the terminal CLI --
    // a different product from this item. Pointing at it would install
    // something the user did not pick.
    sizeMb: 420,
  },
  {
    id: 'zed',
    name: 'Zed',
    description: 'High-performance collaborative editor written in Rust.',
    category: 'editors',
    installer: 'winget',
    ref: 'ZedIndustries.Zed',
    // Not in noble, but Zed's documented Linux install is a shell script.
    linux: { installer: 'script', ref: 'https://zed.dev/install.sh' },
    sizeMb: 180,
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
  {
    id: 'gh',
    name: 'GitHub CLI',
    description: 'Pull requests, issues and releases from the terminal.',
    category: 'tools',
    installer: 'winget',
    ref: 'GitHub.cli',
    // In noble universe. GitHub's own apt repo carries a newer gh, but adding
    // a third-party repo is a mechanism this generator does not have.
    linux: { installer: 'apt', ref: 'gh' },
    sizeMb: 30,
  },
  {
    id: 'windows-terminal',
    name: 'Windows Terminal',
    description: 'Tabbed terminal host with GPU-accelerated rendering.',
    category: 'tools',
    installer: 'winget',
    ref: 'Microsoft.WindowsTerminal',
    // No linux target: a Windows console host has no Linux counterpart.
    sizeMb: 120,
  },
  {
    id: 'powertoys',
    name: 'PowerToys',
    description:
      'Window management, a launcher and a colour picker for Windows.',
    category: 'tools',
    installer: 'winget',
    ref: 'Microsoft.PowerToys',
    // No linux target: a bundle of Windows shell extensions.
    sizeMb: 250,
  },
  {
    id: 'jq',
    name: 'jq',
    description: 'Command-line JSON processor.',
    category: 'tools',
    installer: 'winget',
    ref: 'jqlang.jq',
    linux: { installer: 'apt', ref: 'jq' },
    sizeMb: 3,
  },
  {
    id: 'make',
    name: 'GNU Make',
    description: 'The build tool every Makefile in the wild expects.',
    category: 'tools',
    installer: 'winget',
    ref: 'ezwinports.make',
    // `make`, not `build-essential`. Both are in noble main and both provide
    // make, but build-essential also pulls gcc, g++, libc6-dev and dpkg-dev --
    // a compiler toolchain nobody asked for by ticking "GNU Make".
    linux: { installer: 'apt', ref: 'make' },
    sizeMb: 2,
  },
  {
    id: 'ripgrep',
    name: 'ripgrep',
    description: 'Recursive regex search that respects gitignore.',
    category: 'tools',
    installer: 'winget',
    ref: 'BurntSushi.ripgrep.MSVC',
    linux: { installer: 'apt', ref: 'ripgrep' },
    sizeMb: 5,
  },
  {
    id: 'fd',
    logoOnLight: true,
    name: 'fd',
    description: 'Fast, ergonomic replacement for find.',
    category: 'tools',
    installer: 'winget',
    ref: 'sharkdp.fd',
    // `fd-find`, not `fd` -- noble publishes no package called `fd`. The
    // binary it installs is `fdfind`, renamed away from a prior clash.
    linux: { installer: 'apt', ref: 'fd-find' },
    sizeMb: 4,
  },
  {
    id: 'bat',
    name: 'bat',
    description: 'A cat clone with syntax highlighting and git integration.',
    category: 'tools',
    installer: 'winget',
    ref: 'sharkdp.bat',
    // Package is `bat`; the binary it installs is `batcat`, renamed away from
    // the `bacula-console-qt` clash.
    linux: { installer: 'apt', ref: 'bat' },
    sizeMb: 5,
  },
  {
    id: 'eza',
    name: 'eza',
    description: 'Modern ls with colours, icons and a tree view.',
    category: 'tools',
    installer: 'winget',
    ref: 'eza-community.eza',
    linux: { installer: 'apt', ref: 'eza' },
    sizeMb: 3,
  },
  {
    id: '7zip',
    name: '7-Zip',
    description: 'Archiver that opens every format you will be handed.',
    category: 'tools',
    installer: 'winget',
    ref: '7zip.7zip',
    // `7zip`, and on 24.04 that is the real package: noble carries the
    // upstream 7-Zip 23.01, while `p7zip-full` is now only a transitional stub
    // pointing at it. The older advice to install `p7zip-full` was true for
    // 22.04 and is stale here.
    linux: { installer: 'apt', ref: '7zip' },
    sizeMb: 2,
  },
  {
    id: 'bruno',
    name: 'Bruno',
    description: 'Offline API client whose collections live in your repository.',
    category: 'tools',
    installer: 'winget',
    ref: 'Bruno.Bruno',
    // No linux target, though a Linux build exists. Bruno ships .deb, .rpm,
    // snap and AppImage, and publishes no install script -- nothing here fits
    // `apt` or `script_install`.
    sizeMb: 130,
  },
  {
    id: 'ruff',
    name: 'Ruff',
    description: 'Fast Python linter and formatter.',
    category: 'tools',
    installer: 'pipx',
    ref: 'ruff',
    requires: ['python'],
    sizeMb: 25,
  },

  // --- containers ---
  {
    id: 'docker',
    name: 'Docker Desktop',
    description: 'Containers on the WSL2 backend.',
    category: 'containers',
    installer: 'winget',
    ref: 'Docker.DockerDesktop',
    // No linux target: Docker Desktop is a Windows/macOS product, and this
    // item requires the WSL distro. `docker.io` in noble and get.docker.com
    // both install Docker Engine, which is a different thing from the desktop
    // app this item names.
    requires: ['ubuntu'],
    sizeMb: 1400,
    note: 'Needs virtualization enabled in BIOS.',
  },
  {
    id: 'kubectl',
    name: 'kubectl',
    description: 'The Kubernetes command-line client.',
    category: 'containers',
    installer: 'winget',
    ref: 'Kubernetes.kubectl',
    // No linux target, though kubectl is a first-class Linux binary. It is in
    // no noble pocket, and upstream ships a bare binary from dl.k8s.io plus a
    // third-party apt repo at pkgs.k8s.io -- there is no install script to
    // point at. A ref here would have to be invented.
    sizeMb: 50,
  },
  {
    id: 'k9s',
    logoOnLight: true,
    name: 'k9s',
    description: 'Terminal UI for browsing and debugging a Kubernetes cluster.',
    category: 'containers',
    installer: 'winget',
    ref: 'Derailed.k9s',
    // No linux target: not in noble, and upstream ships only .deb, .rpm and
    // tarball release assets -- no install script.
    requires: ['kubectl'],
    sizeMb: 30,
  },

  // --- ai apps ---
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run local LLMs. Required by every local model.',
    category: 'ai-apps',
    installer: 'winget',
    ref: 'Ollama.Ollama',
    // No apt package exists at all; this is the vendor's own install script.
    linux: { installer: 'script', ref: 'https://ollama.com/install.sh' },
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
  {
    id: 'codex-cli',
    name: 'Codex CLI',
    description: 'OpenAI coding agent in the terminal.',
    category: 'ai-apps',
    installer: 'npm',
    ref: '@openai/codex',
    requires: ['node'],
    sizeMb: 80,
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    description: 'Google coding agent in the terminal.',
    category: 'ai-apps',
    installer: 'npm',
    ref: '@google/gemini-cli',
    requires: ['node'],
    sizeMb: 70,
  },
  {
    id: 'aider',
    name: 'Aider',
    description: 'Pair programming with an LLM against your git history.',
    category: 'ai-apps',
    installer: 'pipx',
    ref: 'aider-chat',
    requires: ['python'],
    sizeMb: 120,
  },
  {
    id: 'lm-studio',
    name: 'LM Studio',
    description: 'Desktop app for running and serving local models.',
    category: 'ai-apps',
    installer: 'winget',
    ref: 'ElementLabs.LMStudio',
    // No linux target, though a Linux build exists. The desktop app ships as
    // an AppImage. https://lmstudio.ai/install.sh is a real shell script but
    // it installs the headless `llmster` daemon into $HOME -- a different
    // product from the desktop app this item names, and under a root-run
    // script it would land in /root.
    sizeMb: 550,
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
    provider: 'Alibaba',
    sizeMb: 4466,
  },
  {
    id: 'qwen2.5-coder-14b',
    name: 'Qwen2.5 Coder 14B',
    description: 'The larger Qwen coder, for machines with the VRAM to spare.',
    category: 'ai-models',
    installer: 'ollama',
    ref: 'qwen2.5-coder:14b',
    requires: ['ollama'],
    provider: 'Alibaba',
    sizeMb: 8572,
  },
  {
    id: 'llama3.1-8b',
    name: 'Llama 3.1 8B',
    description: 'Meta general-purpose model with a long context window.',
    category: 'ai-models',
    installer: 'ollama',
    ref: 'llama3.1:8b',
    requires: ['ollama'],
    provider: 'Meta',
    sizeMb: 4693,
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    description: 'Compact general model that runs on modest hardware.',
    category: 'ai-models',
    installer: 'ollama',
    ref: 'mistral:7b',
    requires: ['ollama'],
    provider: 'Mistral',
    sizeMb: 4170,
  },
  {
    id: 'granite3.3-8b',
    name: 'Granite 3.3 8B',
    description: 'IBM instruction-tuned model with a permissive licence.',
    category: 'ai-models',
    installer: 'ollama',
    ref: 'granite3.3:8b',
    requires: ['ollama'],
    provider: 'IBM',
    sizeMb: 4714,
  },
  {
    id: 'gemma2-9b',
    name: 'Gemma 2 9B',
    description: 'Google open model tuned for instruction following.',
    category: 'ai-models',
    installer: 'ollama',
    ref: 'gemma2:9b',
    requires: ['ollama'],
    provider: 'Google',
    sizeMb: 5191,
  },
  {
    id: 'deepseek-coder-v2-16b',
    name: 'DeepSeek Coder V2 16B',
    description: 'Mixture-of-experts coding model with broad language coverage.',
    category: 'ai-models',
    installer: 'ollama',
    ref: 'deepseek-coder-v2:16b',
    requires: ['ollama'],
    provider: 'DeepSeek',
    sizeMb: 8493,
  },
  {
    id: 'nomic-embed-text',
    name: 'Nomic Embed Text',
    description: 'Embedding model for local RAG.',
    category: 'ai-models',
    installer: 'ollama',
    ref: 'nomic-embed-text',
    requires: ['ollama'],
    provider: 'Nomic',
    sizeMb: 262,
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
  {
    id: 'ext-python',
    name: 'Python',
    description:
      'Python language support, debugging and environment selection.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'ms-python.python',
    requires: ['vscode'],
    sizeMb: 45,
  },
  {
    id: 'ext-docker',
    name: 'Docker',
    description: 'Dockerfile and compose editing with container management.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'ms-azuretools.vscode-docker',
    requires: ['vscode'],
    sizeMb: 20,
  },
  {
    id: 'ext-go',
    name: 'Go',
    description: 'Go language server, debugging and test running in VS Code.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'golang.go',
    requires: ['vscode'],
    sizeMb: 18,
  },
  {
    id: 'ext-rust-analyzer',
    name: 'rust-analyzer',
    description: 'The official Rust language server for VS Code.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'rust-lang.rust-analyzer',
    requires: ['vscode'],
    sizeMb: 40,
  },
  {
    id: 'ext-mongodb',
    name: 'MongoDB',
    description: 'Browse collections and run playgrounds against MongoDB.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'mongodb.mongodb-vscode',
    requires: ['vscode'],
    sizeMb: 25,
  },
  {
    id: 'ext-rest-client',
    name: 'REST Client',
    description: 'Send HTTP requests from a plain .http file.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'humao.rest-client',
    requires: ['vscode'],
    sizeMb: 8,
  },
  {
    id: 'ext-editorconfig',
    name: 'EditorConfig',
    description: 'Apply the repository .editorconfig to the editor.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'EditorConfig.EditorConfig',
    requires: ['vscode'],
    sizeMb: 2,
  },
  {
    id: 'ext-error-lens',
    name: 'Error Lens',
    description: 'Render diagnostics inline instead of on hover.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'usernamehw.errorlens',
    requires: ['vscode'],
    sizeMb: 3,
  },
  {
    id: 'ext-tailwind',
    name: 'Tailwind CSS IntelliSense',
    description: 'Class completion and linting for Tailwind CSS.',
    category: 'extensions',
    installer: 'vscode',
    ref: 'bradlc.vscode-tailwindcss',
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
    sizeMb: 6,
  },
  {
    id: 'font-fira-code',
    name: 'Fira Code',
    description: 'Monospace typeface known for its ligature set.',
    category: 'fonts',
    installer: 'font',
    ref: 'https://github.com/tonsky/FiraCode/releases/download/6.2/Fira_Code_v6.2.zip',
    sizeMb: 3,
  },
  {
    id: 'font-cascadia-code',
    name: 'Cascadia Code',
    description: 'The Microsoft terminal typeface, ligatures included.',
    category: 'fonts',
    installer: 'font',
    ref: 'https://github.com/microsoft/cascadia-code/releases/download/v2407.24/CascadiaCode-2407.24.zip',
    sizeMb: 144,
  },
  {
    id: 'font-jetbrains-mono-nerd',
    name: 'JetBrainsMono Nerd Font',
    description: 'JetBrains Mono patched with the Nerd Fonts icon set.',
    category: 'fonts',
    installer: 'font',
    ref: 'https://github.com/ryanoasis/nerd-fonts/releases/download/v3.4.0/JetBrainsMono.zip',
    sizeMb: 124,
    note: 'Supplies the glyphs that starship, eza and lazygit render.',
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
  {
    id: 'debian',
    name: 'Debian (WSL2)',
    description: 'Debian GNU/Linux on the Windows Subsystem for Linux.',
    category: 'linux',
    installer: 'wsl',
    ref: 'Debian',
    sizeMb: 420,
  },
  {
    id: 'archlinux',
    name: 'Arch Linux (WSL2)',
    description: 'Arch Linux on the Windows Subsystem for Linux.',
    category: 'linux',
    installer: 'wsl',
    ref: 'archlinux',
    sizeMb: 350,
  },
]
