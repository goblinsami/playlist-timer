import type { H3Event } from 'h3'
import type { PreviewSource, SelectionMode, Track } from '../types/playlist'
import { solvePlaylistDuration } from '../services/playlistSolver.service'
import {
  getMockEndCue,
  getMockStartCue,
} from '../services/mockTracks.service'
import {
  filterTracksByArtist,
  getArtistCandidateTracks,
  getCurrentUserPlaylists,
  getLikedTracks,
  getPlaylistItems,
  searchArtistByName,
  SpotifyServiceError,
  type SpotifyArtistMatch,
} from '../services/spotify.service'
import { getPreview, savePreview } from '../services/previewStore.service'

const SPOTIFY_ACCESS_TOKEN_COOKIE = 'spotify_access_token'
const SOURCE_TYPES = new Set(['spotify-search', 'liked-songs', 'user-playlist'])
const SELECTION_MODES = new Set(['recent', 'random'])

type SourceType = 'spotify-search' | 'liked-songs' | 'user-playlist'

interface PreviewRequest {
  sourceType?: unknown
  artist?: unknown
  artistFilter?: unknown
  selectionMode?: unknown
  playlistId?: unknown
  durationMinutes?: unknown
  toleranceSeconds?: unknown
  includeCues?: unknown
}

interface CandidateTrackResult {
  artist: SpotifyArtistMatch
  tracks: Track[]
  source: PreviewSource
}

export default defineEventHandler(async (event) => {
  const body = await readBody<PreviewRequest>(event)
  const sourceType = getSourceType(body.sourceType)
  const durationMinutes = Number(body.durationMinutes)
  const toleranceSeconds = Number(body.toleranceSeconds)

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
  const candidateTrackResult = await getCandidateTracksForSource(event, body, sourceType)
  const result = solvePlaylistDuration({
    tracks: candidateTrackResult.tracks,
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

  const previewId = savePreview({
    artist: {
      name: candidateTrackResult.artist.name,
      spotifyId: candidateTrackResult.artist.id,
      imageUrl: candidateTrackResult.artist.imageUrl,
    },
    targetDurationMs: result.targetDurationMs,
    actualDurationMs: result.actualDurationMs,
    differenceMs: result.differenceMs,
    toleranceMs: result.toleranceMs,
    isWithinTolerance: result.isWithinTolerance,
    tracks: result.tracks,
    source: candidateTrackResult.source,
  })
  const preview = getPreview(previewId)

  if (!preview) {
    throw createError({
      statusCode: 500,
      statusMessage: 'PREVIEW_STORE_ERROR',
    })
  }

  return preview
})

async function getCandidateTracksForSource(
  event: H3Event,
  body: PreviewRequest,
  sourceType: SourceType,
): Promise<CandidateTrackResult> {
  if (sourceType === 'spotify-search') {
    return await getSpotifySearchCandidateTracks(body)
  }

  const accessToken = getCookie(event, SPOTIFY_ACCESS_TOKEN_COOKIE)
  const selectionMode = getSelectionModeForPersonalSource(body.selectionMode)

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'SPOTIFY_AUTH_REQUIRED',
    })
  }

  if (sourceType === 'liked-songs') {
    return await getLikedSongsCandidateTracks(accessToken, body, selectionMode)
  }

  return await getUserPlaylistCandidateTracks(accessToken, body, selectionMode)
}

async function getSpotifySearchCandidateTracks(
  body: PreviewRequest,
): Promise<CandidateTrackResult> {
  const artist = getString(body.artist)

  if (!artist) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Artist is required.',
    })
  }

  const spotifyArtist = await getSpotifyArtistOrThrow(artist)
  const candidateTracks = await getSpotifyTracksOrThrow(
    spotifyArtist.name,
    spotifyArtist.id,
  )

  return {
    artist: spotifyArtist,
    tracks: candidateTracks,
    source: {
      type: 'spotify-search',
    },
  }
}

async function getLikedSongsCandidateTracks(
  accessToken: string,
  body: PreviewRequest,
  selectionMode: SelectionMode,
): Promise<CandidateTrackResult> {
  const artistFilter = getString(body.artistFilter)
  const tracks = await getPersonalTracksOrThrow(() => getLikedTracks(accessToken, selectionMode))
  const filteredTracks = filterPersonalTracks(tracks, artistFilter)

  logPersonalSourcePreview({
    sourceType: 'liked-songs',
    selectionMode,
    candidateCountBeforeFilter: tracks.length,
    candidateCountAfterFilter: filteredTracks.length,
  })

  return {
    artist: {
      id: '',
      name: artistFilter || 'Liked Songs',
    },
    tracks: filteredTracks,
    source: {
      type: 'liked-songs',
      selectionMode,
    },
  }
}

