import {chromium} from '@playwright/test'
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[]
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.addInitScript(()=>{window.plays=0;document.addEventListener('play',()=>window.plays++,true)})
await page.goto('http://localhost:5173');await page.locator('.loader').waitFor({state:'detached'});await page.evaluate(()=>document.fonts.ready)
const ranges=[['hero',0,.16],['burger-build',.26,.44],['sides',.61,.79],['final',.78,.94]]
const opacity=selector=>page.locator(selector).evaluate(el=>{let value=1;while(el){value*=+getComputedStyle(el).opacity;el=el.parentElement}return value})
async function seek(p,check=true){await page.evaluate(p=>scrollTo(0,(document.querySelector('.scroll-story').offsetHeight-innerHeight)*p),p);await page.waitForTimeout(500);if(check)for(const [id,start,end]of ranges){const v=await page.locator(`video[src="/videos/${id}.mp4"]`).evaluate(v=>({time:v.currentTime,duration:v.duration,paused:v.paused,seeking:v.seeking}));const target=Math.max(0,Math.min(1,(p-start)/(end-start)))*(v.duration-1/120);if(Math.abs(v.time-target)>.06||!v.paused||v.seeking)errors.push({p,id,target,...v})}}
// Dense continuous sampling catches collision/black-frame regressions between keyframes.
const sweep=await page.evaluate(async()=>{
 const height=document.querySelector('.scroll-story').offsetHeight-innerHeight,issues=[]
 const alpha=el=>{let a=1;while(el){a*=+getComputedStyle(el).opacity;el=el.parentElement}return a}
 const samples=[...Array.from({length:201},(_,i)=>i/200),...Array.from({length:201},(_,i)=>(200-i)/200)]
 let minCoverage=1
 for(const p of samples){scrollTo(0,height*p);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)
  const product=alpha(document.querySelector('.product h2')),sides=alpha(document.querySelector('.sides h2'))
  if(product>.002&&sides>.002)issues.push(`Product/sides collision ${p}`)
  const coverage=1-[...document.querySelectorAll('.scrub-scene')].reduce((remaining,el)=>remaining*(1-+getComputedStyle(el).opacity),1);minCoverage=Math.min(minCoverage,coverage)
  if(coverage<.74)issues.push(`Media coverage ${p}: ${coverage}`)
  if(Math.abs(document.querySelector('.viewport').getBoundingClientRect().top)>1)issues.push(`Pin ${p}`)
 }
 return {issues,minCoverage,samples:samples.length}
})
errors.push(...sweep.issues)
const points=[0,.08,.16,.20,.26,.30,.35,.44,.47,.50,.56,.58,.595,.61,.70,.76,.785,.81,.83,.85,.89,.94,.98]
const forward=new Map()
for(const p of points){await seek(p);forward.set(p,await page.locator('.chapter').evaluateAll(es=>es.map(e=>+getComputedStyle(e).opacity)));if([.30,.35,.50,.61,.785,.89,.98].includes(p))await page.screenshot({path:`/tmp/burgr-polish-${p}.png`})}
for(const p of points.toReversed()){await seek(p);const reverse=await page.locator('.chapter').evaluateAll(es=>es.map(e=>+getComputedStyle(e).opacity));if(reverse.some((v,i)=>Math.abs(v-forward.get(p)[i])>.025))errors.push(`Reverse typography ${p}`)}
await seek(.30);if(await opacity('.assembly h2')>.76)errors.push('Assembly headline too opaque')
await seek(.35);if(await opacity('.assembly h2')>.001)errors.push('Assembly obscured')
await seek(.52);if(await opacity('.product-action')<.99||await opacity('.sides h2')>.001)errors.push('Product reading interval')
await page.getByRole('button',{name:'VIEW MENU',exact:false}).click();await page.getByRole('button',{name:'Close dialog'}).click()
await seek(.81);if(await opacity('.final-hungry')<=0||await opacity('.final-yet')>0)errors.push('HUNGRY before YET')
await seek(.83);if(await opacity('.final-yet')<=0||await opacity('.final-copy')>0)errors.push('YET before copy')
await seek(.85);if(await opacity('.final-copy')<=0||await opacity('.cta-buttons')>0)errors.push('Copy before CTAs')
await seek(.94);const held=await page.locator('.scene-final video').evaluate(v=>v.currentTime);await seek(.99);await page.waitForTimeout(500);if(await page.locator('.scene-final video').evaluate(v=>v.currentTime)!==held)errors.push('Final hold')
await page.getByRole('button',{name:'ORDER NOW',exact:false}).click();await page.getByRole('button',{name:'Close dialog'}).click()
await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(300);if(await page.locator('footer').evaluate(e=>e.getBoundingClientRect().bottom>innerHeight+1))errors.push('Footer')
await seek(.78);await seek(.44);await seek(0)
for(const viewport of [{width:375,height:667},{width:390,height:844},{width:844,height:390}]){
 await page.setViewportSize(viewport);await page.waitForTimeout(450)
 for(const p of [.20,.30,.52,.61,.70,.99]){await seek(p);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))errors.push(`Overflow ${viewport.width}/${p}`)}
 await page.screenshot({path:`/tmp/burgr-polish-mobile-${viewport.width}.png`})
 const rect=await page.locator('.cta-buttons').evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}))
 if(rect.top<70||rect.bottom>viewport.height-55)errors.push({viewport,rect})
 await seek(.78);await seek(.35);await seek(0)
}
await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('.loader').waitFor({state:'detached'});await seek(.89,false);if(await page.locator('video').evaluateAll(vs=>vs.some(v=>v.currentTime!==0)))errors.push('Reduced-motion playback')
if(await page.evaluate(()=>window.plays))errors.push('Autoplay')
console.log(JSON.stringify({errors,denseSamples:sweep.samples,minMediaCoverage:sweep.minCoverage,allFourVideos:true,reverse:true,finalHold:true},null,2));await browser.close();if(errors.length)process.exit(1)
