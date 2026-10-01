// Standalone build faces for this client plugin. The monorepo `clientBundle`
// preset resolves workspace manifests with a glob over the monorepo's
// package tree, so an out-of-tree package restates the two artifact contracts
// it needs: the Node-half library the Loader imports, and the browser
// closure-factory bundle the client module table registers under
// `window.__ModuleLoader__`.
//
// Kept as .mjs: tsdown's native TypeScript config loader trips a Node parsing
// bug on this runtime, and a JavaScript config removes that whole failure
// class. Note: a block comment here would need to avoid any literal `*/`
// sequence (a glob written inside `/* */` terminates the comment early and
// Node fails to parse the file).

const ID = 'dsh-ui-zzz-sunna'

export default [
  {
    name: 'node-lib',
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  {
    name: 'client',
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    sourcemap: true,
    clean: false,
    outputOptions: {
      entryFileNames: 'client.js',
      sourcemapExcludeSources: false,
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
]