async function getUserPlaylistCandidateTracks(
  accessToken: string,
  body: PreviewRequest,
  selectionMode: SelectionMode,
): Promise<CandidateTrackResult> {
  const playlistId = getString(body.playlistId)
  const artistFilter = getString(body.artistFilter)

  if (!playlistId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'PLAYLIST_ID_REQUIRED',
    })
  }

  const playlists = await getPlaylistsOrThrow(accessToken)
  const selectedPlaylist = playlists.find(playlist => playlist.id === playlistId)

  if (!selectedPlaylist) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PLAYLIST_NOT_FOUND',
    })
  }

  const tracks = await getPersonalTracksOrThrow(() =>
    getPlaylistItems(accessToken, playlistId, selectionMode),
  )
  const filteredTracks = filterPersonalTracks(tracks, artistFilter)

  logPersonalSourcePreview({
    sourceType: 'user-playlist',
    selectionMode,
    totalAvailable: selectedPlaylist.totalItems,
    candidateCountBeforeFilter: tracks.length,
    candidateCountAfterFilter: filteredTracks.length,
  })

  return {
    artist: {
      id: '',
      name: artistFilter || selectedPlaylist.name,
    },
    tracks: filteredTracks,
    source: {
      type: 'user-playlist',
      selectionMode,
      playlistId,
      playlistName: selectedPlaylist.name,
    },
  }
}

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

async function getPersonalTracksOrThrow(loadTracks: () => Promise<Track[]>): Promise<Track[]> {
  try {
    const tracks = await loadTracks()

    if (tracks.length === 0) {
      throw new SpotifyServiceError(
        'NO_TRACKS_FOUND',
        'Spotify source did not return usable tracks.',
      )
    }

    return tracks
  }
  catch (error: unknown) {
    throw toPreviewError(error, 'SPOTIFY_SEARCH_ERROR')
  }
}

async function getPlaylistsOrThrow(accessToken: string) {
  try {
    return await getCurrentUserPlaylists(accessToken)
  }
  catch (error: unknown) {
    throw toPreviewError(error, 'PLAYLISTS_LOAD_FAILED')
  }
}

function filterPersonalTracks(tracks: Track[], artistFilter: string): Track[] {
  const filteredTracks = filterTracksByArtist(tracks, artistFilter)

  if (artistFilter && filteredTracks.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'NO_TRACKS_FOUND_FOR_FILTER',
    })
  }

  if (filteredTracks.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'NO_TRACKS_FOUND',
    })
  }

  return filteredTracks
}

function getSourceType(value: unknown): SourceType {
  if (typeof value === 'string' && SOURCE_TYPES.has(value)) {
    return value as SourceType
  }

  return 'spotify-search'
}

function getSelectionModeForPersonalSource(value: unknown): SelectionMode {
  if (value === undefined || value === null || value === '') {
    return 'random'
  }

  if (typeof value === 'string' && SELECTION_MODES.has(value)) {
    return value as SelectionMode
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'INVALID_SELECTION_MODE',
  })
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function logPersonalSourcePreview(details: {
  sourceType: SourceType
  selectionMode: SelectionMode
  totalAvailable?: number
  candidateCountBeforeFilter: number
  candidateCountAfterFilter: number
}): void {
  console.info('[preview]', details)
}

function isH3Error(error: unknown): boolean {
  return Boolean(
    typeof error === 'object'
    && error !== null
    && 'statusCode' in error
    && 'statusMessage' in error,
  )
}

function toPreviewError(error: unknown, fallbackCode: string) {
  if (error instanceof SpotifyServiceError) {
    return createError({
      statusCode: getSpotifyErrorStatusCode(error.code),
      statusMessage: error.code,
    })
  }

  if (isH3Error(error)) {
    return error
  }

  return createError({
    statusCode: 502,
    statusMessage: fallbackCode,
  })
}

function getSpotifyErrorStatusCode(errorCode: SpotifyServiceError['code']): number {
  if (
    errorCode === 'ARTIST_NOT_FOUND'
    || errorCode === 'NO_TRACKS_FOUND'
    || errorCode === 'NO_TRACKS_FOUND_FOR_FILTER'
    || errorCode === 'PLAYLIST_NOT_FOUND'
  ) {
    return 404
  }

  if (errorCode === 'SPOTIFY_AUTH_ERROR') {
    return 401
  }

  if (errorCode === 'PLAYLIST_ITEMS_FORBIDDEN') {
    return 403
  }

  return 502
}
