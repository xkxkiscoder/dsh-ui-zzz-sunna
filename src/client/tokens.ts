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
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'

/** Override-layer source. One layer per source; the package id owns this layer. */
export const LAYER_SOURCE = 'dsh-ui-zzz-sunna'

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
}
