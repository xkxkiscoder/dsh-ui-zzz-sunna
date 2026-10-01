/**
 * Browser plugin body: stack Sunna's brand tokens over the active theme, then
 * paint the surfaces the token seam cannot reach (background blend, standing
 * figures, mascot, the light-mode right panel). The base palette and the
 * user's light/dark/system preference are untouched; ui-theme folds the token
 * layer into its snapshot and ui-layout's presenter applies the result.
 *
 * The standalone surfaces mount unconditionally: their visibility, size,
 * position and opacity all ride on custom properties the tuning board writes,
 * so a surface that starts hidden must still exist to be turned back on.
 *
 * The launch splash mounts first so the clip covers the shell's opening paint
 * rather than landing on a window the user has already read.
 *
 * Every half disposes with the plugin, so HMR and profile patches remove the
 * brand colors, the figures, the board and the splash without a reload.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls ui-theme's Context merge (ctx.theme) into this compile.
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import { LAYER_SOURCE, TOKENS } from './tokens.ts'
import { installBoard } from './panel.ts'
import { installPetDrag } from './pet.ts'
import { installSplash } from './splash.ts'
import {
  FIGURE_CLASS, FIGURE_LEFT_CLASS, FIGURE_RIGHT_CLASS, PET_CLASS, STYLE_ID, buildSkinCss,
} from './skin.ts'

/** Services this plugin body requires. */
export const inject = ['theme']

/**
 * Register the launch splash, the brand token layer, the skin layers, the tuning
 * board, and the pet's drag handling.
 *
 * Order matters: the skin half owns the pet element, so it is mounted before the
 * drag handler goes looking for it.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => installSplash(), 'dsh-ui-zzz-sunna: launch splash')
  ctx.effect(() => ctx.theme.overrideTokens(LAYER_SOURCE, TOKENS), 'dsh-ui-zzz-sunna: brand token layer')
  ctx.effect(() => installSkin(), 'dsh-ui-zzz-sunna: skin layers')
  ctx.effect(() => installBoard(), 'dsh-ui-zzz-sunna: tuning board')
  ctx.effect(() => installPetDrag(), 'dsh-ui-zzz-sunna: pet drag')
}

/**
 * Install the skin stylesheet and the figure and pet elements.
 * @returns disposer removing the sheet and every element it added.
 */
function installSkin(): () => void {
  document.getElementById(STYLE_ID)?.remove()
  const sheet = document.createElement('style')
  sheet.id = STYLE_ID
  sheet.textContent = buildSkinCss()
  document.head.appendChild(sheet)

  const elements = [
    `${FIGURE_CLASS} ${FIGURE_LEFT_CLASS}`,
    `${FIGURE_CLASS} ${FIGURE_RIGHT_CLASS}`,
    PET_CLASS,
  ].map(appendSurface)

  return () => {
    document.getElementById(STYLE_ID)?.remove()
    for (const element of elements) element.remove()
  }
}

/**
 * Append one fixed skin surface. Its art comes from a custom property rather
 * than an inline style: the board owns that property, and a first-party
 * re-render would erase a direct write.
 * @param className - the class selecting its geometry.
 * @returns the appended element.
 */
function appendSurface(className: string): HTMLElement {
  const element = document.createElement('div')
  element.className = className
  element.setAttribute('aria-hidden', 'true')
  document.body.appendChild(element)
  return element
}
