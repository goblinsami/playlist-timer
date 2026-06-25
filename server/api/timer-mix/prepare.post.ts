import { randomUUID } from 'node:crypto'
import type { PreviewSourceType, SelectionMode, Track } from '../../types/playlist'
import {
  filterTracksByArtist,
  getArtistCandidateTracks,
  getCurrentUserPlaylists,
  getLikedTracks,
  getPlaylistItems,
  searchArtistByName,
  SpotifyServiceError,
} from '../../services/spotify.service'

const SPOTIFY_ACCESS_TOKEN_COOKIE = 'spotify_access_token'
const SOURCE_TYPES = new Set(['spotify-search', 'liked-songs', 'user-playlist'])
const SELECTION_MODES = new Set(['recent', 'random'])
const SHORT_TRACK_WARNING = 'SHORT_TRACK_WARNING'

interface TimerMixPrepareRequest {
  sourceType?: unknown
  artist?: unknown
  artistFilter?: unknown
  playlistId?: unknown
  durationMinutes?: unknown
  songCount?: unknown
  fadeSeconds?: unknown
  selectionMode?: unknown
}

interface TimerMixSource {
  type: PreviewSourceType
  artist?: string
  artistFilter?: string
  playlistId?: string
  playlistName?: string
  selectionMode?: SelectionMode
}

export default defineEventHandler(async (event) => {
  const body = await readBody<TimerMixPrepareRequest>(event)
  const sourceType = getSourceType(body.sourceType)
  const durationMinutes = getBoundedNumber(body.durationMinutes, 1, 30, 'DURATION_REQUIRED')
  const songCount = getBoundedInteger(body.songCount, 1, 10, 'SONG_COUNT_REQUIRED')
  const fadeSeconds = body.fadeSeconds === undefined || body.fadeSeconds === null || body.fadeSeconds === ''
    ? 5
    : getBoundedNumber(body.fadeSeconds, 0, 15, 'INVALID_FADE_SECONDS')
  const selectionMode = getSelectionMode(body.selectionMode)
  const accessToken = getCookie(event, SPOTIFY_ACCESS_TOKEN_COOKIE)
  const { tracks, source } = await collectTracks({
    body,
    sourceType,
    selectionMode,
    accessToken,
  })
  const totalDurationMs = Math.round(durationMinutes * 60_000)
  const fadeDurationMs = Math.round(fadeSeconds * 1_000)
  const blockDurationMs = Math.round(totalDurationMs / songCount)
  const uniqueTracks = dedupeTracks(tracks)

  if (uniqueTracks.length < songCount) {
    throw createError({
      statusCode: 422,
      statusMessage: 'NOT_ENOUGH_TRACKS',
    })
  }

  const { selectedTracks, warnings } = selectTimerMixTracks(
    uniqueTracks,
    songCount,
    blockDurationMs,
    selectionMode,
  )

  return {
    mixId: randomUUID(),
    source,
    totalDurationMs,
    songCount,
    fadeDurationMs,
    blockDurationMs,
    tracks: selectedTracks.map(toTimerMixTrack),
    warnings,
  }
})

async function collectTracks(
  input: {
    body: TimerMixPrepareRequest
    sourceType: PreviewSourceType
    selectionMode: SelectionMode
    accessToken?: string
  },
): Promise<{ tracks: Track[], source: TimerMixSource }> {
  if (input.sourceType === 'spotify-search') {
    return await collectSpotifySearchTracks(input.body)
  }

  if (!input.accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'SPOTIFY_AUTH_REQUIRED',
    })
  }

  if (input.sourceType === 'liked-songs') {
    return await collectLikedSongsTracks(input.accessToken, input.body, input.selectionMode)
  }

  return await collectPlaylistTracks(
    input.accessToken,
    input.body,
    input.selectionMode,
  )
}

async function collectSpotifySearchTracks(
  body: TimerMixPrepareRequest,
): Promise<{ tracks: Track[], source: TimerMixSource }> {
  const artist = getString(body.artist)

  if (!artist) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ARTIST_REQUIRED',
    })
  }

  try {
    const spotifyArtist = await searchArtistByName(artist)
    const tracks = await getArtistCandidateTracks(spotifyArtist.name, spotifyArtist.id)

    return {
      tracks,
      source: {
        type: 'spotify-search',
        artist: spotifyArtist.name,
      },
    }
  }
  catch (error: unknown) {
    throw toTimerMixError(error, 'SPOTIFY_SEARCH_ERROR')
  }
}

