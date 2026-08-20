import type { Pack } from '@/lib/types'

/**
 * The eight launch packs. The first five were seeded from the three hardcoded
 * scripts in `IntiCerda/Script-Dev-W10-W11`, which is where this catalog came
 * from; `data-ml`, `full-stack` and `terminal` landed with the full catalog.
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
      'ext-gitlens',
      'font-jetbrains-mono',
    ],
  },
  {
    // Distinguished by: kubectl, k9s
    slug: 'devops',
    name: 'DevOps',
    description: 'Docker Desktop on WSL2, the Kubernetes clients, Git and an editor.',
    items: ['docker', 'ubuntu', 'kubectl', 'k9s', 'git', 'vscode'],
  },
  {
    // Distinguished by: qwen2.5-coder-7b, ext-continue
    slug: 'ai-local',
    name: 'AI Local',
    description: 'Ollama with a coding model and an embedding model.',
    items: ['ollama', 'qwen2.5-coder-7b', 'nomic-embed-text', 'ext-continue'],
  },
  {
    // Distinguished by: claude-code, codex-cli
    slug: 'ai-agents',
    name: 'AI Agents',
    description: 'Claude Code and Codex CLI in the terminal, on Node LTS.',
    items: ['node', 'claude-code', 'codex-cli', 'git', 'vscode'],
  },
  {
    // Distinguished by: ruff
    slug: 'data-ml',
    name: 'Data / ML',
    description: 'Python with Ruff, the VS Code tooling and a local embedding model.',
    items: [
      'python',
      'ruff',
      'git',
      'vscode',
      'ext-python',
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
    // Distinguished by: windows-terminal, and every Rust CLI below it
    slug: 'terminal',
    name: 'Terminal',
    description: 'A Windows shell worth living in: modern CLIs and a Nerd Font.',
    items: [
      'windows-terminal',
      'powertoys',
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
]
