# BURGR. — cinematic scroll

Run `npm install` then `npm run dev`. Production: `npm run build`.

## Complete media flow

All four production clips are installed and active. There is **no product.mp4 requirement or placeholder**.

| Moment | Actual media | Playback range | Presentation |
|---|---|---|---|
| Hero | `public/videos/hero.mp4` | 0–16% | Starts at frame zero. Headline fades 13–17.5%; final frame carries through ingredients. |
| Ingredients | Same hero final frame | Held | HTML 100% BEEF / 0% BORING, then ingredient names. |
| Assembly | `public/videos/burger-build.mp4` | 26–44% | Reveals from 23.5%; BUILT DIFFERENT peaks at 75% opacity and fades 29–34%. |
| Product | **Same assembly video element**, final frame | Held 44–59% | Headline appears 44.5–47%, ingredients 46–48%, price/button 47–49%; readable hold 49–57.5%, then all product text exits by 59.5%. Burger stays right on desktop. No restart or second video. |
| Sides | `public/videos/sides.mp4` | 61–79% | Video dissolves 59–62%; headline enters 60–63% after product copy is completely gone, then exits 75–78%. |
| Final | `public/videos/final.mp4` | 78–94% | Video dissolves 77–80%; HUNGRY enters 80–82.5%, YET? 81.5–84%, copy 84–86%, CTAs 86–88%. |
| Final hold | Same final video element | Held 94–100% | Close-up and CTAs remain visible for an additional 42vh desktop / 37.2vh mobile of scrolling. |
| Footer | Normal document flow | After pin release | BURGR., navigation, brand copy and EST. 2024. |

The original generated assembly upload is preserved. It was copied without re-encoding to `burger-build.mp4`. The hero filename was normalized from `Hero.mp4` to lowercase for deployment compatibility. Previous still photographs live only in `references/media/`, outside the deployed public assets. No illustrated food, static photo animation, SVG food layers or canvas sequence is used in the main experience.

## Architecture

One GSAP ScrollTrigger pins one full-screen viewport. The pin spacer makes the experience 800svh on desktop and 720svh on phones. One reversible master timeline controls HTML typography, overlapping video opacity and the product presentation transform. The four paused videos share `ScrollScrubVideo.vue`; no independent scrolling system or autoplay is used.

Component props:

- `src`: clip URL; `poster`: optional poster (not used by the current scenes).
- `available`: false shows a neutral filename placeholder without requesting a missing clip.
- `controlled`: external master progress is supplied through `setProgress(progress)`.
- `start` / `end`: normalized master ranges when controlled; ScrollTrigger position strings in standalone mode.
- `scrollLength`: standalone scroll length in viewport-height units.

Metadata and finite duration are checked before seeking. ScrollTrigger writes target progress only. requestAnimationFrame interpolates toward target time while input continues and settles after 100ms without new input plus native seek/decode latency. One seek is in flight at a time. At rest the video is paused and there is no continuing rAF loop. At clip end it seeks to duration minus 1/120 second to retain the last visible frame. Reverse scroll naturally lowers the target. The product and final holds clamp their respective clip progress to 1.

All clips use muted/defaultMuted, playsinline, webkit-playsinline, preload="auto", and object-fit:cover. There is no video.play(), autoplay or loop. Native source frame rate and decoder speed determine which frame can be displayed; 60fps cannot be guaranteed on every device.

Loading waits for metadata/first-frame readiness. A failed or slow clip produces a neutral fallback with retry, never illustrated food. Reduced motion holds the initial frame until the user explicitly enables scroll video. ResizeObserver and ScrollTrigger refresh handle viewport changes. Timers, rAF, listeners, observers, media resources and GSAP contexts clean up on unmount. No Vue state updates run per video frame. Safari inline attributes and load retries are included; physical iOS verification with final encodes is still recommended.

## Encoding / replacement

Replace clips at the same paths; Vite discovers them in development. Rebuild and redeploy after production asset changes. Use H.264 MP4, yuv420p, faststart and frequent closed keyframes. Keep subjects within a portrait-safe central crop and leave room for HTML text. All four clips preload, so keep total size modest. Serve MP4 with the correct MIME type and HTTP range support.

Example:

```sh
ffmpeg -i source.mov -an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -movflags +faststart public/videos/final.mp4
```

All-intra (`-g 1 -keyint_min 1`) improves seeking at the cost of larger files. Camera motion comes from the footage; do not bake headlines into the videos.

## Verification

With Vite running, execute `node tests/polish-check.mjs`. It uses the actual four installed clips, without mocked footage, and verifies full forward/reverse flow, initial frames, same-element product continuity, final-frame holds, slow/fast input, pause/freeze, no play events, no old food graphics, menu/CTA actions, footer release and mobile layouts. Override `CHROME_PATH` if local Chrome is installed elsewhere.

`tests/assembly-check.mjs`, `tests/hero-flow-check.mjs` and `tests/three-video-check.mjs` are focused regression checks. Production compilation: `npm run build`.

The menu/order dialog supports a local basket, add/remove and totals. Actual checkout and confirmed restaurant details still require the business service and information.

## Cinematic polish validation

The canonical polish check samples 402 positions continuously forward and backward, verifies product/sides headlines never coexist, checks composited media opacity never drops below 0.74 during dissolves, then validates native seeking at settled positions, sequential final copy, product and final holds, controls, footer release and three responsive layouts. All transitions are opacity/transform only. Clip ranges are now 16%, 18%, 18%, 16% of the same total scroll distance; video files and the reusable seeking implementation are unchanged.
