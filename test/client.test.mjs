import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import test from 'node:test'

import { LAYER_SOURCE, TOKENS } from '../src/client/tokens.ts'
import { BOARD_CLASS, SKIN_PANEL_LIGHT, STYLE_ID, buildBoardCss, buildSkinCss } from '../src/client/skin.ts'
import { BACKGROUND_BLEND, LAYERS, THEMES, assetUrl, defaultTheme, layerById, resolveLayer, themeById } from '../src/client/slots.ts'
import { ASSET_EXTENSIONS, ASSET_PREFIX } from '../src/paths.ts'

const PACKAGE_NAME = 'dsh-ui-zzz-sunna'

/** The package assets directory, as declared by the slots. */
const ASSETS_DIR = fileURLToPath(new URL('../assets/', import.meta.url))

// ui-theme's inspectable names all use these two prefixes. A typo here is
// accepted by the registry but changes nothing visible, so the test is the
// only thing that catches it.
const TOKEN_NAME = /^--dsw-(?:alias|specific)-[a-z0-9]+(?:-[a-z0-9]+)*$/

const SURFACES = ['bg-base', 'bg-layer-1', 'bg-layer-2', 'bg-overlay']
const FOREGROUNDS = ['label-primary', 'label-secondary', 'brand-primary',
  'state-error-primary', 'state-success-primary', 'state-warn-primary']

test('every token name is an accepted --dsw-* alias', () => {
  for (const name of Object.keys(TOKENS)) {
    assert.match(name, TOKEN_NAME, `${name} is not an inspectable theme token name`)
  }
})

test('every value is a non-empty { light, dark } pair', () => {
  for (const [name, modes] of Object.entries(TOKENS)) {
    for (const scheme of ['light', 'dark']) {
      const value = modes[scheme]
      assert.equal(typeof value, 'string', `${name}.${scheme} must be a string`)
      assert.notEqual(value.trim(), '', `${name}.${scheme} must not be empty`)
    }
  }
})

test('the layer source owns the package id', () => {
  // One layer per source: a stale source would keep a dead brand layer in the
  // composition after the package is renamed or replaced.
  assert.equal(LAYER_SOURCE, PACKAGE_NAME)
})

test('the palette covers every surface the shell renders', () => {
  // The built-in Appearance row and the conversation column need a background,
  // a raised surface, an overlay, two border tiers, both label tiers, a brand
  // accent, the three state colors, and a sidebar fill.
  const required = [
    '--dsw-alias-bg-base',
    '--dsw-alias-bg-layer-1',
    '--dsw-alias-bg-layer-2',
    '--dsw-alias-bg-overlay',
    '--dsw-alias-border-l1',
    '--dsw-alias-border-l2',
    '--dsw-alias-brand-primary',
    '--dsw-alias-label-primary',
    '--dsw-alias-label-secondary',
    '--dsw-alias-state-error-primary',
    '--dsw-alias-state-success-primary',
    '--dsw-alias-state-warn-primary',
    '--dsw-specific-sidebar-fill',
  ]
  const missing = required.filter((name) => !(name in TOKENS))
  assert.deepEqual(missing, [], `palette is missing ${missing.join(', ')}`)
})

test('every label and accent clears WCAG on every surface, both schemes', () => {
  // A wrong hex here is invisible until someone squints, so this is the check
  // that actually protects the palette. Labels need AAA; accents and states
  // need AA, which covers normal-size text and UI markers.
  for (const scheme of ['light', 'dark']) {
    for (const surface of SURFACES) {
      const ground = TOKENS[`--dsw-alias-${surface}`][scheme]
      for (const foreground of FOREGROUNDS) {
        const ink = TOKENS[`--dsw-alias-${foreground}`][scheme]
        const contrast = ratio(ink, ground)
        const floor = foreground === 'label-primary' ? 7 : 4.5
        assert.ok(
          contrast >= floor,
          `${scheme} ${foreground} on ${surface} is ${contrast.toFixed(2)}:1, below ${floor}:1`,
        )
      }
    }
  }
})

