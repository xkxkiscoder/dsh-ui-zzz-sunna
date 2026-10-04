/**
 * Themes: which art each skin layer draws, and the geometry it starts from.
 *
 * A theme is a complete look — one set of images across the layers, plus the
 * starting size, position and opacity for each. The board switches between them
 * at runtime and that needs no rebuild, because the art is already published as
 * custom properties: the board writes `--dsz-<layer>-image` and `skin.ts` reads
 * it with the first theme's art as the stylesheet fallback.
 *
 * To add a theme: drop its images into `assets/` in the package root (the host
 * half serves that directory), append a `ThemePack` to `THEMES`, and give it a
 * label for the board. A theme only declares the layers it actually uses —
 * anything left out gets no art and the layer's baseline geometry. `SOURCES.md`
 * records where the shipped art comes from and how it was prepared.
 *
 * A layer can also offer `variants`: several pieces of art the board lets the user
 * pick between. The list lives either on the layer (art that belongs to the
 * character, like the pet's expressions, and is shared by every theme) or on the
 * theme's own entry for that layer (a choice that only makes sense under one look,
 * like which key art backs the overlay theme). A theme's list wins.
 *
 * A layer `id` doubles as the custom-property infix: the board writes
 * `--dsz-<id>-image|image-dark|size|pos|opacity|dark-scale|dark-pos` and
 * `skin.ts` reads them, so a board change lands without rebuilding the sheet.
 */
import { ASSET_PREFIX } from '../paths.ts'

/** Starting geometry for one layer. */
export interface LayerDefaults {
  readonly visible: boolean
  readonly size: number
  readonly position: number
  /** Percentage of full strength; higher reads as more solid. */
  readonly opacity: number
  /** Index into the layer's `variants`, for a layer that offers a choice. */
  readonly variant?: number
}

/** One piece of art a layer lets the user pick. */
export interface LayerVariant {
  readonly file: string
  /**
   * Art for the dark ground. Omit it when one image serves both modes — the usual
   * case for a backdrop, since the blend mode already differs.
   *
   * Worth avoiding on a picker: an entry that quietly swaps pictures in dark mode
   * makes that entry look like a no-op there, because it shows the same art as
   * whichever other entry names that dark picture.
   */
  readonly fileDark?: string
  /**
   * Art for the swatch itself, when the button should not preview `file`. A
   * mode-following entry needs this: its thumbnail has to show both colourways at
   * once, or it looks identical to the entry naming its light cut.
   */
  readonly swatch?: string
  /** Short name for the picker, read out as the swatch's tooltip. */
  readonly label: string
}

/** One layer's art inside one theme. */
export interface ThemeLayer {
  /** Art on the light ground; `null` leaves the layer with no art at all. */
  readonly file: string | null
  /**
   * Art on the dark ground. Omit it when one image serves both modes; set it to
   * `null` to hide the layer in dark mode only.
   *
   * A mirrored figure has to ship as its own file rather than as a `scaleX(-1)`
   * transform: the sidebar art rides on the sidebar root's own background layer,
   * so a transform there would mirror the whole column and its list too.
   */
  readonly fileDark?: string | null
  /**
   * Pickable alternatives **within this theme**. Takes precedence over the layer's
   * own list, so a choice that only makes sense under one look stays there.
   */
  readonly variants?: readonly LayerVariant[]
  /**
   * Size and vertical position of the dark variant, as percentages of the light
   * one's. Two figures that do not fill their frames alike cannot be matched with
   * a single size value, so the difference is corrected here. The board exposes
   * both numbers as sliders.
   */
  readonly darkDefaults?: {
    readonly scale: number
    readonly position: number
  }
  /**
   * Overrides the layer's baseline geometry. Merged onto the baseline rather than
   * replacing it, so a theme can set only the field it cares about — for instance
   * which of its variants opens first.
   */
  readonly defaults?: Partial<LayerDefaults>
}

/** A theme's layer entry with every field filled in. */
export interface ResolvedLayer {
  readonly file: string | null
  /** `undefined` when the theme ships no dark variant; `null` hides it in dark. */
  readonly fileDark?: string | null | undefined
  readonly variants?: readonly LayerVariant[] | undefined
  readonly defaults: LayerDefaults
  readonly darkDefaults?: {
    readonly scale: number
    readonly position: number
  } | undefined
}

/** A complete look: one set of art, plus the geometry it starts from. */
export interface ThemePack {
  readonly id: string
  readonly label: string
  /**
   * Let the sidebar take the content colour and be divided from it by a hairline,
   * instead of carrying a fill of its own. Suits a backdrop-led theme, where the
   * art already covers the page and a second fill competes with it.
   */
  readonly flushSidebar?: boolean
  /** Art per layer id; a layer left out gets no art and the baseline geometry. */
  readonly layers: Readonly<Partial<Record<string, ThemeLayer>>>
}

/**
 * Layer structure: what the board controls, and the geometry a theme starts from
 * when it does not override it. Independent of which theme is loaded.
 */
