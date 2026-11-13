// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import pkg from '../package.json'

const theme = readFileSync('src/styles/tailwind.css', 'utf8')
const tokens = readFileSync('src/styles/tokens.css', 'utf8')

const defined = new Set([...tokens.matchAll(/^\s*(--ml-[\w-]+):/gm)].map((m) => m[1]))
const mappings = [...theme.matchAll(/^\s*--([\w-]+): var\((--ml-[\w-]+)\);$/gm)].map((m) => ({ key: m[1], token: m[2] }))

// Tokens with no Tailwind theme key to map to; reach them with arbitrary values, e.g. duration-(--ml-dur).
const unmapped = /^--ml-(cut|dur|stagger|z-|drop-|glow-|rivet)/

describe('tailwind theme', () => {
  it('is exported from the package', () => {
    expect(pkg.exports['./tailwind.css']).toBe('./src/styles/tailwind.css')
    expect(pkg.files).toContain('src/styles')
  })

  it('only points at tokens that exist', () => {
    expect(mappings.length).toBeGreaterThan(100)
    for (const { token } of mappings) expect(defined, token).toContain(token)
  })

  it('maps every token that has a Tailwind theme key', () => {
    const mapped = new Set(mappings.map((m) => m.token))
    expect([...defined].filter((t) => !unmapped.test(t) && !mapped.has(t))).toEqual([])
  })

  it('names colour and background utilities after their token: --ml-<name> → *-ml-<name>', () => {
    const named = mappings.filter((m) => /^(color|background-image)-/.test(m.key))
    expect(named.length).toBeGreaterThan(90)
    for (const { key, token } of named) expect(key.replace(/^(color|background-image)-/, '--'), key).toBe(token)
  })

  it('declares no values of its own, so tokens.css stays the single source', () => {
    const body = theme.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(body).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|\d(px|rem|ms)\b/i)
    expect(body).toContain('@theme inline')
    expect(body).toContain("@custom-variant ml-light (&:where([data-ml-theme='light'], [data-ml-theme='light'] *));")
  })
})