test('theme and layer ids are unique, and an unknown theme falls back to the default', () => {
  // The board keys its stored values by these ids, so a duplicate would make two
  // themes share one set of tuning and one of them would silently lose its own.
  const themeIds = THEMES.map((theme) => theme.id)
  assert.equal(new Set(themeIds).size, themeIds.length, `duplicate theme id in ${themeIds.join(', ')}`)
  const layerIds = LAYERS.map((layer) => layer.id)
  assert.equal(new Set(layerIds).size, layerIds.length, `duplicate layer id in ${layerIds.join(', ')}`)

  assert.equal(defaultTheme(), THEMES[0], 'the default theme must be the first one declared')
  assert.equal(themeById('no-such-theme'), THEMES[0])
  assert.equal(themeById(themeIds[0]).id, themeIds[0])
})

test('a renamed theme id still resolves, so the tuning filed under it is not orphaned', () => {
  // The board stores each theme's values under its id. Renaming a theme without
  // carrying the old id across would silently reset whatever had been tuned, and
  // the theme would come back at its defaults.
  assert.equal(themeById('teatime').id, 'portrait')
  assert.equal(themeById('uniform').id, 'overlay')
  for (const id of THEMES.map((theme) => theme.id)) {
    assert.equal(themeById(id).id, id, `${id} must resolve to itself`)
  }
})

test('every theme is labelled, ships art, and only names layers that exist', () => {
  // A theme with no art would be an empty entry in the picker, and a typo in a
  // layer key would be accepted silently while drawing nothing.
  for (const theme of THEMES) {
    assert.notEqual(theme.label.trim(), '', `${theme.id} has no label for the picker`)
    for (const id of Object.keys(theme.layers)) {
      assert.doesNotThrow(() => layerById(id), `${theme.id} declares unknown layer ${id}`)
    }
    const withArt = LAYERS.filter((layer) => resolveLayer(theme, layer).file !== null)
    assert.ok(withArt.length > 0, `${theme.id} ships no art on any layer`)
  }
})

test('every asset a theme declares exists in assets/ and the host will serve it', async () => {
  // Two silent failures, both invisible at runtime: a declared file that was
  // never committed, and an extension the host route refuses to answer.
  const declared = new Set()
  for (const theme of THEMES) {
    for (const layer of LAYERS) {
      const art = resolveLayer(theme, layer)
      for (const file of [art.file, art.fileDark ?? null]) {
        if (file !== null) declared.add(file)
      }
    }
  }

  assert.ok(declared.size > 0, 'no theme declares any art at all')
  for (const file of declared) {
    try {
      await access(join(ASSETS_DIR, file))
    } catch {
      assert.fail(`${file} is declared in a theme but missing from assets/`)
    }
    const extension = `.${file.split('.').pop()}`
    assert.notEqual(
      ASSET_EXTENSIONS[extension], undefined,
      `${file} uses ${extension}, which the host asset route will not serve`,
    )
  }
})

test('the skin sheet gates both modes and keeps the panel out of dark', () => {
  // The selectors are the whole coupling point: a wrong attribute name or a
  // missing mode gate makes the tint apply everywhere, or nowhere.
  const css = buildSkinCss()
  assert.match(css, /body:not\(\[data-ds-dark-theme\]\)::after/)
  assert.match(css, /body\[data-ds-dark-theme\]::after/)
  assert.match(css, /body:not\(\[data-ds-dark-theme\]\)\s*\[data-sidebar-right-open\]/)
  assert.match(css, new RegExp(`mix-blend-mode: ${BACKGROUND_BLEND.light.blend}`))
  assert.match(css, new RegExp(`mix-blend-mode: ${BACKGROUND_BLEND.dark.blend}`))

  // The sheet bakes in the default theme's backdrop, so the skin still paints
  // when the board never mounts.
  const backdrop = resolveLayer(defaultTheme(), layerById('background')).file
  assert.notEqual(backdrop, null)
  assert.match(css, new RegExp(`url\\("${ASSET_PREFIX}/${backdrop}"\\)`))

  // Every layer reads its dark image through its own variable. Without that rule a
  // theme shipping a second colourway would keep painting the light one, since the
  // dark block only restates what it names.
  for (const layer of ['background', 'left', 'right', 'pet']) {
    assert.match(css, new RegExp(`--dsz-${layer}-image-dark`), `${layer} never reads its dark image`)
  }
})