export interface LayerSpec {
  readonly id: string
  readonly label: string
  /** Bounds for the size control. */
  readonly sizeRange: readonly [number, number]
  /** What the position control moves, named for the board row. */
  readonly positionLabel: string
  /**
   * Let the element be dragged anywhere on the window instead of being placed by
   * a position slider. Only sensible for a surface small enough not to matter if
   * it sits over other content, and where an exact spot beats a symmetric margin.
   */
  readonly draggable?: boolean
  /**
   * Art every theme can pick from. Used when the loaded theme does not declare its
   * own list for this layer — the pet's expressions belong to the character and
   * therefore to all themes, while a backdrop choice belongs to one.
   */
  readonly variants?: readonly LayerVariant[]
  readonly defaults: LayerDefaults
}

/**
 * How the backdrop art blends into each ground.
 *
 * There is deliberately no opacity factor here. The board's slider is the whole
 * strength, so a slider at 100 means a genuinely opaque backdrop; scaling it by a
 * per-mode factor made the top of the slider worth only ~20%, which reads as "the
 * slider does nothing". The two modes differ by blend mode alone, and multiply vs
 * screen already read very differently on their own grounds.
 */
export const BACKGROUND_BLEND = {
  light: { blend: 'multiply' as const },
  dark: { blend: 'screen' as const },
} as const

/** Board rows in display order. */
export const LAYERS: readonly LayerSpec[] = [
  {
    id: 'sidebar',
    label: '侧栏立绘',
    sizeRange: [10, 150],
    positionLabel: '纵向位置',
    defaults: { visible: true, size: 75, position: 100, opacity: 45 },
  },
  {
    id: 'background',
    label: '背景氛围',
    sizeRange: [30, 220],
    positionLabel: '横向位置',
    // Bars a figure from reading as wallpaper: the backdrop is a mix-blend layer
    // over the whole viewport, so past roughly a quarter strength it stops being
    // atmosphere and starts competing with the text.
    defaults: { visible: true, size: 110, position: 90, opacity: 20 },
  },
  {
    id: 'left',
    label: '左贴底立绘',
    sizeRange: [20, 130],
    positionLabel: '向内偏移',
    defaults: { visible: true, size: 72, position: 0, opacity: 90 },
  },
  {
    id: 'right',
    label: '右贴底立绘',
    sizeRange: [20, 130],
    positionLabel: '向内偏移',
    defaults: { visible: true, size: 72, position: 0, opacity: 90 },
  },
  {
    id: 'pet',
    label: '右下挂件',
    sizeRange: [40, 220],
    positionLabel: '边距',
    // Dragged straight to wherever it belongs; the board keeps size and opacity.
    draggable: true,
    // The seven expressions from the official sticker set. Shared by every theme,
    // because they belong to the character rather than to a look. The confident
    // smile opens first: at 120px the emphatic faces read as noise.
    variants: [
      { file: 'sunna-14-chibi-shy.webp', label: '害羞' },
      { file: 'sunna-14-chibi-tired.webp', label: '心累' },
      { file: 'sunna-14-chibi-think.webp', label: '思考' },
      { file: 'sunna-14-chibi-angry.webp', label: '生气' },
      { file: 'sunna-14-chibi-confident.webp', label: '自信' },
      { file: 'sunna-14-chibi-music.webp', label: '听歌' },
      { file: 'sunna-14-chibi-cry.webp', label: '哭' },
    ],
    defaults: { visible: true, size: 120, position: 24, opacity: 100, variant: 4 },
  },
]

/**
 * Opacity of the background the conversation's own content blocks paint, in
 * percent.
 *
 * Global rather than per-theme, and deliberately not a layer: there is no art
 * behind it. It answers to legibility — how much of the figures shows through a
 * code block or a tool card — so a theme switch must not reset it.
 *
 * One value reaches every such block because the first party paints them all
 * from a single alias token; `tokens.ts` thins that token by this number. 100
 * leaves them exactly as the first party draws them.
 */
export const CONTENT_BG_DEFAULT = 100

/**
 * Custom property carrying the content opacity above.
 *
 * Shared rather than written twice: the board publishes it on :root and
 * `tokens.ts` reads it inside the content-block values, so a typo on either side
 * leaves the slider driving nothing — a failure that looks exactly like a slider
 * that does nothing, with no console error to follow.
 */
export const CONTENT_BG_VARIABLE = '--dsz-content-bg'

/**
 * The shipped themes, in board order. The first one is the default: it is what
 * `skin.ts` bakes in as the stylesheet fallback, so it paints even on a profile
 * where the board never mounts.
 *
 * The two are named for what carries the look rather than for which outfit the
 * art happens to show, so a third one has an obvious slot to claim.
 */
