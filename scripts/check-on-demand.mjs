// Prove the on-demand stylesheets are complete: for every docs example, record
// each element's computed style under the full stylesheet, swap in core.css +
// the example's on-demand files, and report any property that changed.
//   node scripts/check-on-demand.mjs [example-filter]
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('..', import.meta.url))
const examplesDir = join(root, 'playground/examples')
const filter = process.argv[2]
const examples = readdirSync(examplesDir, { recursive: true })
  .filter((f) => f.endsWith('.vue'))
  .map((f) => f.replace(/\.vue$/, ''))
  .filter((f) => !filter || f.includes(filter))
  .sort()

const server = await createServer({
  configFile: join(root, 'playground/vite.config.ts'),
  server: { host: '127.0.0.1', port: 5398, strictPort: false },
  logLevel: 'error',
})
await server.listen()
const base = server.resolvedUrls.local[0]
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })

const PROPS = [
  'display', 'position', 'color', 'background-color', 'background-image', 'border-top-color', 'border-top-width',
  'border-radius', 'padding-top', 'padding-left', 'margin-top', 'font-family', 'font-size', 'font-weight',
  'width', 'height', 'box-shadow', 'clip-path', 'gap', 'grid-template-columns', 'flex-direction', 'fill', 'stroke',
]

async function snapshot() {
  // Settle entrance animations; freeze infinite loops at their start.
  await page.evaluate(() =>
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {
        a.pause()
        a.currentTime = 0
      }
    }),
  )
  return page.evaluate((props) => {
    const out = []
    for (const el of document.querySelectorAll('body *:not(script):not(link):not(style)')) {
      const cs = getComputedStyle(el)
      out.push([...props.map((p) => cs.getPropertyValue(p)), `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`])
    }
    return out
  }, PROPS)
}

let failures = 0
try {
  for (const ex of examples) {
    // Twice — components imported in usage order and in reverse — since a
    // bundler loads each stylesheet once, at its first import.
    const diffs = []
    let used = []
    for (const reverse of [false, true]) {
      await page.goto(`${base}ondemand.html?ex=${ex}`, { timeout: 120_000 })
      await page.waitForTimeout(250)
      used = await page.evaluate(() => window.__used)
      await page.evaluate(() => window.__full())
      const full = await snapshot()
      const order = reverse ? [...used].reverse() : used
      await page.evaluate((names) => window.__lean(names), order)
      const lean = await snapshot()
      for (let i = 0; i < Math.min(full.length, lean.length); i++) {
        // Script-driven state (e.g. DecryptText scrambling) may have moved on between snapshots.
        if (full[i][PROPS.length] !== lean[i][PROPS.length]) continue
        PROPS.forEach((p, k) => {
          if (full[i][k] !== lean[i][k]) diffs.push(`${reverse ? '(reverse) ' : ''}${full[i][PROPS.length]} ${p}: ${full[i][k]} → ${lean[i][k]}`)
        })
      }
      if (full.length !== lean.length) diffs.push(`element count ${full.length} → ${lean.length}`)
      if (diffs.length) break
    }
    if (diffs.length) {
      failures++
      console.log(`✗ ${ex}  [${used.join(', ')}]\n   ${diffs.slice(0, 6).join('\n   ')}${diffs.length > 6 ? `\n   … ${diffs.length - 6} more` : ''}`)
    } else {
      console.log(`✓ ${ex}`)
    }
  }
} finally {
  await browser.close()
  await server.close()
}
console.log(`\n${examples.length - failures}/${examples.length} examples identical with on-demand styles`)
process.exit(failures ? 1 : 0)
