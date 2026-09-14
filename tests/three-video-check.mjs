import {chromium} from '@playwright/test'
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[]
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.addInitScript(()=>{window.plays=0;document.addEventListener('play',()=>window.plays++,true)})
await page.goto('http://localhost:5173');await page.locator('.loader').waitFor({state:'detached'});await page.evaluate(()=>document.fonts.ready)
const clips=[['hero',0,.16],['burger-build',.26,.44],['sides',.61,.79]]
const metadata=await page.locator('video[src]:not([src="/videos/final.mp4"])').evaluateAll(vs=>vs.map(v=>({src:v.getAttribute('src'),duration:v.duration,width:v.videoWidth,height:v.videoHeight,time:v.currentTime})))
if(metadata.length!==3||metadata.some(v=>v.time!==0||!Number.isFinite(v.duration)))errors.push('Initial frame/metadata')
await page.evaluate(()=>window.assemblyElement=document.querySelector('video[src="/videos/burger-build.mp4"]'))
if(await page.locator('video[src="/videos/product.mp4"]').count()||await page.getByText('/public/videos/product.mp4',{exact:true}).count())errors.push('Product video placeholder remains')
if(await page.locator('main img,main svg:not(.arrow-icon),main canvas').count())errors.push('Old food graphics remain')
async function seek(p){await page.evaluate(p=>scrollTo(0,(document.querySelector('.scroll-story').offsetHeight-innerHeight)*p),p);await page.waitForTimeout(600);for(const [name,start,end]of clips){const v=await page.locator(`video[src="/videos/${name}.mp4"]`).evaluate(v=>({time:v.currentTime,duration:v.duration,paused:v.paused,seeking:v.seeking}));const expected=Math.max(0,Math.min(1,(p-start)/(end-start)))*(v.duration-1/120);if(Math.abs(v.time-expected)>.05||!v.paused||v.seeking)errors.push({p,name,expected,...v})}if(Math.abs(await page.locator('.viewport').evaluate(v=>v.getBoundingClientRect().top))>1)errors.push(`Unpinned ${p}`)}
const points=[0,.08,.16,.22,.28,.38,.5,.56,.60,.64,.68,.72,.76,.80,.82,.9,1]
for(const p of points){await seek(p);if([.56,.64,.72,.82].includes(p))await page.screenshot({path:`/tmp/burgr-sides-${p}.png`})}
await seek(.56)
const productState=await page.evaluate(()=>{const v=document.querySelector('.scene-build video');return {same:v===window.assemblyElement,time:v.currentTime,duration:v.duration,opacity:+getComputedStyle(document.querySelector('.scene-build')).opacity,text:+getComputedStyle(document.querySelector('.product')).opacity,x:new DOMMatrix(getComputedStyle(v).transform).m41}})
if(!productState.same||productState.opacity!==1||productState.text!==1||productState.x<100)errors.push({productState})
await page.getByRole('button',{name:'VIEW MENU',exact:false}).click();await page.getByRole('button',{name:'Add The Double Smash',exact:true}).click();await page.keyboard.press('Escape')
await seek(.59);if(Math.abs(await page.locator('.scene-build video').evaluate(v=>v.currentTime)-productState.time)>.001)errors.push('Product final frame did not hold')
for(const p of points.toReversed())await seek(p)
await seek(.64);if(await page.locator('.sides').evaluate(v=>+getComputedStyle(v).opacity)<.99)errors.push('Sides text not visible at start')
await seek(.72);const before=await page.locator('video[src]').evaluateAll(vs=>vs.map(v=>v.currentTime));await page.waitForTimeout(1000);const after=await page.locator('video[src]').evaluateAll(vs=>vs.map(v=>v.currentTime));if(before.some((v,i)=>v!==after[i]))errors.push('Freeze failed')
await page.evaluate(async()=>{const height=document.querySelector('.scroll-story').offsetHeight-innerHeight;window.times=[];for(let i=0;i<=40;i++){scrollTo(0,height*(.61+.18*i/40));await new Promise(r=>setTimeout(r,45));window.times.push(document.querySelector('video[src="/videos/sides.mp4"]').currentTime)}})
const distinct=await page.evaluate(()=>new Set(window.times.map(t=>t.toFixed(2))).size);if(distinct<12)errors.push(`Slow scroll stalled: ${distinct}`)
await seek(.82);await seek(.65)
await page.setViewportSize({width:390,height:844});await seek(.72);await page.screenshot({path:'/tmp/burgr-sides-mobile.png'});await seek(.64);await seek(.38);await seek(.08);await seek(0)
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))errors.push('Mobile overflow')
if(await page.evaluate(()=>window.plays))errors.push('Unexpected playback')
console.log(JSON.stringify({metadata,errors,slowScrollPositions:distinct,forwardReverseAndFreeze:true},null,2));await browser.close();if(errors.length)process.exit(1)
