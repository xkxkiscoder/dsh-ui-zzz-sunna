/**
 * Drag-to-place for the pet surface.
 *
 * The pet is the only surface that takes pointer events, because it is meant to
 * be parked wherever it looks right — something a symmetric margin slider cannot
 * express. Its placement lives in its own storage entry rather than in the board's,
 * so moving the pet never rewrites a theme's tuning.
 *
 * The stylesheet reads the placement from two custom properties; the element
 * itself belongs to the skin half, so this only has to find it.
 */
import { PET_CLASS } from './skin.ts'

/** Storage key holding the pet's placement. */
const STORAGE_KEY = 'dsh-ui-zzz-sunna:pet'

/** How far the pet keeps from the window's edges until someone moves it. */
const DEFAULT_MARGIN = 24

/** The size the stylesheet gives the pet before anyone resizes it. */
const DEFAULT_SIZE = 120

/** One stored placement, in pixels from the window's top-left corner. */
interface PetPlacement {
  x: number
  y: number
}

/**
 * Where the pet sits until someone moves it: the bottom-right corner.
 *
 * Worked out from the window instead of stored, because placement is a free
 * coordinate now — there is no right/bottom anchor left to lean on.
 */
function defaultPosition(): PetPlacement {
  return {
    x: Math.max(DEFAULT_MARGIN, window.innerWidth - DEFAULT_SIZE - DEFAULT_MARGIN),
    y: Math.max(DEFAULT_MARGIN, window.innerHeight - DEFAULT_SIZE - DEFAULT_MARGIN),
  }
}

/** Read the stored placement, falling back to the corner. */
function loadPosition(): PetPlacement {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return defaultPosition()
    const parsed = JSON.parse(raw) as Partial<PetPlacement>
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return { x: parsed.x, y: parsed.y }
    }
  } catch {
    // Unreadable storage means the corner, not a broken pet.
  }
  return defaultPosition()
}

/** Persist the placement; a failure only costs persistence. */
function savePosition(position: PetPlacement): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
  } catch {
    // Ignored on purpose: the move already landed on :root.
  }
}

/** Publish the placement where the stylesheet reads it. */
function applyPosition(position: PetPlacement): void {
  const root = document.documentElement
  root.style.setProperty('--dsz-pet-x', String(position.x))
  root.style.setProperty('--dsz-pet-y', String(position.y))
}

/** Drop the published placement. */
function clearPosition(): void {
  const root = document.documentElement
  root.style.removeProperty('--dsz-pet-x')
  root.style.removeProperty('--dsz-pet-y')
}

/**
 * Install drag handling on the pet element.
 * @returns disposer removing the listeners and the published placement.
 */
export function installPetDrag(): () => void {
  const element = document.querySelector<HTMLElement>(`.${PET_CLASS}`)
  const position = loadPosition()
  applyPosition(position)
  if (element === null) return clearPosition

  let dragging = false
  let grabX = 0
  let grabY = 0
  let originX = 0
  let originY = 0

  const onDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    dragging = true
    grabX = event.clientX
    grabY = event.clientY
    originX = position.x
    originY = position.y
    element.setPointerCapture(event.pointerId)
    element.dataset.dragging = ''
    // Stop the drag from selecting whatever text sits under the pointer.
    event.preventDefault()
  }

  const onMove = (event: PointerEvent): void => {
    if (!dragging) return
    // It may hang off an edge by up to half its own size, but no further.
    const slack = element.offsetWidth / 2
    position.x = Math.round(Math.min(Math.max(originX + event.clientX - grabX, -slack), window.innerWidth - slack))
    position.y = Math.round(Math.min(Math.max(originY + event.clientY - grabY, -slack), window.innerHeight - slack))
    applyPosition(position)
  }

  const onUp = (event: PointerEvent): void => {
    if (!dragging) return
    dragging = false
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
    delete element.dataset.dragging
    savePosition(position)
  }

  element.addEventListener('pointerdown', onDown)
  element.addEventListener('pointermove', onMove)
  element.addEventListener('pointerup', onUp)
  element.addEventListener('pointercancel', onUp)

  return () => {
    element.removeEventListener('pointerdown', onDown)
    element.removeEventListener('pointermove', onMove)
    element.removeEventListener('pointerup', onUp)
    element.removeEventListener('pointercancel', onUp)
    delete element.dataset.dragging
    clearPosition()
  }
}
