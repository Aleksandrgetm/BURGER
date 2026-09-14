import {chromium} from '@playwright/test'
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),page=await browser.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
const results=[]
for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:375,height:667}]){
 await page.setViewportSize(viewport);await page.goto('http://localhost:5173');await page.locator('.loader').waitFor({state:'detached'});await page.evaluate(()=>document.fonts.ready)
 const result=await page.evaluate(()=>({
  unicode:/[\u2731-\u273d\u274a\u274b]/u.test(document.body.textContent),
  overflow:document.documentElement.scrollWidth>innerWidth,
  arrows:document.querySelectorAll('svg.arrow-icon').length,
  icons:[...document.querySelectorAll('svg.starburst-icon')].map(s=>({width:s.getBoundingClientRect().width,height:s.getBoundingClientRect().height,stroke:getComputedStyle(s).stroke,fill:getComputedStyle(s).fill,hidden:s.getAttribute('aria-hidden'),paths:s.querySelectorAll('path').length}))
 }))
 if(result.unicode||result.overflow||result.arrows<11||result.icons.length!==2)errors.push({viewport,result})
 const sizes=[23,viewport.width>700?26:20]
 result.icons.forEach((s,i)=>{if(s.width!==sizes[i]||s.height!==sizes[i]||s.stroke!=='rgb(255, 107, 53)'||s.fill!=='none'||s.hidden!=='true'||s.paths!==4)errors.push({viewport,icon:s})})
 results.push({viewport,icons:result.icons})
 await page.screenshot({path:`/tmp/burgr-starburst-${viewport.width}.png`})
 await page.getByRole('button',{name:'ORDER',exact:true}).first().click();await page.getByRole('button',{name:'Close dialog'}).click()
}
console.log(JSON.stringify({errors,results},null,2));await browser.close();if(errors.length)process.exit(1)
