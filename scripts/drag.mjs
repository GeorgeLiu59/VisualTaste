import { chromium } from 'playwright'
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1512, height: 945 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.stack || e.message)))

await page.goto('http://localhost:4173/', { waitUntil: 'load' })
await page.waitForTimeout(2500)

const box = await page.locator('[data-asset="user-rain-city"]').boundingBox()
const before = await page.evaluate(() => window.tasteStore.getState().activeAssetIds.length)

// real pointer drag from tray card up into the scene
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
for (let i = 1; i <= 12; i++) {
  await page.mouse.move(box.x + box.width / 2 - i * 6, box.y + box.height / 2 - i * 30)
  await page.waitForTimeout(16)
}
await page.mouse.move(700, 380)
await page.waitForTimeout(200)
await page.screenshot({ path: '.preview/drag-mid.png' })
await page.mouse.up()

// the "liquid drop" beat (~3.2s): hold (pre-reach) → eased stretch-migrate → settle.
await page.waitForTimeout(280) // ~hold: body parked, glass pre-reaching toward the new tile
await page.screenshot({ path: '.preview/drag-hold.png' })
const holdPhase = await page.evaluate(() => window.tasteStore.getState().absorbPhase)

await page.waitForTimeout(1300) // ~mid-migrate: peak teardrop stretch, body travelling
const migA = await page.evaluate(() => window.tasteStore.getState())
await page.screenshot({ path: '.preview/drag-migrate.png' })

await page.waitForTimeout(1800) // settle
const after = await page.evaluate(() => window.tasteStore.getState().activeAssetIds)
console.log('before:', before, 'after:', JSON.stringify(after))
console.log('holdPhase:', holdPhase, '(expect "hold")')
console.log('migratePhase:', migA.absorbPhase, '(expect "migrate")')
console.log('ERRORS:', errors.length)
errors.slice(0, 10).forEach((e) => console.log(' -', e.slice(0, 160)))
await browser.close()
