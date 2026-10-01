/**
 * The surfaces Sunna's palette reaches that the token seam cannot, built from
 * the slots in `slots.ts`.
 *
 * The background is a screen-space blend, not a real background: every app
 * surface paints an opaque --dsw-alias-bg-* token, so anything under the app
 * tree is invisible. It therefore rides above the tree, with a mode pair that
 * survives each ground.
 *
 * The background stays a body::after pseudo-element rather than an element.
 * mix-blend-mode only composites inside the nearest stacking context, so a
 * wrapper around it would isolate it from the page and render it as an
 * unblended image. The figures and pet are real elements because they need no
 * blending.
 *
 * Every tunable geometry value is read from a custom property whose fallback is
 * the shipped default, so the bottom-right board moves and fades a layer by
 * writing variables on :root. Variables rather than inline styles because the
 * first party owns the style attribute of the elements we decorate: a re-render
 * would erase direct writes, while :root survives it.
 *
 * The right panel in light mode: its box (ui-sidebar-right `.panel`) reads
 * --dsw-alias-bg-base, the same token as the conversation column behind it, so
 * the alias seam cannot give it its own color. The panel takes a data
 * attribute when open, which is a stable hook, and the token values are
 * re-declared on that element so the whole subtree reparents onto the hair
 * green.
 *
 * Both are coupled to first-party structure: the selector below names
 * ui-sidebar-right's attribute, and the blend needs the base backgrounds to
 * stay opaque. If either moves, re-point here rather than at the shell.
 */
import { BACKGROUND_BLEND, assetUrl, defaultTheme, layerById, resolveLayer } from './slots.ts'
import type { ResolvedLayer } from './slots.ts'

/** Id of the injected skin sheet, so re-registration replaces it instead of stacking. */
export const STYLE_ID = 'dsh-ui-zzz-sunna-skin'

/** Id of the injected board sheet, owned by `panel.ts`. */
export const BOARD_STYLE_ID = 'dsh-ui-zzz-sunna-board'

/** Class of the board root element. */
export const BOARD_CLASS = 'dsz-sunna-board'

/**
 * Light-mode panel ladder on PANEL_LIGHT.bg. Every label entry is at or above
 * 4.5:1 on the ground. The border is included because the panel box draws its
 * own left edge from it: left unoverridden, the recolored panel keeps a
 * neutral grey seam against the conversation column.
 */
export const SKIN_PANEL_LIGHT = {
  bg: '#73CAC0',
  'label-primary': '#0B241F',
  'label-secondary': '#1F3E37',
  'label-tertiary': '#274941',
  'label-caption': '#274941',
  'border-l4': '#57B5A2',
} as const

/** Class names of the figure and pet elements the browser half creates. */
export const FIGURE_CLASS = 'dsz-sunna-figure'
export const FIGURE_LEFT_CLASS = 'dsz-sunna-figure--left'
export const FIGURE_RIGHT_CLASS = 'dsz-sunna-figure--right'
export const PET_CLASS = 'dsz-sunna-pet'

/** The art and geometry the default theme gives one layer. */
function shipped(id: string): ResolvedLayer {
  return resolveLayer(defaultTheme(), layerById(id))
}

/**
 * Shipped default of one layer field, as a CSS fallback. Read through the default
 * theme, so the stylesheet and the board cannot drift apart.
 * @param id - layer id.
 * @param field - which default to read.
 * @param scale - divide the value by this (100 turns a percentage into a fraction).
 */
function fallback(id: string, field: 'size' | 'position' | 'opacity', scale = 1): string {
  return String(shipped(id).defaults[field] / scale)
}

