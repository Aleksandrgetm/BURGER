<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ScrollScrubVideo from './components/ScrollScrubVideo.vue'
import { videoScenes } from './media'
gsap.registerPlugin(ScrollTrigger)
const root = ref(null), stage = ref(null), viewport = ref(null), dialog = ref(null)
const panel = ref(''), cart = ref([]), loaded = ref(0), ready = ref(false)
const items = [{name:'The Double Smash',detail:'Double beef · cheddar · pickles · house sauce',price:9.9},{name:'The Green Room',detail:'Crispy plant patty · lettuce · pickles · vegan sauce',price:9.9},{name:'Golden Fries',detail:'Skin-on potatoes · sea salt',price:3.5},{name:'House Lemonade',detail:'Lemon · sparkling water · fresh mint',price:3}]
const chapters = ['intro','ingredients','assembly','product','sides','cta']
const points = [0,.18,.26,.46,.62,.80]
const videoRefs = new Map(), completedVideos = new Set()
let context, timeline, previousFocus
function videoSettled(id) { completedVideos.add(id); loaded.value=Math.round(completedVideos.size/videoScenes.length*100);ready.value=completedVideos.size===videoScenes.length }
function go(name) { const index = chapters.indexOf(name), trigger=timeline?.scrollTrigger;if(trigger)window.scrollTo({top:trigger.start+(trigger.end-trigger.start)*(index===0?0:points[index]+.025),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}) }
function openPanel(name) { previousFocus = document.activeElement; panel.value = name; dialog.value.showModal(); document.body.style.overflow = 'hidden' }
function closePanel() { dialog.value.close(); document.body.style.overflow = ''; previousFocus?.focus() }
function add(item) { cart.value.push(item) }
onMounted(() => {
  context=gsap.context(()=>{
    const scenes=gsap.utils.toArray('.chapter'),media=gsap.utils.toArray('.scrub-scene')
    const dots=[...root.value.querySelectorAll('.chapter-dot')],nav=root.value.querySelector('.navigation')
    let active=-1
    gsap.set(scenes.slice(1),{autoAlpha:0})
    gsap.set(media.slice(1),{autoAlpha:0})
    timeline=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{
      trigger:stage.value,pin:viewport.value,pinSpacing:true,start:'top top',
      end:()=>`+=${viewport.value.clientHeight*(matchMedia('(max-width:700px)').matches?6.2:7)}`,
      scrub:true,invalidateOnRefresh:true,anticipatePin:1,
      onUpdate:self=>{
        // Only target progress is written here. Each component schedules its own rAF seek.
        videoRefs.forEach(component=>component?.setProgress(self.progress))
        root.value.style.setProperty('--progress',self.progress)
        nav.classList.toggle('scrolled',self.progress>.15)
        const index=points.findLastIndex(p=>self.progress>=p)
        if(index!==active){active=index;dots.forEach((dot,i)=>{dot.classList.toggle('active',i===index);dot.setAttribute('aria-current',i===index?'step':'false')})}
      }
    }})
    timeline.to({},{duration:100},0)
    points.forEach((p,i)=>timeline.addLabel(chapters[i],p*100))
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
    const rise = amount => reduced ? 0 : amount
    // Independent text windows preserve visual overlap without overlapping headlines.
    timeline.to('.intro',{autoAlpha:0,duration:4.5},13)
      .to('.intro h1',{y:rise(-8),scale:reduced?1:.99,transformOrigin:'left center',duration:17.5},0)
      .to('.ingredients',{autoAlpha:1,duration:2.5},16.5)
      .fromTo('.ingredient-list span',{opacity:0},{opacity:1,stagger:.45,duration:1.5},18)
      .to('.ingredients',{autoAlpha:0,duration:2.5},23)
      .to('.assembly',{autoAlpha:1,duration:2.5},24.5)
      .fromTo('.assembly h2',{opacity:0},{opacity:.75,duration:2.5},24.5)
      .to('.assembly h2',{opacity:0,duration:5},29)
      .to('.assembly',{autoAlpha:0,duration:3},31)
      // The assembled burger is complete at 44%, before the product copy appears.
      .to('.product',{autoAlpha:1,duration:2},44.5)
      .fromTo('.product h2',{autoAlpha:0,y:rise(20)},{autoAlpha:1,y:0,duration:2.5},44.5)
      .fromTo('.product > p',{autoAlpha:0,y:rise(10)},{autoAlpha:1,y:0,duration:2},46)
      .fromTo('.product-action',{autoAlpha:0,y:rise(10)},{autoAlpha:1,y:0,duration:2},47)
      // Readable hold: 49–57.5%. Fully gone by 59.5%, before sides text at 60%.
      .to('.product',{autoAlpha:0,y:rise(-8),duration:2},57.5)
      .to('.sides',{autoAlpha:1,duration:2},60)
      .fromTo('.sides h2',{autoAlpha:0,y:rise(20)},{autoAlpha:1,y:0,duration:3},60)
      .fromTo('.sides .scene-note',{autoAlpha:0,y:rise(8)},{autoAlpha:1,y:0,duration:2},61)
      .to('.sides',{autoAlpha:0,y:rise(-8),duration:3},75)
      // Final video is already emerging before the staggered HTML reveal.
      .to('.cta',{autoAlpha:1,duration:2},78)
      .fromTo('.final-hungry',{autoAlpha:0,y:rise(16)},{autoAlpha:1,y:0,duration:2.5},80)
      .fromTo('.final-yet',{autoAlpha:0,y:rise(16)},{autoAlpha:1,y:0,duration:2.5},81.5)
      .fromTo('.final-copy',{autoAlpha:0,y:rise(10)},{autoAlpha:1,y:0,duration:2},84)
      .fromTo('.cta-buttons',{autoAlpha:0,y:rise(10)},{autoAlpha:1,y:0,duration:2},86)
    // Short overlapping photographic dissolves, fully reversible with the master.
    media.forEach((layer,i)=>{
      if(i)timeline.to(layer,{autoAlpha:1,duration:3},videoScenes[i].visibleStart*100)
      if(i<media.length-1)timeline.to(layer,{autoAlpha:0,duration:3},videoScenes[i+1].visibleStart*100)
    })
    // Preserve the same paused video through product presentation; no new clip or reset.
    const productShift = () => reduced || matchMedia('(max-width:700px)').matches ? 0 : 18
    // Center-origin coverage: scale >= 1 + 2 * abs(translateX / width).
    // Match the scale ramp to the translation ramp so every intermediate frame
    // covers the stationary, overflow-hidden scene (including reverse scrolling).
    const productCoverage = () => 1 + 2 * productShift() / 100 + (productShift() ? 4 / viewport.value.clientWidth : 0)
    timeline.to('.scene-build video',{
      xPercent:productShift,scale:productCoverage,transformOrigin:'center center',duration:4,
    },43)
      .to('.scene-build video',{scale:()=>productCoverage() * (productShift() ? 1.04 : 1),duration:10.5},47)
    // No changes after 94%: final frame, all text and both CTAs hold until pin release.
  },root.value)
})
onBeforeUnmount(()=>{context?.revert();videoRefs.clear();document.body.style.overflow=''})
</script>

