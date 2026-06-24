import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173/'
const wait = Number(process.argv[3] || 4500)

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

// add a few user references so the user lens has visible contents
await page.evaluate(() => {
  const store = window.tasteStore
  if (store) {
    store.getState().reset?.()
    const add = store.getState().addAsset
    ;['user-rain-city', 'user-neon-diner', 'text-retro-pulse', 'palette-neon-theater'].forEach((id) =>
      add(id),
    )
  }
})
await page.waitForTimeout(2500)
await page.screenshot({ path: '.preview/orbit_front.png' })

// simulate a click-drag orbit across the canvas
const box = { x: 756, y: 472 }
await page.mouse.move(box.x, box.y)
await page.mouse.down()
for (let i = 1; i <= 20; i++) {
  await page.mouse.move(box.x - i * 14, box.y - i * 3)
  await page.waitForTimeout(16)
}
await page.mouse.up()
await page.waitForTimeout(1200)
await page.screenshot({ path: '.preview/orbit_rotated.png' })

// drag the other way + down to look from above
await page.mouse.move(box.x, box.y)
await page.mouse.down()
for (let i = 1; i <= 24; i++) {
  await page.mouse.move(box.x + i * 14, box.y + i * 6)
  await page.waitForTimeout(16)
}
await page.mouse.up()
await page.waitForTimeout(1200)
await page.screenshot({ path: '.preview/orbit_rotated2.png' })

console.log('DONE')
console.log('ERRORS:', errors.length)
errors.slice(0, 40).forEach((e) => console.log(' -', e.slice(0, 300)))
await browser.close()