/** Sheet applied over the composed theme, derived from the default theme's art. */
export function buildSkinCss(): string {
  // Fallbacks keep every surface painted even when the board never mounts. They
  // come from the default theme; a theme the board selects overrides them through
  // the variables, so switching needs no rebuild.
  const art = (url: string | undefined): string => (url === undefined ? 'none' : `url("${url}")`)
  /** Dark-ground fallback for a layer: its dark art, or the light art if it has none. */
  const darkArt = (id: string): string => {
    const layer = shipped(id)
    return art(assetUrl(layer.fileDark ?? layer.file))
  }
  const leftArt = art(assetUrl(shipped('left').file))
  const rightArt = art(assetUrl(shipped('right').file))
  const petArt = art(assetUrl(shipped('pet').file))
  const leftArtDark = darkArt('left')
  const rightArtDark = darkArt('right')
  const petArtDark = darkArt('pet')

  const rules: string[] = [
    `
body:not([data-ds-dark-theme]) [data-sidebar-right-open] {
  --dsw-alias-bg-base: ${SKIN_PANEL_LIGHT.bg};
  --dsw-alias-label-primary: ${SKIN_PANEL_LIGHT['label-primary']};
  --dsw-alias-label-secondary: ${SKIN_PANEL_LIGHT['label-secondary']};
  --dsw-alias-label-tertiary: ${SKIN_PANEL_LIGHT['label-tertiary']};
  --dsw-alias-label-caption: ${SKIN_PANEL_LIGHT['label-caption']};
  --dsw-alias-border-l4: ${SKIN_PANEL_LIGHT['border-l4']};
}

/* Standing figures: one shared box, each side owning its own height, opacity,
   image and inward nudge so the board can drive them independently. */
.${FIGURE_CLASS} {
  position: fixed;
  bottom: 0;
  /* Wider than any figure, so contain sizes the art by height alone. */
  width: 46vw;
  max-width: 640px;
  background-repeat: no-repeat;
  background-position: bottom center;
  background-size: contain;
  pointer-events: none;
  z-index: 9999;
}

.${FIGURE_LEFT_CLASS} {
  left: 0;
  height: calc(var(--dsz-left-size, ${fallback('left', 'size')}) * 1vh);
  opacity: var(--dsz-left-opacity, ${fallback('left', 'opacity', 100)});
  background-image: var(--dsz-left-image, ${leftArt});
  transform: translateX(calc(var(--dsz-left-pos, ${fallback('left', 'position')}) * 1.2px));
}

.${FIGURE_RIGHT_CLASS} {
  right: 0;
  height: calc(var(--dsz-right-size, ${fallback('right', 'size')}) * 1vh);
  opacity: var(--dsz-right-opacity, ${fallback('right', 'opacity', 100)});
  background-image: var(--dsz-right-image, ${rightArt});
  transform: translateX(calc(var(--dsz-right-pos, ${fallback('right', 'position')}) * -1.2px));
}

/* The pet is the one surface the pointer has to reach, because it is dragged into
   place rather than positioned by a slider. It keeps its place above everything,
   and the board (z-index 10001) still outranks it, so the corner control stays
   clickable even when the two overlap. */
.${PET_CLASS} {
  position: fixed;
  left: calc(var(--dsz-pet-x, 24) * 1px);
  top: calc(var(--dsz-pet-y, 24) * 1px);
  width: calc(var(--dsz-pet-size, ${fallback('pet', 'size')}) * 1px);
  height: calc(var(--dsz-pet-size, ${fallback('pet', 'size')}) * 1px);
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  background-image: var(--dsz-pet-image, ${petArt});
  opacity: var(--dsz-pet-opacity, ${fallback('pet', 'opacity', 100)});
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  z-index: 10000;
}

.${PET_CLASS}[data-dragging] {
  cursor: grabbing;
}

/* Dark ground: the same variables, read through the -image-dark pair. A layer with
   one image for both modes publishes that image under both names, so this needs no
   per-layer condition. Without it a figure that ships a second colourway would
   keep painting the light one. */
body[data-ds-dark-theme] .${FIGURE_LEFT_CLASS} {
  background-image: var(--dsz-left-image-dark, ${leftArtDark});
}

body[data-ds-dark-theme] .${FIGURE_RIGHT_CLASS} {
  background-image: var(--dsz-right-image-dark, ${rightArtDark});
}

body[data-ds-dark-theme] .${PET_CLASS} {
  background-image: var(--dsz-pet-image-dark, ${petArtDark});
}`,
  ]

  const backgroundArt = shipped('background')
  const background = assetUrl(backgroundArt.file)
  if (background !== undefined) {
    // The dark page gets its own image when the art ships a second colourway: the
    // two blends want opposite grounds — multiply wants a light one, screen a dark
    // one — so a single picture cannot serve both.
    const backgroundDark = art(assetUrl(backgroundArt.fileDark ?? backgroundArt.file))
    rules.unshift(`
body::after {
  content: "";
  position: fixed;
  inset: 0;
  /* Clear the desktop caption, so the top bar stays one continuous strip
     instead of having the figure's head poke through it. */
  top: var(--dsh-windows-titlebar-height, 0px);
  z-index: 9998;
  background-image: var(--dsz-background-image, url("${background}"));
  background-size: auto calc(var(--dsz-background-size, ${fallback('background', 'size')}) * 1%);
  background-position: calc(var(--dsz-background-pos, ${fallback('background', 'position')}) * 1%) 50%;
  background-repeat: no-repeat;
  pointer-events: none;
}

/* The board's slider is the whole strength: no per-mode factor, so 100% really is
   an opaque backdrop instead of a fifth of one. The two modes then differ by blend
   mode alone, which already reads very differently on a light and a dark ground. */
body:not([data-ds-dark-theme])::after {
  mix-blend-mode: ${BACKGROUND_BLEND.light.blend};
  opacity: var(--dsz-background-opacity, ${fallback('background', 'opacity', 100)});
}

body[data-ds-dark-theme]::after {
  background-image: var(--dsz-background-image-dark, ${backgroundDark});
  mix-blend-mode: ${BACKGROUND_BLEND.dark.blend};
  opacity: var(--dsz-background-opacity, ${fallback('background', 'opacity', 100)});
}`)
  }

  const sidebarArt = shipped('sidebar')
  const sidebar = assetUrl(sidebarArt.file)
  if (sidebar !== undefined) {
    const sidebarDark = assetUrl(sidebarArt.fileDark ?? null)
    const sidebarSeat = ':has(> [data-shell-overlay]) > div:first-of-type > [data-slot] > *'
    // The wash is what the board's opacity slider actually moves, and it is
    // assembled here rather than handed in finished from the board. A custom
    // property resolves its var() references on the element that *declares* it,
    // and --dsw-specific-sidebar-fill exists only down here at the sidebar: a
    // color-mix() naming it, declared on :root where the board writes, collapses
    // to guaranteed-invalid — and because this sheet reads such a value with a
    // fallback, the fallback would win on every drag and the opacity control
    // would look dead. So the board publishes the layer's plain opacity fraction
    // and the token stays in this sheet, on the element that actually has it.
    const washStrength = `calc((1 - var(--dsz-sidebar-opacity, ${fallback('sidebar', 'opacity', 100)})) * 100%)`
    const washColor = `color-mix(in srgb, var(--dsw-specific-sidebar-fill) ${washStrength}, transparent)`
    const wash = `linear-gradient(${washColor}, ${washColor})`
    // The dark variant carries its own size and vertical position, because the
    // two figures do not fill their frames alike: one size value would make the
    // light and dark sidebars read as different sizes.
    const darkScale = (sidebarArt.darkDefaults?.scale ?? 100) / 100
    const darkPosition = sidebarArt.darkDefaults?.position ?? 100
    // A mode swap has to go through its own variable. The board publishes these
    // as inline custom properties on :root, and an inline declaration outranks
    // any stylesheet rule, so the dark block below cannot restate
    // --dsz-sidebar-image — it would never win. Only `background-image` is
    // restated: position and size are separate properties, and their shorthand
    // lists still line up with the swapped image pair.
    const darkSidebar = sidebarDark === undefined ? '' : `

body[data-ds-dark-theme] ${sidebarSeat} {
  background-image: ${wash}, var(--dsz-sidebar-image-dark, url("${sidebarDark}"));
  background-position: 0 0, center calc(var(--dsz-sidebar-dark-pos, ${darkPosition}) * 1%);
  background-size: 100% 100%, auto calc(var(--dsz-sidebar-size, ${fallback('sidebar', 'size')}) * var(--dsz-sidebar-dark-scale, ${darkScale}) * 1%);
}`
    rules.unshift(`
/* Left sidebar: the sidebar root paints the fill colour, so the figure rides on
   that element's own background layer — above its colour, beneath its content.
   The frame has no id or data attribute, so it is reached through the overlay
   seat it owns; its first column child is the sidebar column, and the slot
   wrapper below that is a zero-size display:contents node, so the figure lands
   on the root one level further in. A wash of the same fill sits between the
   figure and the list so text keeps its contrast; the board raises or lowers
   that wash through --dsz-sidebar-wash. */
${sidebarSeat} {
  background-image: ${wash}, var(--dsz-sidebar-image, url("${sidebar}"));
  background-repeat: no-repeat;
  background-position: 0 0, center calc(var(--dsz-sidebar-pos, ${fallback('sidebar', 'position')}) * 1%);
  background-size: 100% 100%, auto calc(var(--dsz-sidebar-size, ${fallback('sidebar', 'size')}) * 1%);
}${darkSidebar}`)
  }

  rules.push(`
/* Flush sidebar: a theme can ask for the column to take the content colour and be
   divided from it by a hairline, rather than painting its own fill over the
   backdrop. The board sets the flag when the selected theme asks for it, so this
   follows a theme switch with no rebuild. Both the column and the sidebar root are
   named, because the fill variable may be declared on either of them. */
html[data-dsz-flush-sidebar] :has(> [data-shell-overlay]) > div:first-of-type,
html[data-dsz-flush-sidebar] :has(> [data-shell-overlay]) > div:first-of-type > [data-slot] > * {
  --dsw-specific-sidebar-fill: var(--dsw-alias-bg-base);
}

html[data-dsz-flush-sidebar] :has(> [data-shell-overlay]) > div:first-of-type {
  border-right: 1px solid var(--dsw-alias-border-l1, rgb(0 0 0 / 0.12));
}`)

  rules.push(`
/* New-session button: transparent background, so the sidebar fill and figure
   show through and the control reads as part of the column. The brand button
   shares this aria-label but sits inside the window-drag logo row, so it is
   excluded here and keeps its own paint. Hover keeps its original feedback. */
:has(> [data-shell-overlay]) > div:first-of-type *:not([data-window-drag]) > button[aria-label="新建会话"] {
  background-color: transparent;
}

/* Account button, at the foot of the sidebar: give it the same outline the
   new-session button carries, so the two read as the same kind of control. The
   first party paints no border there and its class names are hashed, so the
   aria-label is the stable hook — a rename would drop the outline silently. The
   colour comes from the theme's border tier rather than the literal the first
   party uses, so it also survives light mode. */
:has(> [data-shell-overlay]) button[aria-label="账号菜单"] {
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.16));
}`)

  rules.push(`
/* Workspace browser bottom fade: an opaque gradient pinned to the list's bottom
   edge, transparent -> sidebar fill. Behind a figure it paints a band straight
   across the art, which is why the shell already drops it on the translucent
   macOS sidebar. Removed here for the same reason. The selector matches the CSS
   Modules name (hash_local) on a span, so the sidebar root's \`fading\` class
   cannot be hit. */
:has(> [data-shell-overlay]) > div:first-of-type span[class*="_fade"] {
  display: none;
}`)

  return rules.join('\n')
}

