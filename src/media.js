// Vite detects newly added clips in development; rebuild after adding them in production.
const installed = import.meta.glob('/public/videos/*.mp4', { eager: true, query: '?url', import: 'default' })
export const videoScenes = [
  { id: 'hero', src: '/videos/hero.mp4', start: 0, end: .16, visibleStart: 0 },
  { id: 'build', src: '/videos/burger-build.mp4', start: .26, end: .44, visibleStart: .235 },
  { id: 'sides', src: '/videos/sides.mp4', start: .61, end: .79, visibleStart: .59 },
  { id: 'final', src: '/videos/final.mp4', start: .78, end: .94, visibleStart: .77 },
].map(scene => ({ ...scene, available: `/public${scene.src}` in installed }))
