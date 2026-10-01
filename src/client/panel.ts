/**
 * The tuning board: a fixed panel in the window's bottom-right corner that
 * drives every figure layer through the custom properties `skin.ts` reads, so a
 * tweak lands without rebuilding the bundle. It also switches between the themes
 * declared in `slots.ts`, and between the art a single layer offers as variants.
 *
 * Values live in localStorage keyed by theme, so a reload keeps the tuned look
 * and tuning one theme never disturbs another. Storage is best-effort: a blocked
 * or full store costs persistence, never the live tweak.
 */
import { LAYERS, THEMES, assetUrl, canonicalThemeId, defaultTheme, pickedVariant, resolveLayer, themeById } from './slots.ts'
import type { LayerSpec, LayerVariant, ResolvedLayer, ThemePack } from './slots.ts'
import { BOARD_CLASS, BOARD_STYLE_ID, buildBoardCss } from './skin.ts'

/** Storage key holding the persisted board state. */
const STORAGE_KEY = 'dsh-ui-zzz-sunna:board'

/**
 * Storage schema version. Bumping it lets a stored value change meaning, or a
 * shipped default move, without changing what the user sees mid-flight — see
 * `migrate`.
 */
const STATE_VERSION = 3

/**
 * The factor the v1 stylesheet applied to the backdrop opacity. A slider at 100
 * then produced roughly 20% opacity, so a stored value has to be scaled by this
 * when it is read under the current schema.
 */
const LEGACY_BACKDROP_SCALE = 0.2

/** One layer's tunable state, as the board holds it. */
interface LayerState {
  visible: boolean
  size: number
  position: number
  opacity: number
  /** Size of the dark variant, as a percentage of the layer's own size. */
  scaleDark: number
  /** Vertical position of the dark variant. */
  positionDark: number
  /** Which entry of the layer's variant list is drawn; ignored when it has none. */
  variant: number
}

/** Board state: the chosen theme, plus each theme's own layer values. */
interface BoardState {
  version: number
  theme: string
  layers: Record<string, Record<string, LayerState>>
}

/** The state one layer starts from in a theme. */
function initialLayer(art: ResolvedLayer): LayerState {
  return {
    ...art.defaults,
    variant: art.defaults.variant ?? 0,
    scaleDark: art.darkDefaults?.scale ?? 100,
    positionDark: art.darkDefaults?.position ?? 100,
  }
}

/**
 * One theme's layer values, created from its declared geometry on first use.
 * Lazy because a theme that is never selected never needs a state.
 */
function layersOf(state: BoardState, theme: ThemePack): Record<string, LayerState> {
  const existing = state.layers[theme.id]
  if (existing !== undefined) return existing
  const created: Record<string, LayerState> = {}
  for (const layer of LAYERS) created[layer.id] = initialLayer(resolveLayer(theme, layer))
  state.layers[theme.id] = created
  return created
}

/** A fresh board state: the default theme, with nothing tuned yet. */
function defaultState(): BoardState {
  return { version: STATE_VERSION, theme: defaultTheme().id, layers: {} }
}

/** Copy whatever the stored entry provides onto a layer, field by field. */
function readLayer(target: LayerState, entry: unknown): void {
  if (typeof entry !== 'object' || entry === null) return
  const record = entry as Record<string, unknown>
  if (typeof record.visible === 'boolean') target.visible = record.visible
  if (typeof record.size === 'number') target.size = record.size
  if (typeof record.position === 'number') target.position = record.position
  if (typeof record.opacity === 'number') target.opacity = record.opacity
  if (typeof record.scaleDark === 'number') target.scaleDark = record.scaleDark
  if (typeof record.positionDark === 'number') target.positionDark = record.positionDark
  if (typeof record.variant === 'number') target.variant = record.variant
}