/** Sheet for the tuning board, kept apart from the skin so a board change never reflows the app. */
export function buildBoardCss(): string {
  return `
.${BOARD_CLASS} {
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 10001;
  box-sizing: border-box;
  width: 236px;
  max-height: calc(100vh - 28px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--dsw-alias-border-l2, rgb(255 255 255 / 0.14));
  border-radius: 12px;
  background: color-mix(in srgb, var(--dsw-alias-bg-base, #14110f) 88%, transparent);
  backdrop-filter: blur(14px);
  color: var(--dsw-alias-label-primary, #eaeaea);
  font: 12px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.38);
}

.${BOARD_CLASS}__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgb(255 255 255 / 0.08));
}

/* Collapsed, the board is only its glyph: a round button parked in the corner
   until the next tuning pass. */
.${BOARD_CLASS}[data-collapsed] {
  width: auto;
  border-radius: 999px;
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.42);
}

.${BOARD_CLASS}[data-collapsed] .${BOARD_CLASS}__head {
  padding: 5px;
  border-bottom: 0;
}

.${BOARD_CLASS}[data-collapsed] .${BOARD_CLASS}__title {
  display: none;
}

.${BOARD_CLASS}[data-collapsed] .${BOARD_CLASS}__fold {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  color: var(--dsw-alias-label-primary, #eee);
}

.${BOARD_CLASS}__title {
  flex: 1;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.${BOARD_CLASS}__fold {
  all: unset;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--dsw-alias-label-secondary, #bbb);
}

.${BOARD_CLASS}__fold:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgb(255 255 255 / 0.08));
  color: var(--dsw-alias-label-primary, #fff);
}

.${BOARD_CLASS}[data-collapsed] .${BOARD_CLASS}__body {
  display: none;
}

.${BOARD_CLASS}__body {
  overflow-y: auto;
  padding: 4px 10px 10px;
}

/* Theme picker: one chip per declared theme, so the whole look is one click away. */
.${BOARD_CLASS}__themes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0 8px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgb(255 255 255 / 0.08));
}

.${BOARD_CLASS}__theme {
  all: unset;
  padding: 3px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 11px;
  line-height: 1.6;
  background: var(--dsw-alias-interactive-bg-hover, rgb(255 255 255 / 0.08));
  color: var(--dsw-alias-label-secondary, #bbb);
}

.${BOARD_CLASS}__theme:hover {
  color: var(--dsw-alias-label-primary, #fff);
}

.${BOARD_CLASS}__theme[data-active] {
  background: var(--dsw-alias-state-business-primary, #3fd0bc);
  color: var(--dsw-alias-bg-base, #14110f);
  font-weight: 600;
}

/* Variant picker: one swatch per piece of art a layer offers, painted as the art
   itself so a choice is recognisable without reading a tooltip. */
.${BOARD_CLASS}__variants {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.${BOARD_CLASS}__variant {
  all: unset;
  box-sizing: border-box;
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2, rgb(255 255 255 / 0.14));
  background-color: var(--dsw-alias-interactive-bg-hover, rgb(255 255 255 / 0.08));
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

/* The entry the theme ships as its default carries a corner dot, so it stays
   identifiable once someone has picked something else. */
.${BOARD_CLASS}__variant[data-default]::after {
  content: '';
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--dsw-alias-state-business-primary, #3fd0bc);
  box-shadow: 0 0 0 1px var(--dsw-alias-bg-base, #14110f);
}

.${BOARD_CLASS}__variant:hover {
  border-color: var(--dsw-alias-label-secondary, #bbb);
}

.${BOARD_CLASS}__variant[data-active] {
  border-color: var(--dsw-alias-state-business-primary, #3fd0bc);
  background-color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #3fd0bc) 22%, transparent);
}

.${BOARD_CLASS}__layer {
  padding: 8px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgb(255 255 255 / 0.06));
}

.${BOARD_CLASS}__layer[data-inert] {
  opacity: 0.45;
}

.${BOARD_CLASS}__name {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  font-weight: 600;
}

.${BOARD_CLASS}__label {
  flex: 1;
}

.${BOARD_CLASS}__caret {
  color: var(--dsw-alias-label-tertiary, #8b8b8b);
  transition: transform 150ms ease;
}

.${BOARD_CLASS}__layer[data-open] .${BOARD_CLASS}__caret {
  transform: rotate(90deg);
}

/* Controls stay out of the way until the layer is opened. */
.${BOARD_CLASS}__rows {
  display: none;
}

.${BOARD_CLASS}__layer[data-open] .${BOARD_CLASS}__rows {
  display: block;
}

.${BOARD_CLASS}__row {
  display: grid;
  grid-template-columns: 52px 1fr 34px;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  color: var(--dsw-alias-label-secondary, #bbb);
}

.${BOARD_CLASS}__row input[type="range"] {
  width: 100%;
  height: 3px;
  accent-color: var(--dsw-alias-state-business-primary, #3fd0bc);
}

.${BOARD_CLASS}__row output {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.${BOARD_CLASS}__reset {
  all: unset;
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 5px 0;
  text-align: center;
  cursor: pointer;
  border-radius: 7px;
  background: var(--dsw-alias-interactive-bg-hover, rgb(255 255 255 / 0.08));
  color: var(--dsw-alias-label-primary, #eee);
}

.${BOARD_CLASS}__reset:hover {
  background: var(--dsw-alias-interactive-bg-active, rgb(255 255 255 / 0.14));
}`
}
