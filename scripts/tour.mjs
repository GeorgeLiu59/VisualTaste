import { chromium } from 'playwright'

const base = process.argv[2] || 'http://localhost:4173/'
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
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.stack || e.message)))

const shot = (n) => page.screenshot({ path: `.preview/${n}.png` })
const act = (fn, ...a) =>
  page.evaluate(
    ([fnName, args]) => {
      const s = window.tasteStore.getState()
      s[fnName](...args)
    },
    [fn, a],
  )

await page.goto(base, { waitUntil: 'load' }).catch((e) => errors.push('GOTO: ' + e.message))
await page.waitForTimeout(3500)
await shot('01-empty')

await act('addAsset', 'user-rain-city')
await act('addAsset', 'user-concrete-corridor')
await act('addAsset', 'user-earth')
await page.waitForTimeout(2800)
await shot('02-nolan')

await act('addAsset', 'user-neon-diner')
await act('addAsset', 'text-retro-pulse')
await page.waitForTimeout(3000)
await shot('03-split')

await act('setMode', 'compare')
await act('setCompareTarget', 'nolan')
await page.waitForTimeout(2800)
await shot('04-compare')

await act('setMode', 'unfold')
await page.waitForTimeout(3400)
await shot('05-unfold')

await act('setMode', 'build')
await page.waitForTimeout(2000)
await shot('06-back')

await act('setShowFinale', true)
await page.waitForTimeout(1800)
await shot('07-finale')

console.log('ERRORS:', errors.length)
errors.slice(0, 40).forEach((e) => console.log(' -', e.slice(0, 200)))
await browser.close()
