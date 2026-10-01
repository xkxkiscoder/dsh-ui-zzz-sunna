/**
 * Launch splash: one pass of a short clip per page load, then out of the way.
 *
 * The client half is injected after the shell has started painting, so this
 * overlays an already-rendered UI instead of gating it — the clip covers the
 * first paint, it does not delay it. It fades out on purpose: a hard cut reads
 * as a glitch, a fade reads as a transition.
 *
 * Three separate things take it away — the clip ending, a load failure, and a floor
 * timer — so a clip that never loads still leaves a usable window behind. A click
 * on the overlay skips it early.
 */
import { ASSET_PREFIX } from '../paths.ts'

/** Id of the stylesheet this half owns. */
const STYLE_ID = 'dsz-sunna-splash-style'

/** Class on the overlay root; the stylesheet keys every rule off it. */
const SPLASH_CLASS = 'dsz-sunna-splash'

/** The clip, served by the host half's asset route. */
const SPLASH_URL = `${ASSET_PREFIX}/sunna-splash.mp4`

/** Shortest time the overlay stays up, so a failed clip cannot hide the UI. */
const MIN_VISIBLE_MS = 600

/** Fade duration; must match the transition the stylesheet declares. */
const FADE_MS = 420

/**
 * Install the splash overlay and the stylesheet it needs.
 * @returns disposer removing both and every timer it started.
 */
export function installSplash(): () => void {
  document.getElementById(STYLE_ID)?.remove()
  const sheet = document.createElement('style')
  sheet.id = STYLE_ID
  sheet.textContent = buildSplashCss()
  document.head.appendChild(sheet)

  const root = document.createElement('div')
  root.className = SPLASH_CLASS
  root.setAttribute('aria-hidden', 'true')

  const clip = document.createElement('video')
  clip.className = `${SPLASH_CLASS}__clip`
  clip.src = SPLASH_URL
  // Muted is what lets a page-load autoplay through at all; the attribute is set
  // beside the property because the parser only reads the attribute.
  clip.muted = true
  clip.autoplay = true
  clip.playsInline = true
  clip.setAttribute('muted', '')
  clip.setAttribute('playsinline', '')
  clip.setAttribute('disablepictureinpicture', '')
  root.appendChild(clip)
  document.body.appendChild(root)

  let dismissed = false
  let holdTimer = 0
  let fadeTimer = 0
  const started = Date.now()

  const dismiss = (): void => {
    if (dismissed) return
    dismissed = true
    root.removeEventListener('click', dismiss)
    clip.removeEventListener('ended', dismiss)
    clip.removeEventListener('error', dismiss)
    // Wait out the floor, then fade. Using the floor as a deadline instead ended
    // every clip that ran longer than it, mid-play.
    holdTimer = window.setTimeout(() => {
      // The fade is an attribute, not a removal: the element has to stay in the
      // tree for the transition to run at all.
      root.setAttribute('data-leaving', '')
      fadeTimer = window.setTimeout(() => root.remove(), FADE_MS)
    }, Math.max(0, MIN_VISIBLE_MS - (Date.now() - started)))
  }

  clip.addEventListener('ended', dismiss)
  clip.addEventListener('error', dismiss)
  root.addEventListener('click', dismiss)

  // A rejected play() is not fatal: the error listener takes the overlay away.
  void clip.play().catch(() => undefined)

  return () => {
    dismissed = true
    window.clearTimeout(holdTimer)
    window.clearTimeout(fadeTimer)
    document.getElementById(STYLE_ID)?.remove()
    root.remove()
  }
}

/**
 * The overlay's rules. `cover` rather than `contain` because the clip is 21:9 and
 * most windows are not: letterboxing the launch clip looks like a bug, cropping
 * it does not.
 * @returns the stylesheet text.
 */
function buildSplashCss(): string {
  return `
.${SPLASH_CLASS} {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  transition: opacity ${FADE_MS}ms ease;
}
.${SPLASH_CLASS}[data-leaving] {
  opacity: 0;
}
.${SPLASH_CLASS}__clip {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
`
}