/**
 * Bring a stored state up to the current schema.
 *
 * v2: the v1 stylesheet multiplied the backdrop opacity by a per-mode factor, so
 * a stored 100 meant about 20% on screen. Scaling the stored number keeps the
 * picture unchanged while handing the slider its full range.
 *
 * v3: the overlay theme now ships with its sidebar figure off, and an entry
 * stored before that still has it on. Anyone who wants the figure turns it on in
 * the board, and that choice is what gets stored from then on.
 *
 * @param state - the state just read from storage, adjusted in place.
 * @param version - the schema version it was written under.
 */
function migrate(state: BoardState, version: number): void {
  if (version < 2) {
    for (const theme of THEMES) {
      const backdrop = state.layers[theme.id]?.background
      if (backdrop !== undefined) {
        backdrop.opacity = Math.round(backdrop.opacity * LEGACY_BACKDROP_SCALE)
      }
    }
  }
  if (version < 3) {
    const sidebar = state.layers.overlay?.sidebar
    if (sidebar !== undefined) sidebar.visible = false
  }
}

/**
 * Read the persisted state.
 *
 * Two shapes have shipped. The current one carries `version`, `theme` and a
 * `layers` map keyed by theme id. The first one was a bare layer map with no
 * themes at all, so it is adopted as the default theme's tuning rather than
 * discarded — otherwise a sidebar someone had already tuned would reset.
 */
function loadState(): BoardState {
  const state = defaultState()
  let stored: unknown
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    stored = raw === null ? undefined : JSON.parse(raw)
  } catch {
    // Unreadable storage means defaults, not a broken board.
    return state
  }
  if (typeof stored !== 'object' || stored === null) return state
  const entries = stored as Record<string, unknown>
  const version = typeof entries.version === 'number' ? entries.version : 1

  if (typeof entries.layers === 'object' && entries.layers !== null) {
    if (typeof entries.theme === 'string') state.theme = themeById(entries.theme).id
    const byTheme = entries.layers as Record<string, unknown>
    // Walk the stored keys rather than the declared themes: a theme that was
    // renamed still has its tuning filed under the old id, and `canonicalThemeId`
    // follows that rename. A key no theme answers to is dropped.
    for (const [storedId, storedTheme] of Object.entries(byTheme)) {
      const id = canonicalThemeId(storedId)
      if (id === undefined || typeof storedTheme !== 'object' || storedTheme === null) continue
      const target = layersOf(state, themeById(id))
      const record = storedTheme as Record<string, unknown>
      for (const layer of LAYERS) readLayer(target[layer.id]!, record[layer.id])
    }
  } else {
    const target = layersOf(state, defaultTheme())
    for (const layer of LAYERS) readLayer(target[layer.id]!, entries[layer.id])
  }

  migrate(state, version)
  return state
}

/** Persist the state; a failure only costs persistence. */
function saveState(state: BoardState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignored on purpose: the live tweak already landed on :root.
  }
}

/** A `url(...)` value, or `none` when the layer has no art or is switched off. */
function media(file: string | null | undefined, visible: boolean): string {
  const url = visible ? assetUrl(file ?? null) : undefined
  return url === undefined ? 'none' : `url("${url}")`
}

/**
 * Project the state onto :root, where the skin sheet reads it.
 *
 * Every variable is written for every layer, including the ones that come out
 * empty. A theme that ships no dark art of its own would otherwise inherit the
 * previous theme's `-image-dark` and keep painting it in dark mode.
 * @param state - the board state to publish.
 */
