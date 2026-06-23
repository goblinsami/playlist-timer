import type { Track } from '../types/playlist'

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_URL = 'https://api.spotify.com/v1'
const TRACK_SEARCH_LIMIT = 10

type SpotifyErrorCode =
  | 'ARTIST_NOT_FOUND'
  | 'NO_TRACKS_FOUND'
  | 'SPOTIFY_AUTH_ERROR'
  | 'SPOTIFY_SEARCH_ERROR'

interface CachedToken {
  accessToken: string
  expiresAtMs: number
}

interface SpotifyTokenResponse {
  access_token?: string
  expires_in?: number
}

interface SpotifyImage {
  url: string
}

interface SpotifyArtist {
  id: string
  name: string
  popularity?: number
  images?: SpotifyImage[]
}

interface SpotifySearchResponse {
  artists?: {
    items?: SpotifyArtist[]
  }
  tracks?: {
    items?: SpotifySearchTrack[]
  }
}

interface SpotifyTrackArtist {
  id?: string
  name: string
}

interface SpotifySearchTrack {
  id: string | null
  name: string
  artists?: SpotifyTrackArtist[]
  duration_ms: number
  uri?: string
  popularity?: number
}

export interface SpotifyArtistMatch {
  id: string
  name: string
  imageUrl?: string
}

export class SpotifyServiceError extends Error {
  constructor(
    public readonly code: SpotifyErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'SpotifyServiceError'
  }
}

let cachedToken: CachedToken | null = null

export async function getSpotifyAppAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now()) {
    return cachedToken.accessToken
  }

  const { clientId, clientSecret } = getSpotifyCredentials()

  if (!clientId || !clientSecret) {
    throw new SpotifyServiceError(
      'SPOTIFY_AUTH_ERROR',
      'Spotify client credentials are not configured.',
    )
  }

  logSpotifyStep('requesting app access token', {
    url: SPOTIFY_TOKEN_URL,
  })

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logSpotifyFailure(
      'token request failure',
      response.status,
      errorBody,
      SPOTIFY_TOKEN_URL,
    )

    throw new SpotifyServiceError(
      'SPOTIFY_AUTH_ERROR',
      `Spotify token request failed with status ${response.status}.`,
    )
  }

  const data = await response.json() as SpotifyTokenResponse

  if (!data.access_token) {
    logSpotifyFailure(
      'token request failure',
      response.status,
      'Spotify token response did not include an access token.',
      SPOTIFY_TOKEN_URL,
    )

    throw new SpotifyServiceError(
      'SPOTIFY_AUTH_ERROR',
      'Spotify token response did not include an access token.',
    )
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAtMs: Date.now() + Math.max((data.expires_in ?? 3_600) - 60, 60) * 1_000,
  }

  logSpotifyStep('token request success', {
    url: SPOTIFY_TOKEN_URL,
    expiresIn: getSpotifyAppTokenExpiresInSeconds(),
  })

  return cachedToken.accessToken
}

export function getSpotifyAppTokenExpiresInSeconds(): number {
  if (!cachedToken) {
    return 0
  }

  return Math.max(0, Math.floor((cachedToken.expiresAtMs - Date.now()) / 1_000))
}

export async function searchArtistByName(
  artistName: string,
): Promise<SpotifyArtistMatch> {
  const searchParams = new URLSearchParams({
    q: artistName,
    type: 'artist',
    limit: '5',
  })
  const data = await spotifyApiFetch<SpotifySearchResponse>(
    `/search?${searchParams.toString()}`,
    'search artist',
    'SPOTIFY_SEARCH_ERROR',
  )
  const artists = data.artists?.items ?? []
  const selectedArtist = selectBestArtistMatch(artistName, artists)

  if (!selectedArtist) {
    throw new SpotifyServiceError(
      'ARTIST_NOT_FOUND',
      `No Spotify artist found for "${artistName}".`,
    )
  }

  return {
    id: selectedArtist.id,
    name: selectedArtist.name,
    imageUrl: selectedArtist.images?.[0]?.url,
  }
}

export async function getArtistCandidateTracks(
  artistName: string,
  artistId?: string,
): Promise<Track[]> {
  const tracks = await searchCandidateTracksWithFallback(artistName, artistId)
  const mappedTracks = tracks.map(mapSpotifyTrack)

  if (mappedTracks.length === 0) {
    throw new SpotifyServiceError(
      'NO_TRACKS_FOUND',
      'Spotify track search did not return usable tracks for this artist.',
    )
  }

  return mappedTracks
}

async function searchCandidateTracksWithFallback(
  artistName: string,
  artistId?: string,
): Promise<SpotifySearchTrack[]> {
  const fieldQueryTracks = await safelySearchTracks(`artist:${artistName}`)

  if (fieldQueryTracks.length > 0) {
    const validTracks = getValidMatchingTracks(fieldQueryTracks, artistName, artistId)

    if (validTracks.length > 0) {
      return validTracks
    }
  }

  const fallbackTracks = await searchTracks(artistName)

  return getValidMatchingTracks(fallbackTracks, artistName, artistId)
}

