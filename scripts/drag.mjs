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

// staged "liquid drop" (~4.2s): land → sit (~1s) → tile rides to border → stretch+move → settle.
await page.waitForTimeout(600) // ~sit: new tile landed, bubble parked, no stretch
await page.screenshot({ path: '.preview/drag-sit.png' })
const sitPhase = await page.evaluate(() => window.tasteStore.getState().absorbPhase)

await page.waitForTimeout(700) // ~lead: driver tile riding out to the border
await page.screenshot({ path: '.preview/drag-lead.png' })

await page.waitForTimeout(1300) // ~mid-migrate: peak teardrop stretch, body travelling
const migA = await page.evaluate(() => window.tasteStore.getState())
await page.screenshot({ path: '.preview/drag-migrate.png' })

await page.waitForTimeout(1800) // settle
const after = await page.evaluate(() => window.tasteStore.getState().activeAssetIds)
console.log('before:', before, 'after:', JSON.stringify(after))
console.log('sitPhase:', sitPhase, '(expect "hold")')
console.log('migratePhase:', migA.absorbPhase, '(expect "migrate")')
console.log('ERRORS:', errors.length)
errors.slice(0, 10).forEach((e) => console.log(' -', e.slice(0, 160)))
await browser.close()