test('a hidden slot resolves to no asset, an open one to the served prefix', () => {
  // This is the hide switch: null means the element is never appended, so a
  // typo here reads as "the skin did nothing".
  assert.equal(assetUrl(null), undefined)
  assert.equal(assetUrl('portrait.webp'), `${ASSET_PREFIX}/portrait.webp`)
})

test('the default theme ships one sidebar figure per mode', () => {
  // Two modes pointing at the same file would make the theme split a no-op. They
  // must be separate files: a mirrored figure cannot be a transform, because the
  // sidebar art rides on the sidebar root's own background layer.
  const sidebar = resolveLayer(defaultTheme(), layerById('sidebar'))
  assert.notEqual(sidebar.file, null)
  assert.notEqual(sidebar.fileDark, undefined)
  assert.notEqual(sidebar.fileDark, null)
  assert.notEqual(sidebar.file, sidebar.fileDark)
})

test('the overlay theme ships its backdrop without a sidebar figure', () => {
  // The overlay theme is about the key art, so its figure is opt-in: a fresh
  // profile should not stack a second character on top of the backdrop. The
  // figure-led theme keeps its own on, so the two read differently out of the box.
  assert.equal(resolveLayer(themeById('overlay'), layerById('sidebar')).defaults.visible, false)
  assert.equal(resolveLayer(themeById('portrait'), layerById('sidebar')).defaults.visible, true)
})