async function safelySearchTracks(query: string): Promise<SpotifySearchTrack[]> {
  try {
    return await searchTracks(query)
  }
  catch (error: unknown) {
    if (error instanceof SpotifyServiceError && error.code === 'SPOTIFY_SEARCH_ERROR') {
      return []
    }

    throw error
  }
}

async function searchTracks(query: string): Promise<SpotifySearchTrack[]> {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: String(TRACK_SEARCH_LIMIT),
    market: 'ES',
  })
  const url = `${SPOTIFY_API_URL}/search?${params.toString()}`
  const data = await spotifyApiFetchUrl<SpotifySearchResponse>(
    url,
    'track-search',
    'SPOTIFY_SEARCH_ERROR',
  )

  if (!Array.isArray(data.tracks?.items)) {
    logSpotifyFailure(
      'track-search',
      200,
      JSON.stringify(data),
      url,
    )

    throw new SpotifyServiceError(
      'SPOTIFY_SEARCH_ERROR',
      'Spotify track search response did not include tracks.items.',
    )
  }

  return data.tracks.items
}

async function spotifyApiFetch<T>(
  path: string,
  stepName: string,
  errorCode: SpotifyErrorCode,
): Promise<T> {
  const url = `${SPOTIFY_API_URL}${path}`

  return await spotifyApiFetchUrl<T>(url, stepName, errorCode)
}

async function spotifyApiFetchUrl<T>(
  url: string,
  stepName: string,
  errorCode: SpotifyErrorCode,
): Promise<T> {
  logSpotifyStep(`${stepName} request`, {
    url,
  })

  const token = await getSpotifyAppAccessToken()
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logSpotifyFailure(stepName, response.status, errorBody, url)

    if (response.status === 401) {
      cachedToken = null
    }

    throw new SpotifyServiceError(
      errorCode,
      `${stepName} failed with status ${response.status}.`,
    )
  }

  logSpotifyStep(`${stepName} success`, {
    url,
    status: response.status,
  })

  return await response.json() as T
}

function getSpotifyCredentials(): { clientId: string, clientSecret: string } {
  const config = useRuntimeConfig()
  const clientId = getRuntimeConfigString(config.spotifyClientId)
  const clientSecret = getRuntimeConfigString(config.spotifyClientSecret)

  return {
    clientId,
    clientSecret,
  }
}

function getRuntimeConfigString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function logSpotifyStep(stepName: string, details: Record<string, unknown>): void {
  console.info('[spotify]', {
    step: stepName,
    ...details,
  })
}

function logSpotifyFailure(
  stepName: string,
  status: number,
  responseBody: string,
  requestUrl: string,
): void {
  console.error('[spotify]', {
    step: stepName,
    status,
    body: responseBody,
    url: requestUrl,
  })
}

function selectBestArtistMatch(
  requestedName: string,
  artists: SpotifyArtist[],
): SpotifyArtist | undefined {
  const normalizedRequestedName = normalizeName(requestedName)
  const exactMatch = artists.find(
    artist => normalizeName(artist.name) === normalizedRequestedName,
  )

  if (exactMatch) {
    return exactMatch
  }

  return [...artists].sort(
    (left, right) => (right.popularity ?? 0) - (left.popularity ?? 0),
  )[0]
}

function dedupeSpotifyTracks(tracks: SpotifySearchTrack[]): SpotifySearchTrack[] {
  const seenIds = new Set<string>()
  const seenNames = new Set<string>()
  const uniqueTracks: SpotifySearchTrack[] = []

  for (const track of tracks) {
    if (
      !track.id
      || !track.uri
      || !Number.isFinite(track.duration_ms)
      || track.duration_ms <= 0
    ) {
      continue
    }

    const normalizedTrackName = normalizeName(track.name)

    if (seenIds.has(track.id) || seenNames.has(normalizedTrackName)) {
      continue
    }

    seenIds.add(track.id)
    seenNames.add(normalizedTrackName)
    uniqueTracks.push(track)
  }

  return uniqueTracks
}

function mapSpotifyTrack(
  track: SpotifySearchTrack,
): Track {
  return {
    id: track.id ?? track.uri ?? track.name,
    name: track.name,
    artist: formatTrackArtists(track.artists),
    durationMs: track.duration_ms,
    spotifyUri: track.uri,
    popularity: track.popularity,
    isCue: false,
  }
}

function formatTrackArtists(artists?: SpotifyTrackArtist[]): string {
  const artistNames = artists
    ?.map(artist => artist.name)
    .filter(Boolean)

  return artistNames?.length ? artistNames.join(', ') : 'Unknown artist'
}

function normalizeName(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasMatchingArtist(
  track: SpotifySearchTrack,
  artistName: string,
  artistId?: string,
): boolean {
  return (track.artists ?? []).some((artist) => {
    if (artistId && artist.id === artistId) {
      return true
    }

    return normalizeName(artist.name) === normalizeName(artistName)
  })
}

function getValidMatchingTracks(
  tracks: SpotifySearchTrack[],
  artistName: string,
  artistId?: string,
): SpotifySearchTrack[] {
  return dedupeSpotifyTracks(
    tracks.filter(track => hasMatchingArtist(track, artistName, artistId)),
  )
}
