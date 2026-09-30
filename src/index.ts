/**
 * Host half: serve this package's `assets/` directory over one webserver route,
 * so the browser half can reference images by URL instead of carrying them as
 * inlined data URIs. Swapping a picture is then dropping a file in `assets/`
 * and editing `src/client/slots.ts` — no base64, no bundle bloat.
 *
 * The service is optional on purpose: a profile with no webserver should still
 * get the token layer and the figures, so this must not become a hard injection.
 * It is injected *optionally* rather than read once, though: `ctx.get` at load
 * time only works if the webserver happens to be up already, and a cold start can
 * run this half first. When that happened the route was never registered and the
 * symptom was misleading — colours and the board were fine, only the pictures
 * 404'd.
 */

import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { ASSET_EXTENSIONS, ASSET_PREFIX } from './paths.ts'

/** The narrow slice of the webserver service this plugin actually uses. */
interface AssetRouter {
  register(route: {
    kind: 'prefix'
    path: string
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  }): () => void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The browser http carrier, when this profile has one. */
    webServer?: AssetRouter
  }
}

/** The package's assets directory, from either the source or the built entry. */
const ASSETS_DIR = fileURLToPath(new URL('../assets', import.meta.url))

/**
 * Mount the asset route as soon as the profile has a webserver.
 *
 * Optional injection: the callback runs when the service appears, and a profile
 * that never provides one simply never serves pictures — the rest of the plugin
 * still applies.
 * @param ctx - the plugin context.
 */
export function apply(ctx: Context): void {
  ctx.inject(['webServer'], served => {
    const router = served.get('webServer')
    if (router === undefined) return
    served.effect(() => router.register({ kind: 'prefix', path: ASSET_PREFIX, handler: serveAsset }),
      'dsh-ui-zzz-sunna: asset route')
  })
}

/**
 * Resolve a request path to an asset file name.
 *
 * A prefix route may hand over the path with the mount prefix still attached or
 * already stripped, depending on the carrier, so both shapes are accepted — a
 * wrong guess here reads as "every picture 404s".
 * @param url - the raw request url, query string included.
 * @returns the decoded file name, or undefined when it names nothing servable.
 */
function assetName(url: string | undefined): string | undefined {
  const path = (url ?? '/').split('?')[0]
  if (path === undefined) return undefined
  const relative = path.startsWith(`${ASSET_PREFIX}/`)
    ? path.slice(ASSET_PREFIX.length + 1)
    : path.replace(/^\/+/, '')
  if (relative === '') return undefined
  try {
    return decodeURIComponent(relative)
  } catch {
    return undefined
  }
}

/**
 * Answer one request under the asset prefix with a file from the assets
 * directory. Extension allowlist first, then traversal check, then read.
 * @param req - the incoming request; only GET and HEAD are answered.
 * @param res - the response to own.
 */
async function serveAsset(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }

  const name = assetName(req.url)
  if (name === undefined) {
    res.writeHead(404)
    res.end()
    return
  }

  if (ASSET_EXTENSIONS[extname(name)] === undefined) {
    res.writeHead(404)
    res.end()
    return
  }

  const target = resolve(normalize(join(ASSETS_DIR, name)))
  // `sep`, not '/': resolve() emits backslashes on Windows, where a '/' suffix
  // rejects every legitimate asset as traversal.
  if (target !== ASSETS_DIR && !target.startsWith(ASSETS_DIR + sep)) {
    res.writeHead(403)
    res.end()
    return
  }

  try {
    const body = await readFile(target)
    res.writeHead(200, {
      'content-type': ASSET_EXTENSIONS[extname(target)],
      'cache-control': 'no-cache',
    })
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT' || code === 'EISDIR' || code === 'ENOTDIR') {
      res.writeHead(404)
      res.end()
      return
    }
    throw error
  }
}
