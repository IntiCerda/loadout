import type { Pack } from '@/lib/types'

/**
 * The five launch packs, seeded from the three hardcoded scripts in
 * `IntiCerda/Script-Dev-W10-W11`, which is where this catalog came from.
 *
 * Every id here must exist in `data/catalog.ts`. A pack referencing a missing
 * id silently ships a chip that can never read as applied, because `resolve`
 * drops unknown ids on the floor by design.
 */
export const packs: Pack[] = [
  {
    slug: 'go-backend',
    name: 'Go Backend',
    description: 'Go, Git, VS Code and the tools to ship a service.',
    items: ['go', 'git', 'vscode', 'ext-gitlens', 'font-jetbrains-mono'],
  },
  {
    slug: 'react-frontend',
    name: 'React Frontend',
    description: 'Node LTS, VS Code, ESLint and Prettier.',
    items: [
      'node',
      'git',
      'vscode',
      'ext-eslint',
      'ext-prettier',
      'ext-gitlens',
      'font-jetbrains-mono',
    ],
  },
  {
    slug: 'devops',
    name: 'DevOps',
    description: 'Docker Desktop on WSL2, plus Git and an editor.',
    items: ['docker', 'ubuntu', 'git', 'vscode'],
  },
  {
    slug: 'ai-local',
    name: 'AI Local',
    description: 'Ollama with a coding model and an embedding model.',
    items: ['ollama', 'qwen2.5-coder-7b', 'nomic-embed-text', 'ext-continue'],
  },
  {
    slug: 'ai-agents',
    name: 'AI Agents',
    description: 'Claude Code in the terminal, on Node LTS.',
    items: ['node', 'claude-code', 'git', 'vscode'],
  },
]
