import {chromium} from '@playwright/test'
import {readFile,readdir} from 'node:fs/promises'
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:900}})
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
page.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} ${m.location().url}`)})
await page.addInitScript(()=>{window.videoPlays=0;document.addEventListener('play',()=>window.videoPlays++,true)})
await page.goto('http://localhost:5173');await page.locator('.loader').waitFor({state:'detached'})
const installed=await readdir('public/videos');const present=['hero','burger-build','sides','final'].filter(name=>installed.includes(`${name}.mp4`)).length
if(await page.locator('.video-placeholder').count()!==4-present)errors.push('Missing-video placeholders')
if(await page.locator('video[src]').count()!==present)errors.push('Missing videos requested')
if(await page.locator('main img, main canvas, main svg:not(.arrow-icon):not(.starburst-icon)').count())errors.push('Old main media remains')
await page.screenshot({path:'/tmp/burgr-video-placeholder.png'})
const clips=[['hero',0,.16],['burger-build',.26,.44],['sides',.61,.79],['final',.78,.94]]
await page.route(/\/src\/media\.js(?:\?.*)?$/,route=>route.fulfill({contentType:'application/javascript',body:`export const videoScenes=${JSON.stringify(clips.map(([id,start,end])=>({id,start,end,visibleStart:id==='burger-build'?.235:id==='sides'?.59:id==='final'?.77:start,src:`/videos/${id}.mp4`,available:true})))}`}))
const clip=await readFile(process.env.VIDEO_FIXTURE||'/tmp/burgr-video-test.mp4')
await page.route('**/videos/*.mp4',route=>{
 const range=route.request().headers().range
 if(range){const match=/bytes=(\d+)-(\d*)/.exec(range),start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),clip.length-1):clip.length-1;return route.fulfill({status:206,headers:{'content-type':'video/mp4','accept-ranges':'bytes','content-range':`bytes ${start}-${end}/${clip.length}`},body:clip.subarray(start,end+1)})}
 return route.fulfill({contentType:'video/mp4',body:clip})
})
await page.reload();await page.locator('.loader').waitFor({state:'detached'});await page.waitForFunction(()=>[...document.querySelectorAll('video')].every(v=>v.readyState>=2))
async function seek(progress){
 await page.evaluate(p=>scrollTo(0,(document.querySelector('.scroll-story').offsetHeight-innerHeight)*p),progress)
 await page.waitForTimeout(700)
 const state=await page.evaluate(()=>({pin:document.querySelector('.viewport').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth,media:[...document.querySelectorAll('video')].map(v=>({time:v.currentTime,duration:v.duration,paused:v.paused,seeking:v.seeking}))}))
 if(Math.abs(state.pin)>1)errors.push(`Pin at ${progress}: ${state.pin}`)
 if(state.overflow)errors.push(`Overflow ${progress}`)
 state.media.forEach((v,i)=>{const expected=Math.max(0,Math.min(1,(progress-clips[i][1])/(clips[i][2]-clips[i][1])))*(v.duration-1/120);if(Math.abs(v.time-expected)>.06)errors.push(`Video ${i} at ${progress}: ${v.time} expected ${expected}`);if(!v.paused||v.seeking)errors.push(`Unsettled ${i} at ${progress}`)})
 return state
}
for(const progress of [0,.08,.18,.3,.44,.54,.62,.72,.82,.9,1,.9,.72,.54,.3,.08,0])await seek(progress)
await seek(.54)
const before=await page.locator('video').evaluateAll(videos=>videos.map(v=>v.currentTime));await page.waitForTimeout(1000)
const after=await page.locator('video').evaluateAll(videos=>videos.map(v=>v.currentTime))
if(before.some((v,i)=>v!==after[i]))errors.push('Video continued while scroll stopped')
if(await page.evaluate(()=>window.videoPlays))errors.push('Unexpected playback')
await page.screenshot({path:'/tmp/burgr-video-fixture.png'})
for(const viewport of [{width:375,height:667},{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);await page.waitForTimeout(400);await seek(.3);await seek(.9)}
await page.getByRole('button',{name:'MENU',exact:true}).click();await page.getByRole('button',{name:'Add The Double Smash',exact:true}).click();if(!await page.getByText('Total €9.90',{exact:true}).isVisible())errors.push('Menu total');await page.keyboard.press('Escape')
await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('.loader').waitFor({state:'detached'});await page.evaluate(()=>scrollTo(0,(document.querySelector('.scroll-story').offsetHeight-innerHeight)*.3));await page.waitForTimeout(700)
if(await page.locator('video').evaluateAll(videos=>videos.some(v=>v.currentTime!==0)))errors.push('Reduced motion seeks')
await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(300)
if(await page.locator('footer').evaluate(el=>el.getBoundingClientRect().bottom>innerHeight+1))errors.push('Footer not released')
await browser.close();console.log(JSON.stringify({errors,realMP4:true,reverse:true,freeze:true,mobile:true,reducedMotion:true},null,2));if(errors.length)process.exit(1)