async function collectLikedSongsTracks(
  accessToken: string,
  body: TimerMixPrepareRequest,
  selectionMode: SelectionMode,
): Promise<{ tracks: Track[], source: TimerMixSource }> {
  const artistFilter = getString(body.artistFilter)
  const tracks = await getPersonalTracksOrThrow(() => getLikedTracks(accessToken, selectionMode))
  const filteredTracks = filterTracksOrThrow(tracks, artistFilter)

  return {
    tracks: filteredTracks,
    source: {
      type: 'liked-songs',
      artistFilter,
      selectionMode,
    },
  }
}

async function collectPlaylistTracks(
  accessToken: string,
  body: TimerMixPrepareRequest,
  selectionMode: SelectionMode,
): Promise<{ tracks: Track[], source: TimerMixSource }> {
  const playlistId = getString(body.playlistId)
  const artistFilter = getString(body.artistFilter)

  if (!playlistId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'PLAYLIST_ID_REQUIRED',
    })
  }

  try {
    const playlists = await getCurrentUserPlaylists(accessToken)
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
    const filteredTracks = filterTracksOrThrow(tracks, artistFilter)

    return {
      tracks: filteredTracks,
      source: {
        type: 'user-playlist',
        playlistId,
        playlistName: selectedPlaylist.name,
        artistFilter,
        selectionMode,
      },
    }
  }
  catch (error: unknown) {
    throw toTimerMixError(error, 'PLAYLISTS_LOAD_FAILED')
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
    throw toTimerMixError(error, 'SPOTIFY_SEARCH_ERROR')
  }
}

function filterTracksOrThrow(tracks: Track[], artistFilter: string): Track[] {
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

function selectTimerMixTracks(
  tracks: Track[],
  songCount: number,
  blockDurationMs: number,
  selectionMode: SelectionMode,
): { selectedTracks: Track[], warnings: string[] } {
  const longTracks = tracks.filter(track => track.durationMs > blockDurationMs)
  const sourceTracks = longTracks.length >= songCount ? longTracks : tracks
  const selectedTracks = (selectionMode === 'random' ? shuffleTracks(sourceTracks) : sourceTracks)
    .slice(0, songCount)
  const warnings = longTracks.length >= songCount
    ? []
    : [SHORT_TRACK_WARNING]

  return {
    selectedTracks,
    warnings,
  }
}

function dedupeTracks(tracks: Track[]): Track[] {
  const seenUris = new Set<string>()
  const uniqueTracks: Track[] = []

  for (const track of tracks) {
    if (!track.spotifyUri?.startsWith('spotify:track:') || seenUris.has(track.spotifyUri)) {
      continue
    }

    seenUris.add(track.spotifyUri)
    uniqueTracks.push(track)
  }

  return uniqueTracks
}

function shuffleTracks(tracks: Track[]): Track[] {
  return [...tracks].sort(() => Math.random() - 0.5)
}

function toTimerMixTrack(track: Track) {
  return {
    id: track.id,
    name: track.name,
    artist: track.artist,
    artists: track.artists ?? [track.artist],
    durationMs: track.durationMs,
    spotifyUri: track.spotifyUri,
  }
}

function getSourceType(value: unknown): PreviewSourceType {
  if (typeof value === 'string' && SOURCE_TYPES.has(value)) {
    return value as PreviewSourceType
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'SOURCE_TYPE_REQUIRED',
  })
}

function getSelectionMode(value: unknown): SelectionMode {
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

function getBoundedNumber(value: unknown, min: number, max: number, code: string): number {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    throw createError({
      statusCode: 400,
      statusMessage: code,
    })
  }

  return numberValue
}

function getBoundedInteger(value: unknown, min: number, max: number, code: string): number {
  const numberValue = getBoundedNumber(value, min, max, code)

  if (!Number.isInteger(numberValue)) {
    throw createError({
      statusCode: 400,
      statusMessage: code,
    })
  }

  return numberValue
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isH3Error(error: unknown): boolean {
  return Boolean(
    typeof error === 'object'
    && error !== null
    && 'statusCode' in error
    && 'statusMessage' in error,
  )
}

function toTimerMixError(error: unknown, fallbackCode: string) {
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

  if (errorCode === 'NOT_ENOUGH_TRACKS') {
    return 422
  }

  if (errorCode === 'SPOTIFY_AUTH_ERROR') {
    return 401
  }

  if (errorCode === 'PLAYLIST_ITEMS_FORBIDDEN') {
    return 403
  }

  return 502
}
