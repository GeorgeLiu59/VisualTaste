import { chromium } from 'playwright'
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1512, height: 945 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.stack || e.message)))

await page.goto('http://localhost:4173/', { waitUntil: 'load' })
await page.waitForTimeout(2500)
await page.getByRole('button', { name: 'Play', exact: true }).click()

for (const [label, wait] of [
  ['w1', 6000],
  ['w2', 7000],
  ['w3', 7000],
  ['w4', 8000],
]) {
  await page.waitForTimeout(wait)
  await page.screenshot({ path: `.preview/walk-${label}.png` })
  const st = await page.evaluate(() => {
    const s = window.tasteStore.getState()
    return { active: s.walkthroughActive, n: s.activeAssetIds.length, mode: s.mode, finale: s.showFinale }
  })
  console.log(label, JSON.stringify(st))
}

console.log('ERRORS:', errors.length)
errors.slice(0, 20).forEach((e) => console.log(' -', e.slice(0, 160)))
await browser.close()
