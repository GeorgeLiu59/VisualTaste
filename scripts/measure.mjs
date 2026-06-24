import { chromium } from 'playwright'
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1512, height: 945 } })
await page.goto('http://localhost:4173/', { waitUntil: 'load' })
await page.waitForTimeout(1500)
const info = await page.evaluate(() => {
  const els = [...document.querySelectorAll('.glass-strong')]
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    panels: els.map((el) => {
      const r = el.getBoundingClientRect()
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
        children: el.children.length,
      }
    }),
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
