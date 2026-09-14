import {chromium} from '@playwright/test'
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),page=await browser.newPage(),errors=[]
// Button geometry measured before replacing font glyphs.
const baseline=[{"viewport": {"width": 1440, "height": 900}, "boxes": [{"text": "Navbar order", "width": 142.890625, "height": 44}, {"text": "Explore ingredients", "width": 52, "height": 52}, {"text": "View menu", "width": 196.703125, "height": 68}, {"text": "Order now", "width": 200.796875, "height": 64}, {"text": "Footer menu", "width": 41.953125, "height": 44}, {"text": "Footer locations", "width": 71.71875, "height": 44}, {"text": "Footer order", "width": 60.140625, "height": 44}, {"text": "Back to top", "width": 91.15625, "height": 14}]}, {"viewport": {"width": 390, "height": 844}, "boxes": [{"text": "Navbar order", "width": 78.890625, "height": 44}, {"text": "Explore ingredients", "width": 44, "height": 44}, {"text": "View menu", "width": 157.015625, "height": 60}, {"text": "Order now", "width": 160.734375, "height": 56}, {"text": "Footer menu", "width": 41.953125, "height": 44}, {"text": "Footer locations", "width": 71.71875, "height": 44}, {"text": "Footer order", "width": 60.140625, "height": 44}, {"text": "Back to top", "width": 91.15625, "height": 14}]}]
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
const comparisons=[]
for(const entry of baseline){
 await page.setViewportSize(entry.viewport);await page.goto('http://localhost:5173');await page.locator('.loader').waitFor({state:'detached'});await page.evaluate(()=>document.fonts.ready)
 const boxes=await page.locator('.nav-order,.round-link,.product .button,.cta .button,footer button').evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})))
 boxes.forEach((box,i)=>{const before=entry.boxes[i],dw=Math.abs(box.width-before.width),dh=Math.abs(box.height-before.height);comparisons.push({viewport:entry.viewport.width,control:before.text,widthChange:dw,heightChange:dh});if(dw>3||dh>1)errors.push({viewport:entry.viewport.width,control:before.text,before,box})})
 for(const p of [0,.20,.52,.98]){await page.evaluate(p=>scrollTo(0,(document.querySelector('.scroll-story').offsetHeight-innerHeight)*p),p);await page.waitForTimeout(300)
  const issues=await page.evaluate(()=>{const issues=[];if(/[\u2190-\u21ff\u2794-\u27bf\u27f0-\u27ff\u2b00-\u2bff]/u.test(document.body.textContent))issues.push('Unicode UI arrow');for(const svg of document.querySelectorAll('svg.arrow-icon')){if(svg.getAttribute('fill')!=='none'||svg.getAttribute('stroke')!=='currentColor'||svg.getAttribute('aria-hidden')!=='true')issues.push('Invalid SVG attributes');if(svg.getBoundingClientRect().width<=0)issues.push('Zero-size arrow')}if(document.documentElement.scrollWidth>innerWidth)issues.push('Overflow');return issues});errors.push(...issues)
  if(p===0||p===.52)await page.screenshot({path:`/tmp/burgr-arrows-${entry.viewport.width}-${p}.png`})
 }
 await page.getByRole('button',{name:'ORDER NOW',exact:true}).click();await page.getByRole('button',{name:'Close dialog'}).click()
 await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(300)
 await page.getByRole('button',{name:'BACK TO TOP',exact:true}).click();await page.waitForTimeout(700)
}
await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('.loader').waitFor({state:'detached'})
if(await page.locator('.video-motion-choice svg.arrow-icon').count()!==4)errors.push('Reduced-motion arrows')
await page.route('**/videos/*.mp4',route=>route.fulfill({status:200,contentType:'video/mp4',body:'invalid-test-media'}));await page.reload();await page.locator('.loader').waitFor({state:'detached'})
if(await page.locator('.video-file-note button svg.arrow-icon').count()!==4)errors.push('Retry arrows')
console.log(JSON.stringify({errors,comparisons},null,2));await browser.close();if(errors.length)process.exit(1)