function applyState(state: BoardState): void {
  const root = document.documentElement
  const theme = themeById(state.theme)
  // A theme can ask for the sidebar to sit flush against the content area. The
  // sheet keys its rule off this flag, so it has to be published with the theme
  // rather than baked in at build time.
  root.toggleAttribute('data-dsz-flush-sidebar', theme.flushSidebar === true)
  const current = layersOf(state, theme)
  for (const layer of LAYERS) {
    const layerState = current[layer.id]
    if (layerState === undefined) continue
    const art = resolveLayer(theme, layer)
    // A layer offering a list draws the picked entry; otherwise the theme's own
    // file. A picked variant names both grounds when it has them, and a theme with
    // no dark file serves its light one to both modes.
    const variant = pickedVariant(art, layerState.variant)
    const lightFile = variant?.file ?? art.file
    const darkFile = variant === undefined
      ? (art.fileDark === undefined ? lightFile : art.fileDark)
      : (variant.fileDark ?? variant.file)
    const light = media(lightFile, layerState.visible)
    const dark = media(darkFile, layerState.visible)
    root.style.setProperty(`--dsz-${layer.id}-image`, light)
    root.style.setProperty(`--dsz-${layer.id}-image-dark`, dark)
    root.style.setProperty(`--dsz-${layer.id}-size`, String(layerState.size))
    root.style.setProperty(`--dsz-${layer.id}-pos`, String(layerState.position))
    root.style.setProperty(`--dsz-${layer.id}-opacity`, String(layerState.opacity / 100))
    root.style.setProperty(`--dsz-${layer.id}-dark-scale`, String(layerState.scaleDark / 100))
    root.style.setProperty(`--dsz-${layer.id}-dark-pos`, String(layerState.positionDark))
  }
}

/** Remove every custom property the board published. */
function clearState(): void {
  const root = document.documentElement
  root.removeAttribute('data-dsz-flush-sidebar')
  const suffixes = ['image', 'image-dark', 'size', 'pos', 'opacity', 'dark-scale', 'dark-pos']
  for (const layer of LAYERS) {
    for (const suffix of suffixes) root.style.removeProperty(`--dsz-${layer.id}-${suffix}`)
  }
}

/**
 * Build one labelled slider row.
 * @param label - row label.
 * @param min - slider lower bound.
 * @param max - slider upper bound.
 * @param value - current value.
 * @param format - how the value reads in the output cell.
 * @param onInput - receives every change while dragging.
 */
function sliderRow(
  label: string,
  min: number,
  max: number,
  value: number,
  format: (value: number) => string,
  onInput: (value: number) => void,
): HTMLElement {
  const row = document.createElement('label')
  row.className = `${BOARD_CLASS}__row`

  const name = document.createElement('span')
  name.textContent = label

  const input = document.createElement('input')
  input.type = 'range'
  input.min = String(min)
  input.max = String(max)
  input.value = String(value)

  const output = document.createElement('output')
  output.textContent = format(value)

  input.addEventListener('input', () => {
    const next = Number(input.value)
    output.textContent = format(next)
    onInput(next)
  })

  row.append(name, input, output)
  return row
}

/**
 * Build the swatch row that picks between a layer's variants.
 * @param variants - the list resolved for the loaded theme.
 * @param state - live state, mutated in place.
 * @param defaultIndex - which entry ships as the theme's default.
 * @param onChange - called after a pick.
 * @returns the swatch strip.
 */
function variantRow(
  variants: readonly LayerVariant[],
  state: LayerState,
  defaultIndex: number,
  onChange: () => void,
): HTMLElement {
  const strip = document.createElement('div')
  strip.className = `${BOARD_CLASS}__variants`

  variants.forEach((variant, index) => {
    const swatch = document.createElement('button')
    swatch.type = 'button'
    swatch.className = `${BOARD_CLASS}__variant`
    swatch.title = variant.label
    swatch.setAttribute('aria-label', variant.label)
    const url = assetUrl(variant.swatch ?? variant.file)
    if (url !== undefined) swatch.style.backgroundImage = `url("${url}")`
    if (index === state.variant) swatch.setAttribute('data-active', '')
    // The shipped default carries a dot, so it stays identifiable once someone has
    // picked something else.
    if (index === defaultIndex) swatch.setAttribute('data-default', '')

    swatch.addEventListener('click', event => {
      // The strip sits inside the layer block, whose heading toggles it open; a
      // pick must not also collapse the layer.
      event.stopPropagation()
      state.variant = index
      // Move the highlight here rather than rebuilding the board: the controls
      // hold no other state that depends on the pick.
      for (const sibling of Array.from(strip.children)) {
        sibling.toggleAttribute('data-active', sibling === swatch)
      }
      onChange()
    })

    strip.append(swatch)
  })

  return strip
}

