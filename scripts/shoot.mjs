import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5174/'
const out = process.argv[3] || '.preview/shot.png'
const wait = Number(process.argv[4] || 4500)

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--enable-unsafe-swiftshader',
  ],
})
const page = await browser.newPage({ viewport: { width: 1512, height: 945 } })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.stack || e.message)))

await page.goto(url, { waitUntil: 'load' }).catch((e) => errors.push('GOTO: ' + e.message))
await page.waitForTimeout(wait)
await page.screenshot({ path: out })

console.log('SHOT:', out)
console.log('ERRORS:', errors.length)
errors.slice(0, 40).forEach((e) => console.log(' -', e.slice(0, 300)))
await browser.close()
