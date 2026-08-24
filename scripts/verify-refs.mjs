// Re-verifies every catalog ref against the live registry it points at, so
// the catalog cannot rot silently: winget ids get renamed, models get
// re-tagged, extensions get unpublished, font release URLs die. Run by the
// weekly workflow and on any change to data/catalog.ts.
//
// Runs under `node --experimental-strip-types`: data/catalog.ts only imports
// types, and type-only imports are erased, so the path alias never has to
// resolve at runtime. This keeps the checked data the real catalog rather
// than a copy that can drift.
//
// Exit code 0 = every ref verified. 1 = at least one rotten ref, all of them
// listed on stderr. WSL distro refs are skipped (no registry reachable from a
// Linux runner; the list is small and static).

import { catalog } from '../data/catalog.ts'

const CONCURRENCY = 5
const UA = 'loadout-ref-verifier (github.com/IntiCerda/loadout)'

/** GET with sane defaults; returns the Response, never throws on HTTP. */
async function get(url, headers = {}) {
  return fetch(url, {
    headers: { 'user-agent': UA, ...headers },
    redirect: 'follow',
  })
}

/**
 * winget has no anonymous query API, but every package is a directory in the
 * microsoft/winget-pkgs tree: manifests/<first letter>/<id segments>/. The
 * GitHub contents API 404s for a renamed or removed id.
 */
async function checkWinget(ref) {
  const segments = ref.split('.')
  const path = `manifests/${segments[0][0].toLowerCase()}/${segments.join('/')}`
  const headers = process.env.GITHUB_TOKEN
    ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}
  const res = await get(
    `https://api.github.com/repos/microsoft/winget-pkgs/contents/${path}`,
    headers,
  )
  return res.ok || `winget-pkgs tree has no ${path} (HTTP ${res.status})`
}

async function checkVscode(ref) {
  const res = await get(
    `https://marketplace.visualstudio.com/items?itemName=${ref}`,
  )
  return res.ok || `marketplace HTTP ${res.status}`
}

async function checkNpm(ref) {
  const res = await get(`https://registry.npmjs.org/${ref}`)
  return res.ok || `npm registry HTTP ${res.status}`
}

async function checkPipx(ref) {
  const res = await get(`https://pypi.org/pypi/${ref}/json`)
  return res.ok || `PyPI HTTP ${res.status}`
}

async function checkOllama(ref) {
  const [model, tag] = ref.split(':')
  const res = await get(
    `https://registry.ollama.ai/v2/library/${model}/manifests/${tag ?? 'latest'}`,
  )
  return res.ok || `ollama registry HTTP ${res.status}`
}

async function checkFont(ref) {
  const res = await fetch(ref, {
    method: 'HEAD',
    headers: { 'user-agent': UA },
    redirect: 'follow',
  })
  return res.ok || `zip HEAD HTTP ${res.status}`
}

/** Linux side: apt package page must actually name the package. */
async function checkApt(ref) {
  const res = await get(`https://packages.ubuntu.com/noble/${ref}`)
  if (!res.ok) return `packages.ubuntu.com HTTP ${res.status}`
  const body = await res.text()
  return (
    body.includes(`Package: ${ref}`) ||
    `packages.ubuntu.com/noble has no package named ${ref}`
  )
}

/** Linux side: install script must exist and still be a script. */
async function checkScript(ref) {
  const res = await get(ref)
  if (!res.ok) return `script HTTP ${res.status}`
  const body = await res.text()
  return body.startsWith('#!') || 'script no longer starts with #!'
}

const CHECKS = {
  winget: checkWinget,
  vscode: checkVscode,
  npm: checkNpm,
  pipx: checkPipx,
  ollama: checkOllama,
  font: checkFont,
}

/** One task per verifiable ref, main installer and linux ref alike. */
const tasks = []
for (const item of catalog) {
  const check = CHECKS[item.installer]
  if (check) {
    tasks.push({ label: `${item.id} [${item.installer}:${item.ref}]`, run: () => check(item.ref) })
  }
  if (item.linux) {
    const linuxCheck = item.linux.installer === 'apt' ? checkApt : checkScript
    tasks.push({
      label: `${item.id} [linux-${item.linux.installer}:${item.linux.ref}]`,
      run: () => linuxCheck(item.linux.ref),
    })
  }
}

const failures = []
let done = 0

async function worker() {
  while (tasks.length > 0) {
    const task = tasks.shift()
    try {
      const result = await task.run()
      if (result !== true) failures.push(`${task.label}: ${result}`)
    } catch (error) {
      failures.push(`${task.label}: ${error.message}`)
    }
    done += 1
  }
}

const total = tasks.length
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

console.log(`${done}/${total} refs checked, ${failures.length} rotten`)
if (failures.length > 0) {
  console.error('\nRotten refs:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