/**
 * Build one layer's control block.
 * @param layer - the layer being controlled.
 * @param art - the art this layer draws in the selected theme, variants included.
 * @param state - its live state, mutated in place.
 * @param onChange - called after any mutation.
 */
function layerSection(
  layer: LayerSpec,
  art: ResolvedLayer,
  state: LayerState,
  onChange: () => void,
): HTMLElement {
  const section = document.createElement('section')
  section.className = `${BOARD_CLASS}__layer`
  const variants = art.variants ?? []
  // A layer counts as configured when it has art from either source: the theme's
  // file, or a list of variants to pick from.
  const configured = art.file !== null || variants.length > 0
  if (!configured) section.dataset.inert = ''

  // The heading doubles as the disclosure control, so the board stays five rows
  // tall until a layer is actually being tuned.
  const head = document.createElement('div')
  head.className = `${BOARD_CLASS}__name`
  head.addEventListener('click', event => {
    // The visibility box is the heading's other control; leave its click alone.
    if (event.target instanceof HTMLInputElement) return
    section.toggleAttribute('data-open')
  })

  const toggle = document.createElement('input')
  toggle.type = 'checkbox'
  toggle.checked = state.visible
  toggle.addEventListener('change', () => {
    state.visible = toggle.checked
    onChange()
  })

  const text = document.createElement('span')
  text.className = `${BOARD_CLASS}__label`
  text.textContent = configured ? layer.label : `${layer.label}（本主题无素材）`

  const caret = document.createElement('span')
  caret.className = `${BOARD_CLASS}__caret`
  caret.textContent = '▸'

  head.append(toggle, text, caret)

  const rows = document.createElement('div')
  rows.className = `${BOARD_CLASS}__rows`
  rows.append(
    sliderRow('大小', layer.sizeRange[0], layer.sizeRange[1], state.size,
      value => `${String(Math.round(value))}%`, value => {
        state.size = value
        onChange()
      }),
    // A draggable layer is placed by hand, so a position slider would only fight
    // the drag; it keeps size and opacity.
    ...(layer.draggable === true
      ? []
      : [sliderRow(layer.positionLabel, 0, 100, state.position,
        value => String(Math.round(value)), value => {
          state.position = value
          onChange()
        })]),
    sliderRow('透明度', 0, 100, state.opacity,
      value => `${String(Math.round(value))}%`, value => {
        state.opacity = value
        onChange()
      }),
  )

  if (variants.length > 0) {
    rows.append(variantRow(variants, state, art.defaults.variant ?? 0, onChange))
  }

  // A layer that ships two different figures also needs a size and a position for
  // the dark one, because the two bodies do not fill their frames alike.
  if (art.darkDefaults !== undefined) {
    rows.append(
      sliderRow('深色大小', 30, 150, state.scaleDark,
        value => `${String(Math.round(value))}%`, value => {
          state.scaleDark = value
          onChange()
        }),
      sliderRow('深色位置', 0, 100, state.positionDark,
        value => String(Math.round(value)), value => {
          state.positionDark = value
          onChange()
        }),
    )
  }

  section.append(head, rows)
  return section
}

/** The three paint dots on the palette glyph. */
const PALETTE_DOTS: readonly { cx: number; cy: number }[] = [
  { cx: 7.6, cy: 12.4 },
  { cx: 9.8, cy: 8.4 },
  { cx: 14.2, cy: 8.4 },
]

/**
 * Build the palette glyph for the fold control, drawn at the shell's outline
 * weight so the collapsed board reads as one more icon button. Created through
 * createElementNS rather than markup, so the board parses no HTML at all.
 * @returns the glyph element.
 */
