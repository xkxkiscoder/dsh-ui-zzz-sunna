/**
 * Sunna (Chixia / 千夏) palette from Zenless Zone Zero.
 *
 * Source: the official stand art and the character page on the ZZZ BiliWiki
 * (wiki.biligame.com/zzz/千夏). The mapping is:
 *   brand           mint-green hair + the teal wing clip (her identifying color;
 *                   the crowd dubs her 废柴小绿毛)
 *   label/border    her hair family, cool mint-grey rather than neutral grey
 *   sidebar         a faint rose tint: pink is her stage costume, not her identity,
 *                   so it stays a surface and never an accent
 *   state error     the red ribbon at her collar
 *   state success   the mint green of the hair, grass-shifted so it never reads as brand
 *   state warn      the gold candy and polka-dot accent
 *   light base      the white of the shirt and the angel wings
 *   dark base       the hair held in shadow
 *
 * Each entry needs both palette modes: the theme registry refuses a bare
 * string, because one value goes illegible when the user switches color scheme.
 * Names come from ui-theme's inspectable token directory
 * (`ctx.theme.exportInspectTokens()`); an unknown name is accepted but changes
 * nothing visible.
 */
import type { ThemeTokenModes, ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import { CONTENT_BG_DEFAULT, CONTENT_BG_VARIABLE } from './slots.ts'

/** Override-layer source. One layer per source; the package id owns this layer. */
export const LAYER_SOURCE = 'dsh-ui-zzz-sunna'

/**
 * One content-block background, thinned by the tuning board's slider.
 *
 * The conversation's code blocks, inline code and tool cards each paint from a
 * single alias token, so replacing those three tokens reaches every one of them
 * at once — no per-component selector, and nothing to re-point when the first
 * party renames a class.
 *
 * The slider arrives as `--dsz-content-bg`, a percentage the board writes on
 * :root. It is read here rather than in the skin sheet because ui-layout applies
 * these tokens as **inline** custom properties on `body`: an inline declaration
 * outranks every stylesheet rule, so a sheet-level rewrite of the same token
 * would never win.
 *
 * The colour comes from the static palette rather than from the alias being
 * replaced: a custom property that references its own name on the element that
 * declares it is a cycle, and a cycle is guaranteed-invalid — the block would
 * lose its background outright instead of merely staying opaque. Both the static
 * palette and these aliases are declared on `body`, so the reference resolves on
 * the same element the override lands on.
 *
 * The fallback leaves a profile whose board never mounted painted exactly as the
 * first party draws it.
 * @param light - light-ground colour, as a static-palette reference.
 * @param dark - dark-ground colour, likewise.
 */
function contentBlock(light: string, dark: string): ThemeTokenModes {
  const thin = (colour: string): string =>
    `color-mix(in srgb, ${colour} var(${CONTENT_BG_VARIABLE}, ${String(CONTENT_BG_DEFAULT)}%), transparent)`
  return { light: thin(light), dark: thin(dark) }
}

/** Sunna brand token overrides. */
export const TOKENS: ThemeTokenOverrides = {
  '--dsw-alias-bg-base': { light: '#F6FBFA', dark: '#0C1514' },
  '--dsw-alias-bg-layer-1': { light: '#FFFFFF', dark: '#14201E' },
  '--dsw-alias-bg-layer-2': { light: '#EDF6F3', dark: '#1B2927' },
  '--dsw-alias-bg-overlay': { light: '#FFFFFF', dark: '#1F2E2B' },
  '--dsw-alias-border-l1': { light: '#D8E8E3', dark: '#263633' },
  '--dsw-alias-border-l2': { light: '#C2DAD3', dark: '#33473F' },
  '--dsw-alias-brand-primary': { light: '#08776F', dark: '#3FD0BC' },
  '--dsw-alias-label-primary': { light: '#12312B', dark: '#E8F3EF' },
  '--dsw-alias-label-secondary': { light: '#54736B', dark: '#8FA8A1' },
  '--dsw-alias-state-error-primary': { light: '#C2364A', dark: '#F06A7C' },
  '--dsw-alias-state-success-primary': { light: '#27752F', dark: '#4ECB6A' },
  '--dsw-alias-state-warn-primary': { light: '#975F06', dark: '#E9B43C' },
  '--dsw-specific-sidebar-fill': { light: '#FCF1F5', dark: '#1D1619' },
  // The conversation's own content blocks. The board's content-background slider
  // moves all three, so a code block, an inline span and a tool card fade
  // together and none of them keeps an opaque slab over the figures.
  '--dsw-alias-markdown-code-block':
    contentBlock('var(--dsw-static-neutral-bluish-50)', 'var(--dsw-static-neutral-bluish-900)'),
  '--dsw-alias-markdown-code-block-banner':
    contentBlock('var(--dsw-static-neutral-bluish-50)', 'var(--dsw-static-neutral-bluish-850)'),
  '--dsw-alias-markdown-inline-code':
    contentBlock('var(--dsw-static-neutral-50)', 'var(--dsw-static-neutral-800)'),
}