test('the overlay theme sits the sidebar flush against the content area', () => {
  // The theme's point is the backdrop covering the page, so the column must not
  // paint a second fill over it. The sheet keys its rule off a flag the board
  // publishes, so the rule has to exist even while the flag is off.
  assert.equal(themeById('overlay').flushSidebar, true)
  assert.notEqual(themeById('portrait').flushSidebar, true)

  const css = buildSkinCss()
  assert.match(css, /html\[data-dsz-flush-sidebar\][^{]*\{[^}]*--dsw-specific-sidebar-fill: var\(--dsw-alias-bg-base\)/)
  assert.match(css, /html\[data-dsz-flush-sidebar\][^{]*\{[^}]*border-right: 1px solid/)
})

test('a theme can tune its dark figure separately so both modes read the same size', () => {
  // One size value cannot fit two figures whose bodies fill their frames
  // differently, so a dark variant may carry its own scale and position. They
  // must be applied inside the dark block only, or light mode would inherit them.
  const sidebar = resolveLayer(defaultTheme(), layerById('sidebar'))
  assert.ok(sidebar.darkDefaults, 'the sidebar must declare dark tuning')
  const { scale, position } = sidebar.darkDefaults
  assert.ok(scale >= 50 && scale <= 150, `dark scale ${scale} is outside the slider's range`)
  assert.ok(position >= 0 && position <= 100, `dark position ${position} is outside the slider's range`)

  const css = buildSkinCss()
  assert.match(css, /body\[data-ds-dark-theme\][^{]*\{[^}]*--dsz-sidebar-dark-scale/)
  assert.match(css, /body\[data-ds-dark-theme\][^{]*\{[^}]*--dsz-sidebar-dark-pos/)
})

test('the sidebar wash is assembled in the sheet, never published by the board', () => {
  // Regression guard for a dead opacity slider: the board writes its custom
  // properties on :root, where --dsw-specific-sidebar-fill does not exist. If the
  // sheet ever goes back to reading a board-made color-mix() of that token, the
  // value collapses to guaranteed-invalid and the fallback silently wins.
  const sidebar = resolveLayer(defaultTheme(), layerById('sidebar'))
  const css = buildSkinCss()
  assert.match(css, new RegExp(`url\\("${ASSET_PREFIX}/${sidebar.file}"\\)`))
  assert.match(css, new RegExp(`url\\("${ASSET_PREFIX}/${sidebar.fileDark}"\\)`))
  assert.match(css, /calc\(\(1 - var\(--dsz-sidebar-opacity,/)
  assert.match(css, /body\[data-ds-dark-theme\][^{]*\{[^}]*--dsz-sidebar-image-dark/)
})

test('the board sheet styles a theme picker', () => {
  // The picker is the only way to reach a theme other than the default, so a
  // missing style would leave the chips invisible instead of merely plain.
  const css = buildBoardCss()
  assert.match(css, new RegExp(`\\.${BOARD_CLASS}__themes`))
  assert.match(css, new RegExp(`\\.${BOARD_CLASS}__theme\\[data-active\\]`))
})

test('the backdrop strength is the slider value, with no hidden factor', () => {
  // Regression guard: the sheet used to multiply the slider by a per-mode factor,
  // so the top of the slider was worth about 20% and read as a broken control.
  const css = buildSkinCss()
  const rules = css.match(/body(?:\[data-ds-dark-theme\]|:not\(\[data-ds-dark-theme\]\))::after \{[^}]*\}/g) ?? []
  assert.equal(rules.length, 2, 'both modes must style the backdrop')
  for (const rule of rules) {
    assert.match(rule, /opacity: var\(--dsz-background-opacity, [\d.]+\)/)
    assert.doesNotMatch(rule, /\*/, `the backdrop opacity must not be scaled: ${rule}`)
  }
})

test('the pet is dragged into place instead of positioned by a slider', () => {
  // A symmetric margin cannot express "park it right here", so the pet publishes a
  // free position and is the one surface that takes pointer events. Giving that to
  // another layer would put a hit target over the interface.
  assert.equal(layerById('pet').draggable, true)
  for (const layer of LAYERS.filter((entry) => entry.id !== 'pet')) {
    assert.notEqual(layer.draggable, true, `${layer.id} must not swallow pointer events`)
  }

  const css = buildSkinCss()
  assert.match(css, /left: calc\(var\(--dsz-pet-x,/)
  assert.match(css, /top: calc\(var\(--dsz-pet-y,/)
  assert.match(css, /\.dsz-sunna-pet\s*\{[^}]*pointer-events: auto/)
})

test('a layer with variants offers art that exists and a default in range', async () => {
  // Variants come from either the layer (the pet's expressions, shared by every
  // theme) or the theme's own entry (a backdrop choice that only makes sense under
  // one look), so the check has to walk both: a missing file or an out-of-range
  // default draws nothing while the swatches still look perfectly fine.
  const offered = []
  for (const theme of THEMES) {
    for (const layer of LAYERS) {
      const art = resolveLayer(theme, layer)
      for (const variant of art.variants ?? []) {
        offered.push({ where: `${theme.id}/${layer.id}`, variant })
      }
    }
  }
  assert.ok(offered.length > 1, 'at least the pet should offer several expressions')

  for (const { where, variant } of offered) {
    assert.notEqual(variant.label.trim(), '', `${variant.file} has no label for its swatch`)
    for (const file of [variant.file, variant.fileDark ?? null, variant.swatch ?? null]) {
      if (file === null) continue
      try {
        await access(join(ASSETS_DIR, file))
      } catch {
        assert.fail(`${file} is offered by ${where} but missing from assets/`)
      }
    }
  }

  for (const theme of THEMES) {
    for (const layer of LAYERS) {
      const art = resolveLayer(theme, layer)
      if (art.variants === undefined) continue
      const index = art.defaults.variant ?? 0
      assert.ok(
        index >= 0 && index < art.variants.length,
        `${theme.id}/${layer.id} defaults to variant ${index}, outside its list of ${art.variants.length}`,
      )
    }
  }
})

test('the overlay theme offers backdrop choices the figure theme does not', () => {
  // The backdrop list belongs to the overlay theme, so the figure theme must not
  // sprout a stray picker on its background row.
  const overlay = resolveLayer(themeById('overlay'), layerById('background'))
  const figure = resolveLayer(themeById('portrait'), layerById('background'))
  assert.ok((overlay.variants?.length ?? 0) > 1, 'the overlay backdrop should offer several candidates')
  assert.equal(figure.variants, undefined, 'the figure theme should offer no backdrop choice')
})

test('exactly the default backdrop entry follows the mode, and it opens first', () => {
  // The shipped default follows the mode: 09 on a light page, 08 on a dark one. It
  // has to be an entry of its own — were the default also the 亮 entry, then in dark
  // mode picking 亮 would land on the same picture the default already shows, and
  // the picker would read as dead there.
  const backdrop = resolveLayer(themeById('overlay'), layerById('background'))
  const list = backdrop.variants ?? []
  const index = backdrop.defaults.variant ?? 0

  const followers = list.filter(entry => entry.fileDark !== undefined)
  assert.equal(followers.length, 1, 'exactly one entry should vary by mode')
  assert.equal(list[index], followers[0], 'the mode-following entry has to be the default')
  assert.equal(followers[0]?.file, backdrop.file, 'its light cut is the theme light cut')
  assert.equal(followers[0]?.fileDark, backdrop.fileDark, 'and its dark cut the theme dark cut')

  // It must preview itself differently from the plain 亮 entry, or the two swatches
  // look like a duplicate and picking either seems to do the same thing.
  assert.notEqual(followers[0]?.swatch, backdrop.file)
})

test('every backdrop candidate is a distinct swatch and every cut is reachable', () => {
  // Two swatches showing the same picture make it unclear which one is selected, and
  // an entry reachable only in one mode makes the picker look broken in the other.
  const backdrop = resolveLayer(themeById('overlay'), layerById('background'))
  const list = backdrop.variants ?? []
  assert.ok(list.length > 1, 'the overlay backdrop should offer several candidates')

  // Compare what each swatch shows, not what each entry paints: a mode-following
  // entry deliberately previews a composite of its two colourways.
  const previews = list.map(entry => entry.swatch ?? entry.file)
  assert.equal(new Set(previews).size, previews.length, 'candidates must not repeat a swatch')

  // Both colourways the theme ships have to be pickable by hand, each through its own
  // entry — that is the only way dark mode can ever show 09.
  for (const cut of [backdrop.file, backdrop.fileDark]) {
    assert.ok(
      list.some(entry => entry.file === cut && entry.fileDark === undefined),
      `${String(cut)} should be pickable on its own, in either mode`,
    )
  }

  // And the dotted default has to be the entry that follows the mode.
  const index = backdrop.defaults.variant ?? 0
  assert.equal(list[index]?.file, backdrop.file)
})

test('every light-mode panel label clears AA on the hair ground', () => {
  // The base palette's greys sit at 2.5-3.7:1 on the hair green and would
  // vanish, so the panel reparents its whole label ladder. This is the check
  // that keeps that reparenting readable.
  for (const [name, ink] of Object.entries(SKIN_PANEL_LIGHT)) {
    // bg is the ground itself. border-l4 is a decorative hairline between two
    // similar greens, not a boundary that carries information, so it stays out
    // of the text-contrast floor.
    if (name === 'bg' || name === 'border-l4') continue
    const contrast = ratio(ink, SKIN_PANEL_LIGHT.bg)
    assert.ok(
      contrast >= 4.5,
      `light panel ${name} on ${SKIN_PANEL_LIGHT.bg} is ${contrast.toFixed(2)}:1, below 4.5:1`,
    )
  }
  assert.equal(Object.keys(SKIN_PANEL_LIGHT).length, 6)
  assert.match(STYLE_ID, /^dsh-ui-zzz-sunna/)
})

/** Relative luminance per WCAG 2.1. */
function luminance(hex) {
  const digits = hex.replace('#', '')
  const channels = [0, 2, 4].map((offset) => Number.parseInt(digits.slice(offset, offset + 2), 16) / 255)
  return channels.reduce((sum, channel, index) => {
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    return sum + [0.2126, 0.7152, 0.0722][index] * linear
  }, 0)
}

/** Contrast ratio between two colors, 1..21. */
function ratio(first, second) {
  const [low, high] = [luminance(first), luminance(second)].sort((a, b) => a - b)
  return (high + 0.05) / (low + 0.05)
}
