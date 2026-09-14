import {chromium} from '@playwright/test'
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const page=await browser.newPage(),errors=[];let samples=0
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto('http://localhost:5173');await page.locator('.loader').waitFor({state:'detached'})
for(const size of [{width:1280,height:800},{width:1440,height:900},{width:1920,height:1080}]){
 await page.setViewportSize(size);await page.waitForTimeout(450)
 const result=await page.evaluate(async()=>{
  const scene=document.querySelector('.scene-build'),v=scene.querySelector('video'),distance=document.querySelector('.scroll-story').offsetHeight-innerHeight
  const from=Math.floor(distance*.43)-2,to=Math.ceil(distance*.47)+2,issues=[];let samples=0,minLeftCover=Infinity
  async function check(y){scrollTo(0,y);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const r=v.getBoundingClientRect(),w=scene.getBoundingClientRect();samples++;minLeftCover=Math.min(minLeftCover,w.left-r.left);if(r.left>w.left+.1||r.right<w.right-.1||r.top>w.top+.1||r.bottom<w.bottom-.1)issues.push({y,media:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},wrapper:{left:w.left,right:w.right,top:w.top,bottom:w.bottom}})}
  for(let y=from;y<=to;y++)await check(y)
  for(let y=to;y>=from;y--)await check(y)
  for(const p of [.50,.55,.575,.55,.50,.47,.43])await check(distance*p)
  scrollTo(0,distance*.55);return {issues,samples,minLeftCover}
 });samples+=result.samples;errors.push(...result.issues)
 await page.waitForTimeout(500);await page.screenshot({path:`/tmp/burgr-edge-${size.width}.png`})
 const product=await page.locator('.scene-build video').evaluate(v=>({time:v.currentTime,duration:v.duration,paused:v.paused,x:new DOMMatrix(getComputedStyle(v).transform).m41}))
 if(Math.abs(product.time-(product.duration-1/120))>.02||!product.paused||product.x<size.width*.17)errors.push({size,product})
}
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(450);await page.evaluate(()=>scrollTo(0,(document.querySelector('.scroll-story').offsetHeight-innerHeight)*.55));await page.waitForTimeout(500)
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))errors.push('Mobile overflow')
console.log(JSON.stringify({errors,samples,desktopWidths:[1280,1440,1920],pixelByPixelForwardAndReverse:true},null,2));await browser.close();if(errors.length)process.exit(1)
