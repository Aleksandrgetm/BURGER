import {chromium} from '@playwright/test'
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[]
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.addInitScript(()=>{window.plays=0;document.addEventListener('play',()=>window.plays++,true)})
await page.goto('http://localhost:5173');await page.locator('.loader').waitFor({state:'detached'});await page.evaluate(()=>document.fonts.ready)
const paths=['hero','burger-build'],ranges=[[0,.16],[.26,.44]]
const metadata=await page.locator('video[src="/videos/hero.mp4"],video[src="/videos/burger-build.mp4"]').evaluateAll(vs=>vs.map(v=>({src:v.getAttribute('src'),duration:v.duration,width:v.videoWidth,height:v.videoHeight,time:v.currentTime})))
if(metadata.length!==2||metadata.some(v=>v.time!==0||!Number.isFinite(v.duration)))errors.push('Initial frames/metadata')
async function seek(p){await page.evaluate(p=>scrollTo(0,(document.querySelector('.scroll-story').offsetHeight-innerHeight)*p),p);await page.waitForTimeout(650);for(let i=0;i<2;i++){const v=await page.locator(`video[src="/videos/${paths[i]}.mp4"]`).evaluate(v=>({time:v.currentTime,duration:v.duration,paused:v.paused,seeking:v.seeking}));const expected=Math.max(0,Math.min(1,(p-ranges[i][0])/(ranges[i][1]-ranges[i][0])))*(v.duration-1/120);if(Math.abs(v.time-expected)>.05||!v.paused||v.seeking)errors.push({p,clip:paths[i],expected,...v})}if(Math.abs(await page.locator('.viewport').evaluate(v=>v.getBoundingClientRect().top))>1)errors.push(`Unpinned ${p}`)}
await page.screenshot({path:'/tmp/burgr-hero-first.png'})
const progress=[0,.04,.08,.12,.145,.16,.175,.20,.23,.26,.28,.34,.42,.5,.55,.7,.9,1]
for(const p of progress){await seek(p);if([.08,.20].includes(p))await page.screenshot({path:`/tmp/burgr-hero-${p}.png`})}
for(const p of progress.toReversed())await seek(p)
await seek(.08);const before=await page.locator('video[src]').evaluateAll(vs=>vs.map(v=>v.currentTime));await page.waitForTimeout(1000);const after=await page.locator('video[src]').evaluateAll(vs=>vs.map(v=>v.currentTime));if(before.some((v,i)=>v!==after[i]))errors.push('Freeze failed')
await seek(.12);if(await page.locator('.intro').evaluate(v=>+getComputedStyle(v).opacity)<.99)errors.push('Hero fades too early')
await seek(.22);if(await page.locator('.ingredients').evaluate(v=>+getComputedStyle(v).opacity)<.99)errors.push('Ingredients not visible')
await page.evaluate(async()=>{const height=document.querySelector('.scroll-story').offsetHeight-innerHeight;window.times=[];for(let i=0;i<=40;i++){scrollTo(0,height*.16*i/40);await new Promise(r=>setTimeout(r,45));window.times.push(document.querySelector('video[src="/videos/hero.mp4"]').currentTime)}})
const distinct=await page.evaluate(()=>new Set(window.times.map(t=>t.toFixed(2))).size);if(distinct<12)errors.push(`Slow scroll decoding ${distinct}`)
await page.setViewportSize({width:390,height:844});await seek(0);await page.screenshot({path:'/tmp/burgr-hero-mobile.png'});await seek(.08);await seek(.22);await seek(.38);await seek(.08);await seek(0)
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))errors.push('Mobile overflow')
if(await page.evaluate(()=>window.plays))errors.push('Playback occurred')
console.log(JSON.stringify({metadata,errors,slowScrollPositions:distinct,forwardAndReverse:true,freeze:true},null,2));await browser.close();if(errors.length)process.exit(1)
