import { randomUUID } from 'node:crypto'
import type { Track } from '../types/playlist'

const PREVIEW_TTL_MS = 30 * 60 * 1_000

export interface PreviewArtist {
  name: string
  spotifyId?: string
  imageUrl?: string
}

export interface StoredPreview {
  previewId: string
  artist: PreviewArtist
  targetDurationMs: number
  actualDurationMs: number
  differenceMs: number
  toleranceMs: number
  isWithinTolerance: boolean
  tracks: Track[]
  createdAt: string
  expiresAt: string
}

export type PreviewToSave = Omit<
  StoredPreview,
  'previewId' | 'createdAt' | 'expiresAt'
>

const previews = new Map<string, StoredPreview>()

export function savePreview(preview: PreviewToSave): string {
  cleanupExpiredPreviews()

  const now = Date.now()
  const previewId = createPreviewId()
  const storedPreview: StoredPreview = {
    ...preview,
    previewId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PREVIEW_TTL_MS).toISOString(),
  }

  previews.set(previewId, storedPreview)

  return previewId
}

export function getPreview(previewId: string): StoredPreview | null {
  const preview = previews.get(previewId)

  if (!preview) {
    return null
  }

  if (isExpired(preview)) {
    previews.delete(previewId)
    return null
  }

  return preview
}

export function cleanupExpiredPreviews(): void {
  for (const [previewId, preview] of previews.entries()) {
    if (isExpired(preview)) {
      previews.delete(previewId)
    }
  }
}

function isExpired(preview: StoredPreview): boolean {
  return Date.parse(preview.expiresAt) <= Date.now()
}

function createPreviewId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return randomUUID()
}