function paletteGlyph(): SVGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '18')
  svg.setAttribute('height', '18')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.6')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')

  const board = document.createElementNS(ns, 'path')
  board.setAttribute('d', 'M12 21a9 9 0 1 1 9-9c0 1.66-1.34 3-3 3h-1.6a2 2 0 0 0-1.4 3.42A1.8 1.8 0 0 1 12 21Z')
  svg.append(board)

  for (const dot of PALETTE_DOTS) {
    const paint = document.createElementNS(ns, 'circle')
    paint.setAttribute('cx', String(dot.cx))
    paint.setAttribute('cy', String(dot.cy))
    paint.setAttribute('r', '1.1')
    svg.append(paint)
  }
  return svg
}

/**
 * Build the whole board element.
 * @param state - current state; controls mutate it in place.
 * @param onChange - called after any mutation.
 * @param onReset - called when the reset control is used.
 * @param onTheme - called with the id of a theme the user picked.
 */
function buildPanel(
  state: BoardState,
  onChange: () => void,
  onReset: () => void,
  onTheme: (id: string) => void,
): HTMLElement {
  const root = document.createElement('div')
  root.className = BOARD_CLASS
  // Starts folded: the board is a corner glyph until someone tunes a layer.
  root.toggleAttribute('data-collapsed', true)

  const head = document.createElement('div')
  head.className = `${BOARD_CLASS}__head`
  const title = document.createElement('span')
  title.className = `${BOARD_CLASS}__title`
  title.textContent = '千夏外观'
  const fold = document.createElement('button')
  fold.type = 'button'
  fold.className = `${BOARD_CLASS}__fold`
  fold.setAttribute('aria-label', '折叠或展开外观画板')
  fold.title = '折叠 / 展开'
  fold.append(paletteGlyph())
  fold.addEventListener('click', () => {
    root.toggleAttribute('data-collapsed')
  })
  head.append(title, fold)

  const theme = themeById(state.theme)
  const current = layersOf(state, theme)

  const body = document.createElement('div')
  body.className = `${BOARD_CLASS}__body`

  const picker = document.createElement('div')
  picker.className = `${BOARD_CLASS}__themes`
  for (const entry of THEMES) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `${BOARD_CLASS}__theme`
    button.textContent = entry.label
    button.title = `切换到「${entry.label}」`
    if (entry.id === theme.id) button.toggleAttribute('data-active', true)
    button.addEventListener('click', () => {
      onTheme(entry.id)
    })
    picker.append(button)
  }
  body.append(picker)

  for (const layer of LAYERS) {
    const layerState = current[layer.id]
    if (layerState === undefined) continue
    body.append(layerSection(layer, resolveLayer(theme, layer), layerState, onChange))
  }

  const reset = document.createElement('button')
  reset.type = 'button'
  reset.className = `${BOARD_CLASS}__reset`
  reset.textContent = '恢复本主题默认'
  reset.addEventListener('click', onReset)
  body.append(reset)

  root.append(head, body)
  return root
}

/**
 * Install the board, or replace the one already mounted.
 * @returns disposer removing the sheet, the element and every published property.
 */
export function installBoard(): () => void {
  document.getElementById(BOARD_STYLE_ID)?.remove()
  const sheet = document.createElement('style')
  sheet.id = BOARD_STYLE_ID
  sheet.textContent = buildBoardCss()
  document.head.appendChild(sheet)

  const state = loadState()
  let mounted: HTMLElement | null = null

  const publish = (): void => {
    applyState(state)
    saveState(state)
  }

  const mount = (): void => {
    // The board rebuilds whenever the theme or the values change, so carry the
    // folded state across instead of snapping shut on every click.
    const collapsed = mounted === null || mounted.hasAttribute('data-collapsed')
    mounted?.remove()
    mounted = buildPanel(state, publish, () => {
      // Reset forgets this theme's tuning only; the other themes keep theirs.
      delete state.layers[state.theme]
      publish()
      mount()
    }, id => {
      state.theme = themeById(id).id
      publish()
      // The controls show one theme's values, so a switch rebuilds them.
      mount()
    })
    if (!collapsed) mounted.removeAttribute('data-collapsed')
    document.body.appendChild(mounted)
  }

  publish()
  mount()

  return () => {
    document.getElementById(BOARD_STYLE_ID)?.remove()
    mounted?.remove()
    clearState()
  }
}
