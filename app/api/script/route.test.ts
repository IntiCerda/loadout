import { describe, it, expect } from 'vitest'
import { GET } from './route'

const call = (query: string) => GET(new Request(`https://pila.test/api/script${query}`))

describe('GET /api/script', () => {
  it('serves text/plain so irm | iex works', async () => {
    const res = await call('?p=git')
    expect(res.headers.get('content-type')).toContain('text/plain')
  })

  it('includes the resolved items in the body', async () => {
    const body = await (await call('?p=ext-gitlens')).text()
    expect(body).toContain('eamodio.gitlens')
    expect(body).toContain('Microsoft.VisualStudioCode')
  })

  it('ignores unknown ids instead of failing', async () => {
    const res = await call('?p=git,not-a-real-id')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Git.Git')
  })

  it('never reflects query input into the script body', async () => {
    const body = await (await call('?p=git,evil-payload-string')).text()
    expect(body).not.toContain('evil-payload-string')
  })

  it('serves an attachment when download=1', async () => {
    const res = await call('?p=git&download=1')
    expect(res.headers.get('content-disposition')).toContain('attachment')
    expect(res.headers.get('content-disposition')).toContain('.ps1')
  })

  it('does not set an attachment header by default', async () => {
    expect((await call('?p=git')).headers.get('content-disposition')).toBeNull()
  })

  it('derives the share url from the request, not from a build-time constant', async () => {
    const body = await (await call('?p=git')).text()
    // SITE_URL is inlined into the client bundle at build time and read at
    // runtime here; deriving from the request is what keeps the previewed and
    // the delivered script byte-identical after an env change or on a preview
    // deployment.
    expect(body).toContain('https://pila.test/?p=git')
  })

  it('merges repeated p parameters instead of letting the first one win', async () => {
    const body = await (await call('?p=&p=git')).text()
    expect(body).toContain('Git.Git')
    expect(body).not.toContain('Nothing selected')
  })

  it('returns a valid script for an empty selection', async () => {
    const res = await call('')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Nothing selected')
  })
})