export const THEMES: readonly ThemePack[] = [
  {
    // Figure-led: a standing figure in the sidebar, and the backdrop a soft wash
    // of the same character.
    id: 'portrait',
    label: '立绘',
    layers: {
      sidebar: {
        file: 'sunna-01-casual.webp',
        fileDark: 'sunna-02-teatime-flip.webp',
        // Both figures ship cropped to their visible content, so their frames
        // are nearly all body (99.6% and 98.9%) and one size setting already
        // makes them stand the same height, with their feet on the same line at
        // position 100. These stay neutral unless someone nudges the dark figure.
        darkDefaults: { scale: 100, position: 100 },
      },
      background: { file: 'portrait.webp' },
    },
  },
  {
    // Overlay-led: the backdrop is the key art in its own colourway, and the
    // sidebar carries a single sheet that serves both grounds.
    id: 'overlay',
    label: '影画',
    // The backdrop already covers the page, so the column drops its own fill and
    // is divided from the content area by a hairline instead.
    flushSidebar: true,
    layers: {
      sidebar: {
        // Opt-in: this theme is about the backdrop, so a fresh install does not
        // stack a second character over the key art. The board can turn it back on.
        file: 'sunna-04-uniform.webp',
        defaults: { visible: false, size: 68, position: 100, opacity: 45 },
      },
      background: {
        // `file`/`fileDark` are the pair the shipped look uses, and they stay as the
        // stylesheet fallback for a profile where the board never mounts: 09 keeps a
        // near-white ground, so `multiply` leaves only the figure and the neon type
        // showing on a light page; 08 keeps a near-black one, so `screen` lights up
        // only those on a dark page.
        file: 'sunna-09-art.webp',
        fileDark: 'sunna-08-art.webp',
        // Backdrop alternatives, offered only under this theme, in a fixed order.
        // The first is the shipped default and the only entry that follows the mode:
        // 09 on a light page, 08 on a dark one. It carries a composite thumbnail —
        // the two colourways side by side — instead of 09's own picture, because a
        // thumbnail identical to the 亮 entry below would read as a duplicate, and
        // picking it would then look like a no-op in dark mode.
        // Every other entry paints both grounds with its own picture, so each one is
        // reachable in either mode — including 09 in dark mode, which is only
        // possible because the default is a separate entry.
        // 12 (valentine) and 13 (birthday) stay in the package as spares but are not
        // offered here, so neither appears in the picker.
        variants: [
          { file: 'sunna-09-art.webp', fileDark: 'sunna-08-art.webp', swatch: 'sunna-bg-auto.webp', label: '跟随明暗 · 浅 09 / 深 08' },
          { file: 'sunna-07-art.webp', label: '意象影画 · 绿粉' },
          { file: 'sunna-08-art.webp', label: '意象影画 · 暗' },
          { file: 'sunna-09-art.webp', label: '意象影画 · 亮' },
          { file: 'sunna-10-art-wide.webp', label: '旧梦的安可曲' },
          { file: 'sunna-11-art-newyear.webp', label: '除夕贺图' },
        ],
        defaults: { variant: 0 },
      },
    },
  },
]

/**
 * Theme ids that shipped under an earlier name. The board files each theme's
 * tuning under its id, so a rename has to be followed here — otherwise that
 * tuning would be orphaned and the theme would come back at its defaults.
 */
const LEGACY_THEME_IDS: Readonly<Record<string, string>> = {
  teatime: 'portrait',
  uniform: 'overlay',
}

/** The theme the stylesheet falls back to. */
export function defaultTheme(): ThemePack {
  const first = THEMES[0]
  if (first === undefined) throw new Error('no theme is declared')
  return first
}

/** The current id for a stored one, or undefined when no theme answers to it. */
export function canonicalThemeId(id: string): string | undefined {
  const renamed = LEGACY_THEME_IDS[id] ?? id
  return THEMES.some(theme => theme.id === renamed) ? renamed : undefined
}

/** Look a theme up by id, following a rename and falling back to the default. */
export function themeById(id: string): ThemePack {
  return THEMES.find(theme => theme.id === canonicalThemeId(id)) ?? defaultTheme()
}

/** Look a layer up by id. */
export function layerById(id: string): LayerSpec {
  const found = LAYERS.find(layer => layer.id === id)
  if (found === undefined) throw new Error(`no layer is declared with id ${id}`)
  return found
}

/** The art and geometry a theme gives one layer, with the baseline filled in. */
export function resolveLayer(theme: ThemePack, layer: LayerSpec): ResolvedLayer {
  const art = theme.layers[layer.id]
  return {
    file: art?.file ?? null,
    fileDark: art?.fileDark,
    // A theme's own list wins, so a backdrop choice stays with its theme while the
    // pet's expressions — declared on the layer — reach every theme.
    variants: art?.variants ?? layer.variants,
    // Merged, not replaced: a theme that only wants to move the opening variant
    // keeps the layer's baseline size, position and opacity.
    defaults: { ...layer.defaults, ...art?.defaults },
    darkDefaults: art?.darkDefaults,
  }
}

/** The art a layer draws at a stored index, or undefined when it has no list. */
export function pickedVariant(resolved: ResolvedLayer, index: number): LayerVariant | undefined {
  return resolved.variants?.[index]
}

/** Asset URL for a slot, or undefined when the surface is hidden. */
export function assetUrl(file: string | null): string | undefined {
  return file === null ? undefined : `${ASSET_PREFIX}/${file}`
}
