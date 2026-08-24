import type { Pack } from '@/lib/types'

/**
 * The ten packs. The first five were seeded from the three hardcoded
 * scripts in `IntiCerda/Script-Dev-W10-W11`, which is where this catalog came
 * from; `data-ml`, `full-stack` and `terminal` landed with the full catalog;
 * `cloud-ops` and `systems` landed with the 123-item catalog expansion.
 *
 * Every id here must exist in `data/catalog.ts`. A pack referencing a missing
 * id silently ships a chip that can never read as applied, because `resolve`
 * drops unknown ids on the floor by design.
 *
 * Every pack also needs at least one id that no union of the other seven can
 * supply -- see the union-containment test in `lib/packs.test.ts` for what
 * happens when one does not. The distinguishing id is named in each comment so
 * the next person to edit a pack can see what they are about to remove.
 */
export const packs: Pack[] = [
  {
    // Distinguished by: ext-go
    slug: 'go-backend',
    name: 'Go Backend',
    description: 'Go, Git, VS Code and the tools to ship a service.',
    items: ['go', 'git', 'vscode', 'ext-go', 'ext-gitlens', 'font-jetbrains-mono'],
  },
  {
    // Distinguished by: ext-tailwind
    slug: 'react-frontend',
    name: 'React Frontend',
    description: 'Node LTS, VS Code, ESLint, Prettier and Tailwind support.',
    items: [
      'node',
      'git',
      'vscode',
      'ext-eslint',
      'ext-prettier',
      'ext-tailwind',
      'ext-error-lens',
      'ext-gitlens',
      'font-jetbrains-mono',
    ],
  },
  {
    // Distinguished by: ubuntu (kubectl/k9s/terraform/helm are shared with cloud-ops)
    slug: 'devops',
    name: 'DevOps',
    description: 'Docker Desktop on WSL2, the Kubernetes clients, Terraform, Git and an editor.',
    items: ['docker', 'ubuntu', 'kubectl', 'k9s', 'terraform', 'helm', 'git', 'vscode'],
  },
  {
    // Distinguished by: qwen2.5-coder-7b, ext-continue
    slug: 'ai-local',
    name: 'AI Local',
    description: 'Ollama with a coding model and an embedding model.',
    items: ['ollama', 'qwen2.5-coder-7b', 'nomic-embed-text', 'ext-continue'],
  },
  {
    // Distinguished by: claude-code, codex-cli, gemini-cli
    slug: 'ai-agents',
    name: 'AI Agents',
    description: 'Claude Code, Codex CLI and Gemini CLI in the terminal, on Node LTS.',
    items: ['node', 'claude-code', 'codex-cli', 'gemini-cli', 'git', 'vscode'],
  },
  {
    // Distinguished by: ruff, ext-jupyter
    slug: 'data-ml',
    name: 'Data / ML',
    description: 'Python with Ruff, Jupyter support and a local embedding model.',
    items: [
      'python',
      'ruff',
      'git',
      'vscode',
      'ext-python',
      'ext-jupyter',
      'ollama',
      'nomic-embed-text',
    ],
  },
  {
    // Distinguished by: ext-docker, font-fira-code
    slug: 'full-stack',
    name: 'Full Stack',
    description: 'Node and Python side by side, with Docker and the editor tooling.',
    items: [
      'node',
      'python',
      'git',
      'vscode',
      'docker',
      'ext-eslint',
      'ext-prettier',
      'ext-python',
      'ext-docker',
      'font-fira-code',
    ],
  },
  {
    // Distinguished by: windows-terminal, starship, fzf, and every Rust CLI below
    slug: 'terminal',
    name: 'Terminal',
    description: 'A Windows shell worth living in: modern CLIs, a prompt and a Nerd Font.',
    items: [
      'windows-terminal',
      'starship',
      'fzf',
      'git',
      'gh',
      'ripgrep',
      'fd',
      'bat',
      'eza',
      'jq',
      '7zip',
      'font-jetbrains-mono-nerd',
    ],
  },
  {
    // Distinguished by: aws-cli, azure-cli
    slug: 'cloud-ops',
    name: 'Cloud Ops',
    description: 'Terraform, the Kubernetes clients and both major cloud CLIs.',
    items: ['terraform', 'kubectl', 'helm', 'k9s', 'aws-cli', 'azure-cli', 'git'],
  },
  {
    // Distinguished by: rust, zig, llvm, ext-rust-analyzer
    slug: 'systems',
    name: 'Systems',
    description: 'Rust, Zig and LLVM with the editor tooling for native code.',
    items: [
      'rust',
      'zig',
      'llvm',
      'make',
      'git',
      'vscode',
      'ext-rust-analyzer',
      'ext-cpptools',
    ],
  },
]
