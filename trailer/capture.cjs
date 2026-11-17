// Captura la demo en un iPhone simulado (390x844 @3x) para el trailer.
const { chromium } = require('playwright')
const BASE = process.argv[2] || 'http://localhost:4181/'
const OUT = __dirname + '/captures/'
const HIDE = '.demo-bar,.ad-badge{display:none!important}'
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  await p.goto(BASE)
  await p.evaluate(() => localStorage.clear())
  await p.reload(); await p.waitForTimeout(600)
  await p.click('text=Entrar como fan'); await p.waitForTimeout(400)
  // nombres del ranking para el trailer (en orden de puntos: 1º a 4º)
  await p.evaluate((names) => {
    const key = 'santinococf-demo-v1'
    const db = JSON.parse(localStorage.getItem(key))
    for (const [id, username] of Object.entries(names)) {
      const prof = db.profiles.find((x) => x.id === id)
      if (prof) prof.username = username
    }
    localStorage.setItem(key, JSON.stringify(db))
  }, { u1: 'sitesoyfranco_', u2: 'fakkuu_martinezz', u3: 'thommyclose', u4: 'chino_cochino' })
  await p.reload(); await p.waitForTimeout(600)
  const go = async (hash, name, prep) => {
    await p.goto(BASE + '#' + hash); await p.addStyleTag({ content: HIDE }); await p.waitForTimeout(1300)
    if (prep) await prep()
    // fijos fuera para la captura larga
    await p.addStyleTag({ content: '.bottom-nav,.topbar{visibility:hidden!important}' })
    await p.screenshot({ path: OUT + name + '.png', fullPage: true })
    await p.addStyleTag({ content: '.bottom-nav,.topbar{visibility:visible!important}' })
  }
  await go('/', 'home')
  await p.locator('.topbar').screenshot({ path: OUT + 'topbar.png' })
  await p.locator('.bottom-nav').screenshot({ path: OUT + 'bottomnav.png', omitBackground: true })
  await go('/novedades', 'novedades')
  await go('/chisme', 'chisme', async () => { await p.fill('textarea', 'Lo que pasó el sábado en la previa no lo sabe nadie. Todavía.') })
  await go('/muro', 'muro')
  await go('/publicidad', 'publicidad')
  await go('/ranking', 'ranking')
  await go('/casting', 'casting', async () => { await p.fill('input[placeholder="¿Cómo se llama?"]', 'Valentina') })
  // menú "+" abierto (vista de pantalla, no larga)
  await p.goto(BASE + '#/'); await p.addStyleTag({ content: HIDE }); await p.waitForTimeout(900)
  await p.click('.bn-add'); await p.waitForTimeout(800)
  await p.screenshot({ path: OUT + 'menu.png' })
  await b.close()
})()
