// Regenerate the README images in docs/images/.
//   npm run screenshots
// Starts the playground dev server, opens playground/shots.html in the local
// Google Chrome (via playwright-core, no browser download) and captures each
// [data-shot] panel, plus a full-page shot of the docs site.
//
//   SHOTS=pickers,overlays npm run screenshots   only these panels (no docs-site shot)
//   CHROME_PATH=/path/to/chromium                use that browser instead of Google Chrome
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'

const outDir = fileURLToPath(new URL('../docs/images/', import.meta.url))
await mkdir(outDir, { recursive: true })

const server = await createServer({
  configFile: fileURLToPath(new URL('../playground/vite.config.ts', import.meta.url)),
  server: { host: '127.0.0.1', port: 5399, strictPort: false },
  logLevel: 'error',
})
await server.listen()
const base = server.resolvedUrls.local[0]

const only = process.env.SHOTS ? new Set(process.env.SHOTS.split(',').map((name) => name.trim())) : null
// Behind an HTTPS proxy (CI sandboxes), fetch web fonts through it but keep the local dev server direct.
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, proxy } : { channel: 'chrome', proxy },
)

async function ready(page) {
  await page.evaluate(() => document.fonts.ready)
  // Let entrance animations (paw pops, toast slide-ins) settle.
  await page.waitForTimeout(1200)
}

try {
  /* README panels */
  const page = await browser.newPage({ viewport: { width: 1320, height: 1000 }, deviceScaleFactor: 2 })
  await page.goto(`${base}shots.html`)
  await ready(page)

  // Live states worth showing, set up right before each capture so they
  // don't steal focus from one another.
  const setup = {
    forms: () => page.locator('[data-shot="forms"] .focus-me input').focus(),
    data: () => page.locator('[data-shot="data"] tbody tr').nth(2).hover(),
    navigation: async () => {
      await page.locator('[data-shot="navigation"] .open-me button').click()
      await page
        .locator('[data-shot="navigation"] .show-tip .ml-tooltip__bubble')
        .evaluate((el) => el.classList.add('ml-tooltip__bubble--visible'))
    },
    // Keyboard-open both popups: a pointer click on one would close the other.
    pickers: async () => {
      await page.locator('[data-shot="pickers"] .open-combo input').focus()
      await page.keyboard.press('ArrowDown')
      await page.locator('[data-shot="pickers"] .open-color .ml-colorpicker__trigger').focus()
      await page.keyboard.press('Enter')
    },
  }

  const shots = await page.locator('[data-shot]').evaluateAll((els) => els.map((el) => el.dataset.shot))
  for (const name of shots) {
    if (only && !only.has(name)) continue
    if (name === 'logo') {
      // Round mascot badge for the README header, on a transparent background.
      await page.evaluate(() => (document.body.style.background = 'transparent'))
      await page.locator('[data-shot="logo"]').screenshot({ path: `${outDir}logo.png`, omitBackground: true })
      await page.evaluate(() => (document.body.style.background = ''))
      console.log('docs/images/logo.png')
      continue
    }
    if (setup[name]) {
      await setup[name]()
      await page.waitForTimeout(700)
    }
    await page.locator(`[data-shot="${name}"]`).screenshot({ path: `${outDir}${name}.png` })
    console.log(`docs/images/${name}.png`)
  }

  /* Docs site */
  if (!only || only.has('docs-site')) {
    const docs = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
    await docs.goto(`${base}#/table`)
    await ready(docs)
    await docs.locator('.demo tbody tr').nth(1).hover()
    await docs.waitForTimeout(500)
    await docs.screenshot({ path: `${outDir}docs-site.png` })
    console.log('docs/images/docs-site.png')
  }
} finally {
  await browser.close()
  await server.close()
}
