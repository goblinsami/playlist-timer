import { solvePlaylistDuration } from '../services/playlistSolver.service'
import {
  getMockEndCue,
  getMockStartCue,
  getMockTracks,
} from '../services/mockTracks.service'

interface PreviewRequest {
  artist?: unknown
  durationMinutes?: unknown
  toleranceSeconds?: unknown
  includeCues?: unknown
}

export default defineEventHandler(async (event) => {
  const body = await readBody<PreviewRequest>(event)
  const artist = typeof body.artist === 'string' ? body.artist.trim() : ''
  const durationMinutes = Number(body.durationMinutes)
  const toleranceSeconds = Number(body.toleranceSeconds)

  if (!artist) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Artist is required.',
    })
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Duration must be greater than 0 minutes.',
    })
  }

  if (!Number.isFinite(toleranceSeconds) || toleranceSeconds <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tolerance must be greater than 0 seconds.',
    })
  }

  const includeCues = body.includeCues === true
  const targetDurationMs = Math.round(durationMinutes * 60_000)
  const toleranceMs = Math.round(toleranceSeconds * 1_000)
  const result = solvePlaylistDuration({
    tracks: getMockTracks(artist),
    targetDurationMs,
    toleranceMs,
    startCue: includeCues ? getMockStartCue() : undefined,
    endCue: includeCues ? getMockEndCue() : undefined,
  })

  return {
    previewId: 'mock-preview-id',
    artist: {
      name: artist,
    },
    targetDurationMs: result.targetDurationMs,
    actualDurationMs: result.actualDurationMs,
    differenceMs: result.differenceMs,
    isWithinTolerance: result.isWithinTolerance,
    tracks: result.tracks,
  }
})