<template>
<div ref="root" class="experience">
  <div v-if="!ready" class="loader" role="status"><b>BURGR<span>.</span></b><p>FIRING UP THE GRILL · {{ loaded }}%</p><i :style="{transform:`scaleX(${loaded/100})`}"></i></div>
  <header class="navigation"><a class="logo" href="#" @click.prevent="go('intro')" aria-label="BURGR home">BURGR<span>.</span></a><nav aria-label="Main navigation"><button @click="openPanel('menu')">MENU</button><button @click="openPanel('locations')">LOCATIONS</button><button class="nav-order" @click="openPanel('order')">ORDER <span>↗</span><small v-if="cart.length">{{cart.length}}</small></button></nav></header>
  <main ref="stage" class="scroll-story">
    <div ref="viewport" class="viewport">
      <div class="ambient"></div>
      <ScrollScrubVideo :class="`scene-${scene.id}`" v-for="scene in videoScenes" :key="scene.id" :ref="el=>{if(el)videoRefs.set(scene.id,el);else videoRefs.delete(scene.id)}" :src="scene.src" :available="scene.available" controlled :start="scene.start" :end="scene.end" @settled="videoSettled(scene.id)" />
      <div class="photo-shade"></div><div class="grain"></div>
      <section class="chapter intro" aria-label="Not just a burger">
        <div class="eyebrow"><span class="spark">✳</span> GOOD FOOD. NO SHORTCUTS.</div>
        <h1>NOT JUST<br>A BURGER<span class="orange">.</span></h1>
        <div class="intro-bottom"><p>SMASHED. STACKED.<br>SERVED HOT.</p><button class="round-link" @click="go('ingredients')" aria-label="Explore the ingredients">↘</button></div>
        <div class="quality-stamp"><span>100% FRESH BEEF</span><strong>ALL BITE.<br>NO BULL.</strong><span>SMASHED TO ORDER</span></div>
      </section>
      <section class="chapter ingredients" aria-label="Ingredients"><div class="eyebrow">01 / ONLY THE GOOD STUFF</div><h2>100% BEEF<br><span class="orange">0% BORING.</span></h2><div class="ingredient-list"><span v-for="(name,i) in ['BRIOCHE','BEEF','CHEDDAR','PICKLES','HOUSE SAUCE']" :key="name"><small>0{{i+1}}</small>{{name}}<b>↗</b></span></div><p class="scene-note">Real ingredients. Ridiculous flavour.<br>Nothing to hide. Everything to taste.</p></section>

      <section class="chapter assembly" aria-label="Burger assembly"><div class="eyebrow">02 / THE ANATOMY OF A CRAVING</div><h2>BUILT<br>DIFFERENT.</h2></section>
      <section class="chapter product" aria-label="The Double Smash"><div class="eyebrow">03 / MEET YOUR NEW USUAL</div><h2>THE DOUBLE<br><span class="orange">SMASH.</span></h2><p>DOUBLE BEEF · CHEDDAR<br>PICKLES · HOUSE SAUCE</p><div class="product-action"><strong>€9.90</strong><button class="button" @click="openPanel('menu')">VIEW MENU <span>↗</span></button></div></section>
      <section class="chapter sides" aria-label="Fries and drinks"><div class="eyebrow">04 / BETTER TOGETHER</div><h2>DON’T<br>STOP <span class="orange">THERE.</span></h2><p class="scene-note">Golden fries. Ice-cold sips.<br>The best things come on the side.</p></section>

      <section class="chapter cta" aria-label="Order now"><div class="eyebrow">05 / READY WHEN YOU ARE</div><h2><span class="final-hungry">HUNGRY</span><br><span class="orange final-yet">YET?</span></h2><p class="final-copy">You know what to do.<br>Fresh. Hot. Smashed to order.</p><div class="cta-buttons"><button class="button" @click="openPanel('order')">ORDER NOW <span>→</span></button><button class="text-link" @click="openPanel('locations')">FIND A LOCATION</button></div></section>
      <aside class="progress-rail" aria-label="Story chapters"><span>THE BURGR. STORY</span><div class="dots"><button v-for="(chapter,i) in chapters" :key="chapter" class="chapter-dot" :class="{active:i===0}" :aria-label="`Chapter ${i+1}: ${chapter}`" @click="go(chapter)"><i></i></button></div><small>06</small></aside>
      <div class="stage-bottom"><button @click="go('ingredients')"><span class="scroll-line"></span> SCROLL TO GET HUNGRY</button><span>BIG FLAVOUR. ZERO COMPROMISE.</span><span class="bottom-mark">EST. 2024 <i>✳</i></span></div>
    </div>
  </main>
  <footer><a class="logo" href="#" @click.prevent="go('intro')">BURGR<span>.</span></a><p>GOOD FOOD.<br>NO SHORTCUTS.</p><nav aria-label="Footer navigation"><button @click="openPanel('menu')">MENU</button><button @click="openPanel('locations')">LOCATIONS</button><button @click="openPanel('order')">ORDER ↗</button></nav><span>EST. 2024</span><button @click="go('intro')">BACK TO TOP ↑</button></footer>
  <dialog ref="dialog" @cancel.prevent="closePanel" @click="e=>{if(e.target===dialog)closePanel()}"><div class="dialog-inner"><button class="close" @click="closePanel" aria-label="Close dialog">×</button><div class="eyebrow">BURGR. / {{panel}}</div><template v-if="panel==='locations'"><h2>COME<br>HUNGRY.</h2><p>Our first restaurant is on its way.</p><p class="muted">Location and opening hours will appear here once confirmed. This preview does not list a fictional restaurant.</p></template><template v-else><h2>{{panel==='order'?'YOUR CRAVING.':'THE LINEUP.'}}</h2><p v-if="panel==='order'" class="muted">Build your order below. Online checkout will open with our first restaurant.</p><div class="menu-row" v-for="item in items" :key="item.name"><div><h3>{{item.name}}</h3><p>{{item.detail}}</p></div><strong>€{{item.price.toFixed(2)}}</strong><button @click="add(item)" :aria-label="`Add ${item.name}`">+</button></div><div class="basket" v-if="cart.length"><h3>Your order · {{cart.length}} items</h3><div v-for="(item,i) in cart" :key="i" class="basket-row"><span>{{item.name}}</span><button @click="cart.splice(i,1)" :aria-label="`Remove ${item.name}`">Remove</button></div><strong>Total €{{cart.reduce((sum,item)=>sum+item.price,0).toFixed(2)}}</strong><p aria-live="polite">{{cart.length}} {{cart.length===1?'item':'items'}} in your order. Checkout coming soon.</p></div></template></div></dialog>
</div>
</template>
