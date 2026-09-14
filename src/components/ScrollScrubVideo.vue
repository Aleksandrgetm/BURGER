<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import gsap from 'gsap'
gsap.registerPlugin(ScrollTrigger)
const props = defineProps({
  src: { type:String, required:true }, poster:String,
  available: { type:Boolean, default:true },
  // Controlled mode maps the parent's normalized progress through numeric start/end.
  controlled: { type:Boolean, default:false },
  start: { type:[String,Number], default:'top top' },
  end: { type:[String,Number], default:undefined },
  scrollLength: { type:Number, default:140 }, // vh, standalone mode only
})
const emit = defineEmits(['settled','status'])
const host=ref(null), video=ref(null), status=ref(props.available?'loading':'missing'), reduced=ref(false)
let duration=0,target=0,latestProgress=0,raf=0,lastTick=0,lastInput=0,disposed=false
let metadataTimer,seekTimer,trigger,resizeObserver,motionQuery,settled=false,enabled=false
const cleanup=[]
function listen(target,name,callback,options){target.addEventListener(name,callback,options);cleanup.push(()=>target.removeEventListener(name,callback,options))}
function report(value){status.value=value;emit('status',value);if(!settled){settled=true;emit('settled',value)}}
function stop(){cancelAnimationFrame(raf);raf=0;lastTick=0;clearTimeout(seekTimer);video.value?.pause()}
function fail(reason='unavailable'){stop();report(reason)}
function queue(){if(!disposed&&!raf&&status.value==='ready'&&(!reduced.value||enabled))raf=requestAnimationFrame(tick)}
function setProgress(value){
  let progress=value
  if(props.controlled){const start=Number(props.start)||0,end=Number(props.end)||1;progress=(value-start)/Math.max(.001,end-start)}
  progress=Math.max(0,Math.min(1,progress))
  if(progress===latestProgress)return
  latestProgress=progress;target=progress*Math.max(0,duration-1/120);lastInput=performance.now();queue()
}
function tick(now){
  raf=0
  const el=video.value
  if(disposed||!el||status.value!=='ready'||(reduced.value&&!enabled))return
  el.pause()
  // Only one seek in flight. seeked schedules the next update; no busy rAF loop.
  if(el.seeking)return
  const delta=target-el.currentTime
  if(Math.abs(delta)<.001){lastTick=0;return}
  const dt=lastTick?Math.min(now-lastTick,64):16;lastTick=now
  // Small interpolation while input is active; exact target once input stops.
  const next=now-lastInput>100||Math.abs(delta)<1/60?target:el.currentTime+delta*(1-Math.exp(-dt/32))
  try{
    el.currentTime=Math.max(0,Math.min(duration-1/120,next))
    clearTimeout(seekTimer)
    seekTimer=setTimeout(()=>{if(el.seeking)fail('unsupported');else queue()},2500)
    if(!el.seeking)queue()
  }catch{fail('unsupported')}
}
function metadata(){
  const el=video.value
  if(!Number.isFinite(el.duration)||el.duration<=0)return
  duration=el.duration;target=latestProgress*Math.max(0,duration-1/120)
  if(el.readyState>=2)canRender()
}
function canRender(){
  if(!duration||disposed)return
  clearTimeout(metadataTimer);status.value='ready';report('ready');queue()
}
function load(){
  if(!props.available){report('missing');return}
  stop();status.value='loading';duration=0
  const el=video.value
  el.muted=true;el.defaultMuted=true;el.playsInline=true
  // No play(), autoplay, loop, or time-driven playback anywhere in this component.
  el.src=props.src;el.load()
  metadataTimer=setTimeout(()=>fail('unavailable'),15000)
}
function enable(){enabled=true;reduced.value=false;queue()}
defineExpose({setProgress})
onMounted(()=>{
  motionQuery=matchMedia('(prefers-reduced-motion: reduce)');reduced.value=motionQuery.matches
  listen(motionQuery,'change',event=>{reduced.value=event.matches;enabled=false;if(event.matches)stop();else queue()})
  const el=video.value
  listen(el,'loadedmetadata',metadata);listen(el,'durationchange',metadata)
  listen(el,'loadeddata',canRender);listen(el,'canplay',canRender)
  listen(el,'seeked',()=>{clearTimeout(seekTimer);queue()})
  listen(el,'play',()=>el.pause())
  listen(el,'error',()=>{clearTimeout(metadataTimer);fail('unavailable')})
  listen(document,'visibilitychange',()=>{if(document.hidden)stop();else queue()})
  // Safari may suspend loading in data-saving modes. A user gesture retries loading,
  // without starting playback or requesting full-screen video.
  resizeObserver=new ResizeObserver(()=>{if(trigger)ScrollTrigger.refresh();queue()})
  resizeObserver.observe(host.value)
  if(!props.controlled)trigger=ScrollTrigger.create({trigger:host.value,start:props.start,end:props.end??(()=>`+=${innerHeight*props.scrollLength/100}`),scrub:true,invalidateOnRefresh:true,onUpdate:self=>setProgress(self.progress)})
  load()
})
onBeforeUnmount(()=>{disposed=true;stop();clearTimeout(metadataTimer);trigger?.kill();resizeObserver?.disconnect();cleanup.forEach(fn=>fn());video.value?.removeAttribute('src');video.value?.load()})
</script>
<template>
  <div ref="host" class="scrub-scene" :data-state="status">
    <video ref="video" muted playsinline webkit-playsinline preload="auto" :poster="poster" disablepictureinpicture aria-hidden="true"></video>
    <div v-if="status!=='ready'" class="video-placeholder" role="status">
      <span class="video-placeholder-mark" aria-hidden="true"></span>
      <div class="video-file-note"><span>{{status==='loading'?'LOADING CINEMATIC FOOTAGE':status==='missing'?'VIDEO TO BE ADDED':'VIDEO UNAVAILABLE'}}</span><code>/public{{src}}</code><button v-if="status==='unavailable'||status==='unsupported'" @click="load">Retry video loading ↗</button></div>
    </div>
    <button v-if="status==='ready'&&reduced" class="video-motion-choice" @click="enable">Reduced motion · enable scroll video ↗</button>
  </div>
</template>
