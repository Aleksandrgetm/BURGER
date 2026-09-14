import {chromium} from '@playwright/test'
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[]
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto('http://localhost:5173');await page.locator('.loader').waitFor({state:'detached'})
const video=page.locator('video[src="/videos/burger-build.mp4"]')
await video.waitFor({state:"attached"});await page.waitForFunction(()=>document.querySelector('video[src="/videos/burger-build.mp4"]').readyState>=2)
const metadata=await video.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,src:v.currentSrc}))
await video.evaluate(v=>{window.plays=0;window.seeks=0;v.addEventListener('play',()=>window.plays++);v.addEventListener('seeked',()=>window.seeks++)})
async function seek(p){await page.evaluate(p=>scrollTo(0,(document.querySelector('.scroll-story').offsetHeight-innerHeight)*p),p);await page.waitForTimeout(600);const state=await video.evaluate(v=>({time:v.currentTime,paused:v.paused,seeking:v.seeking}));const expected=Math.max(0,Math.min(1,(p-.26)/.18))*(metadata.duration-1/120);if(Math.abs(state.time-expected)>.05||!state.paused||state.seeking)errors.push({p,expected,...state});if(Math.abs(await page.locator('.viewport').evaluate(v=>v.getBoundingClientRect().top))>1)errors.push(`Unpinned ${p}`);return state.time}
for(const p of [.25,.28,.32,.38,.44,.49,.5,.54,.57,.49,.44,.38,.32,.28]){await seek(p);if([.32,.44,.54].includes(p))await page.screenshot({path:`/tmp/burgr-assembly-${p}.png`})}
await seek(.38);const frozen=await video.evaluate(v=>v.currentTime);await page.waitForTimeout(1000);if(await video.evaluate(v=>v.currentTime)!==frozen)errors.push('Not frozen')
// Continuous slow wheel-equivalent progress: sample decoding while input is ongoing.
await page.evaluate(async()=>{const height=document.querySelector('.scroll-story').offsetHeight-innerHeight;window.samples=[];for(let i=0;i<=40;i++){scrollTo(0,height*(.26+.18*i/40));await new Promise(resolve=>setTimeout(resolve,45));window.samples.push(document.querySelector('video[src="/videos/burger-build.mp4"]').currentTime)}})
const distinct=await page.evaluate(()=>new Set(window.samples.map(t=>t.toFixed(2))).size);if(distinct<12)errors.push(`Too few distinct decoded positions: ${distinct}`)
await seek(.5);await seek(.29);await seek(.49)
await page.setViewportSize({width:390,height:844});await seek(.38);await page.screenshot({path:'/tmp/burgr-assembly-mobile.png'})
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))errors.push('Mobile overflow')
const plays=await page.evaluate(()=>window.plays);if(plays)errors.push(`Unexpected playback: ${plays}`)
console.log(JSON.stringify({metadata,errors,distinctSlowScrollPositions:distinct,freeze:true,reverse:true,plays},null,2));await browser.close();if(errors.length)process.exit(1)
