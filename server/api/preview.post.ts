import { solvePlaylistDuration } from '../services/playlistSolver.service'
import {
  getMockEndCue,
  getMockStartCue,
} from '../services/mockTracks.service'
import {
  getArtistCandidateTracks,
  searchArtistByName,
  SpotifyServiceError,
} from '../services/spotify.service'

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
  const spotifyArtist = await getSpotifyArtistOrThrow(artist)
  const candidateTracks = await getSpotifyTracksOrThrow(
    spotifyArtist.name,
    spotifyArtist.id,
  )
  const result = solvePlaylistDuration({
    tracks: candidateTracks,
    targetDurationMs,
    toleranceMs,
    startCue: includeCues ? getMockStartCue() : undefined,
    endCue: includeCues ? getMockEndCue() : undefined,
  })
  const realTrackCount = result.tracks.filter(track => !track.isCue).length

  if (realTrackCount === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'NO_MATCH_FOUND',
    })
  }

  return {
    previewId: 'spotify-preview-id',
    artist: {
      name: spotifyArtist.name,
      spotifyId: spotifyArtist.id,
      imageUrl: spotifyArtist.imageUrl,
    },
    targetDurationMs: result.targetDurationMs,
    actualDurationMs: result.actualDurationMs,
    differenceMs: result.differenceMs,
    isWithinTolerance: result.isWithinTolerance,
    tracks: result.tracks,
  }
})

async function getSpotifyArtistOrThrow(artistName: string) {
  try {
    return await searchArtistByName(artistName)
  }
  catch (error: unknown) {
    throw toPreviewError(error, 'SPOTIFY_SEARCH_ERROR')
  }
}

async function getSpotifyTracksOrThrow(artistName: string, artistId: string) {
  try {
    return await getArtistCandidateTracks(artistName, artistId)
  }
  catch (error: unknown) {
    throw toPreviewError(error, 'SPOTIFY_SEARCH_ERROR')
  }
}

function toPreviewError(error: unknown, fallbackCode: string) {
  if (error instanceof SpotifyServiceError) {
    return createError({
      statusCode: getSpotifyErrorStatusCode(error.code),
      statusMessage: error.code,
    })
  }

  return createError({
    statusCode: 502,
    statusMessage: fallbackCode,
  })
}

function getSpotifyErrorStatusCode(errorCode: SpotifyServiceError['code']): number {
  if (errorCode === 'ARTIST_NOT_FOUND' || errorCode === 'NO_TRACKS_FOUND') {
    return 404
  }

  return 502
}
