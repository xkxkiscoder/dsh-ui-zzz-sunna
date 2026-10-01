/**
 * The asset contract shared by both halves. The host half serves the package
 * `assets/` directory under `ASSET_PREFIX` and answers only the extensions in
 * `ASSET_EXTENSIONS`; the client half points its slots at files under the same
 * prefix. One place for both so they cannot drift: a prefix mismatch is a
 * silent 404 with no error anywhere, and an extension the host refuses would
 * make a configured slot quietly invisible.
 */
export const ASSET_PREFIX = '/dsh-ui-zzz-sunna/assets'

/** Extensions the host route will answer, keyed by extension with its MIME type. */
export const ASSET_EXTENSIONS: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  // The launch splash is a clip, not a still: without this entry the route
  // refuses it with a plain 404 and the overlay never gets a frame to show.
  '.mp4': 'video/mp4',
}
