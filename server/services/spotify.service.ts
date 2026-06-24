import type { SelectionMode, Track } from '../types/playlist'

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_URL = 'https://api.spotify.com/v1'
const TRACK_SEARCH_LIMIT = 10
const PERSONAL_SOURCE_MAX_REQUESTS = 5
const PERSONAL_SOURCE_PAGE_LIMIT = 20
const PERSONAL_SOURCE_MAX_ITEMS = 100

type SpotifyErrorCode =
  | 'ARTIST_NOT_FOUND'
  | 'LIKED_SONGS_LOAD_FAILED'
  | 'NO_TRACKS_FOUND'
  | 'NO_TRACKS_FOUND_FOR_FILTER'
  | 'PLAYLIST_ITEMS_FORBIDDEN'
  | 'PLAYLIST_NOT_FOUND'
  | 'PLAYLISTS_LOAD_FAILED'
  | 'SPOTIFY_ADD_TRACKS_FORBIDDEN'
  | 'SPOTIFY_AUTH_ERROR'
  | 'SPOTIFY_EXPORT_ERROR'
  | 'SPOTIFY_SCOPE_ERROR'
  | 'SPOTIFY_SEARCH_ERROR'

interface CachedToken {
  accessToken: string
  expiresAtMs: number
}

interface SpotifyTokenResponse {
  access_token?: string
  expires_in?: number
  scope?: string
  token_type?: string
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
  type?: string
}

interface SpotifyPaging<T> {
  items?: T[]
  next?: string | null
  total?: number
}

interface SpotifyPlaylistOwner {
  id?: string
}

interface SpotifyPlaylist {
  id?: string
  name?: string
  owner?: SpotifyPlaylistOwner
  tracks?: {
    total?: number
  }
  images?: SpotifyImage[]
  collaborative?: boolean
  public?: boolean
}

interface SpotifyPlaylistItem {
  track?: SpotifySearchTrack | null
}

interface SpotifySavedTrackItem {
  track?: SpotifySearchTrack | null
}

export interface SpotifyArtistMatch {
  id: string
  name: string
  imageUrl?: string
}

export interface SpotifyUser {
  id: string
}

export interface SpotifyUserPlaylist {
  id: string
  name: string
  ownerId: string
  totalItems: number
  imageUrl?: string
  isCollaborative: boolean
  isPublic: boolean
}

export interface SpotifyCreatedPlaylist {
  id: string
  external_urls?: {
    spotify?: string
  }
}

export interface SpotifyUserToken {
  accessToken: string
  expiresIn: number
  scope: string
  tokenType: string
}

export const SPOTIFY_EXPORT_SCOPES = [
  'playlist-modify-private',
  'playlist-modify-public',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
]

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

export function getSpotifyRedirectUri(): string {
  const config = useRuntimeConfig()

  return getRuntimeConfigString(config.spotifyRedirectUri)
}

export function getSpotifyExportPlaylistPublic(): boolean {
  const config = useRuntimeConfig()

  return getRuntimeConfigString(config.spotifyExportPlaylistPublic) === 'true'
}

export async function exchangeCodeForToken(code: string): Promise<SpotifyUserToken> {
  const { clientId, clientSecret } = getSpotifyCredentials()
  const redirectUri = getSpotifyRedirectUri()

  if (!clientId || !clientSecret || !redirectUri) {
    throw new SpotifyServiceError(
      'SPOTIFY_AUTH_ERROR',
      'Spotify OAuth configuration is not complete.',
    )
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logSpotifyFailure('oauth token exchange', response.status, errorBody, SPOTIFY_TOKEN_URL)

    throw new SpotifyServiceError(
      'SPOTIFY_AUTH_ERROR',
      `Spotify OAuth token exchange failed with status ${response.status}.`,
    )
  }

  const data = await response.json() as SpotifyTokenResponse

  logSpotifyStep('oauth token exchange success', {
    accessTokenExists: Boolean(data.access_token),
    scope: data.scope ?? '',
    expiresIn: data.expires_in ?? 0,
    tokenType: data.token_type ?? '',
  })

  if (!data.access_token) {
    throw new SpotifyServiceError(
      'SPOTIFY_AUTH_ERROR',
      'Spotify OAuth token response did not include an access token.',
    )
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3_600,
    scope: data.scope ?? '',
    tokenType: data.token_type ?? 'Bearer',
  }
}

export function hasRequiredSpotifyExportScopes(scope: string): boolean {
  const returnedScopes = new Set(scope.split(/\s+/).filter(Boolean))

  return SPOTIFY_EXPORT_SCOPES.every(requiredScope => returnedScopes.has(requiredScope))
}

export async function getCurrentSpotifyUser(accessToken: string): Promise<SpotifyUser> {
  const user = await spotifyUserApiFetch<SpotifyUser>(
    '/me',
    accessToken,
    'current user',
  )

  if (!user.id) {
    throw new SpotifyServiceError(
      'SPOTIFY_EXPORT_ERROR',
      'Spotify user response did not include an id.',
    )
  }

  return user
}

export async function getCurrentUserPlaylists(
  accessToken: string,
): Promise<SpotifyUserPlaylist[]> {
  const playlistItems = await getPagedSpotifyUserItems<SpotifyPlaylist>(
    accessToken,
    '/me/playlists',
    'current user playlists',
    'PLAYLISTS_LOAD_FAILED',
    50,
  )

  return playlistItems
    .filter(playlist => playlist.id && playlist.name)
    .map(playlist => ({
      id: playlist.id ?? '',
      name: playlist.name ?? '',
      ownerId: playlist.owner?.id ?? '',
      totalItems: playlist.tracks?.total ?? 0,
      imageUrl: playlist.images?.[0]?.url,
      isCollaborative: playlist.collaborative === true,
      isPublic: playlist.public === true,
    }))
}

export async function getLikedTracks(
  accessToken: string,
  selectionMode: SelectionMode = 'random',
): Promise<Track[]> {
  const savedTrackItems = await getSampledSpotifyUserItems<SpotifySavedTrackItem>(
    accessToken,
    '/me/tracks',
    'liked songs',
    'LIKED_SONGS_LOAD_FAILED',
    selectionMode,
  )
  const tracks = savedTrackItems
    .map(item => item.track)
    .filter((track): track is SpotifySearchTrack => isUsableSpotifyTrack(track))

  return dedupeSpotifyTracks(tracks).map(mapSpotifyTrack)
}

export async function getPlaylistItems(
  accessToken: string,
  playlistId: string,
  selectionMode: SelectionMode = 'random',
): Promise<Track[]> {
  const playlistItems = await getSampledSpotifyUserItems<SpotifyPlaylistItem>(
    accessToken,
    `/playlists/${encodeURIComponent(playlistId)}/items`,
    'playlist items',
    'PLAYLIST_ITEMS_FORBIDDEN',
    selectionMode,
  )
  const tracks = playlistItems
    .map(item => item.track)
    .filter((track): track is SpotifySearchTrack =>
      isUsableSpotifyTrack(track) && (track.type === undefined || track.type === 'track'),
    )

  return dedupeSpotifyTracks(tracks).map(mapSpotifyTrack)
}

export function filterTracksByArtist(tracks: Track[], artistFilter: string): Track[] {
  const normalizedArtistFilter = normalizeName(artistFilter)

  if (!normalizedArtistFilter) {
    return tracks
  }

  return tracks.filter(track =>
    (track.artists?.length ? track.artists : [track.artist]).some(artistName =>
      normalizeName(artistName).includes(normalizedArtistFilter),
    ),
  )
}

export async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string,
  isPublic: boolean,
): Promise<SpotifyCreatedPlaylist> {
  void userId

  const playlist = await spotifyUserApiFetch<SpotifyCreatedPlaylist>(
    '/me/playlists',
    accessToken,
    'create playlist',
    {
      method: 'POST',
      body: {
        name,
        description,
        public: isPublic,
      },
    },
  )

  if (!playlist.id) {
    throw new SpotifyServiceError(
      'SPOTIFY_EXPORT_ERROR',
      'Spotify create playlist response did not include an id.',
    )
  }

  return playlist
}

export async function addItemsToPlaylist(
  accessToken: string,
  playlistId: string,
  spotifyUris: string[],
): Promise<void> {
  const trackUris = getUniqueTrackUris(spotifyUris).slice(0, 100)

  if (trackUris.length === 0) {
    return
  }

  const url = `${SPOTIFY_API_URL}/playlists/${encodeURIComponent(playlistId)}/items`

  logSpotifyStep('add playlist items request', {
    playlistId,
    uriCount: trackUris.length,
    firstUriSample: trackUris[0],
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris: trackUris,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logSpotifyFailure('add playlist items', response.status, errorBody, url)

    throw new SpotifyServiceError(
      'SPOTIFY_ADD_TRACKS_FORBIDDEN',
      `add playlist items failed with status ${response.status}.`,
    )
  }

  logSpotifyStep('add playlist items success', {
    playlistId,
    uriCount: trackUris.length,
    status: response.status,
  })
}

export async function removePlaylistFromCurrentUser(
  accessToken: string,
  playlistId: string,
): Promise<boolean> {
  const url = `${SPOTIFY_API_URL}/playlists/${encodeURIComponent(playlistId)}/followers`

  logSpotifyStep('remove playlist request', {
    playlistId,
  })

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logSpotifyFailure('remove playlist', response.status, errorBody, url)

    return false
  }

  logSpotifyStep('remove playlist success', {
    playlistId,
    status: response.status,
  })

  return true
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

async function spotifyUserApiFetch<T>(
  path: string,
  accessToken: string,
  stepName: string,
  options: {
    method?: 'GET' | 'POST'
    body?: Record<string, unknown>
    errorCode?: SpotifyErrorCode
  } = {},
): Promise<T> {
  const url = path.startsWith('https://') ? path : `${SPOTIFY_API_URL}${path}`
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logSpotifyFailure(stepName, response.status, errorBody, url)

    throw new SpotifyServiceError(
      getSpotifyUserApiErrorCode(response.status, options.errorCode),
      `${stepName} failed with status ${response.status}.`,
    )
  }

  return await response.json() as T
}

async function getPagedSpotifyUserItems<T>(
  accessToken: string,
  path: string,
  stepName: string,
  errorCode: SpotifyErrorCode,
  maxItems: number,
): Promise<T[]> {
  const items: T[] = []
  let offset = 0

  while (items.length < maxItems) {
    const params = new URLSearchParams({
      limit: String(Math.min(50, maxItems - items.length)),
      offset: String(offset),
    })
    const separator = path.includes('?') ? '&' : '?'
    const page = await spotifyUserApiFetch<SpotifyPaging<T>>(
      `${path}${separator}${params.toString()}`,
      accessToken,
      stepName,
      {
        errorCode,
      },
    )
    const pageItems = page.items ?? []

    items.push(...pageItems)

    if (!page.next || pageItems.length === 0) {
      break
    }

    offset += pageItems.length
  }

  return items.slice(0, maxItems)
}

async function getSampledSpotifyUserItems<T>(
  accessToken: string,
  path: string,
  stepName: string,
  errorCode: SpotifyErrorCode,
  selectionMode: SelectionMode,
): Promise<T[]> {
  if (selectionMode === 'recent') {
    const items: T[] = []
    let offset = 0
    let pagesRequested = 0
    let totalAvailable: number | undefined

    while (
      pagesRequested < PERSONAL_SOURCE_MAX_REQUESTS
      && items.length < PERSONAL_SOURCE_MAX_ITEMS
    ) {
      const page = await getSpotifyUserItemsPage<T>(
        accessToken,
        path,
        stepName,
        errorCode,
        offset,
        Math.min(PERSONAL_SOURCE_PAGE_LIMIT, PERSONAL_SOURCE_MAX_ITEMS - items.length),
      )
      const pageItems = page.items ?? []

      totalAvailable = page.total
      pagesRequested += 1
      items.push(...pageItems)

      if (!page.next || pageItems.length === 0) {
        break
      }

      offset += pageItems.length
    }

    logSpotifyStep('personal source sampling completed', {
      sourceType: stepName,
      selectionMode,
      totalAvailable,
      pagesRequested,
      candidateCount: items.length,
    })

    return items.slice(0, PERSONAL_SOURCE_MAX_ITEMS)
  }

  const firstPage = await getSpotifyUserItemsPage<T>(
    accessToken,
    path,
    stepName,
    errorCode,
    0,
    PERSONAL_SOURCE_PAGE_LIMIT,
  )
  const total = firstPage.total ?? firstPage.items?.length ?? 0
  const items = [...(firstPage.items ?? [])]
  const randomOffsets = getRandomOffsets(
    total,
    PERSONAL_SOURCE_PAGE_LIMIT,
    PERSONAL_SOURCE_MAX_REQUESTS - 1,
  )

  for (const offset of randomOffsets) {
    if (items.length >= PERSONAL_SOURCE_MAX_ITEMS) {
      break
    }

    const page = await getSpotifyUserItemsPage<T>(
      accessToken,
      path,
      stepName,
      errorCode,
      offset,
      Math.min(PERSONAL_SOURCE_PAGE_LIMIT, PERSONAL_SOURCE_MAX_ITEMS - items.length),
    )

    items.push(...(page.items ?? []))
  }

  logSpotifyStep('personal source sampling completed', {
    sourceType: stepName,
    selectionMode,
    totalAvailable: total,
    pagesRequested: 1 + randomOffsets.length,
    candidateCount: items.length,
  })

  return items.slice(0, PERSONAL_SOURCE_MAX_ITEMS)
}

async function getSpotifyUserItemsPage<T>(
  accessToken: string,
  path: string,
  stepName: string,
  errorCode: SpotifyErrorCode,
  offset: number,
  limit: number,
): Promise<SpotifyPaging<T>> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  const separator = path.includes('?') ? '&' : '?'

  return await spotifyUserApiFetch<SpotifyPaging<T>>(
    `${path}${separator}${params.toString()}`,
    accessToken,
    stepName,
    {
      errorCode,
    },
  )
}

function getRandomOffsets(total: number, limit: number, maxOffsets: number): number[] {
  if (maxOffsets <= 0 || total <= limit) {
    return []
  }

  const maxOffset = Math.max(0, total - limit)
  const targetOffsetCount = Math.min(maxOffsets, maxOffset)
  const offsets = new Set<number>()

  while (offsets.size < targetOffsetCount) {
    const offset = Math.floor(Math.random() * (maxOffset + 1))

    if (offset !== 0) {
      offsets.add(offset)
    }
  }

  return [...offsets]
}

function getSpotifyUserApiErrorCode(
  status: number,
  requestedErrorCode?: SpotifyErrorCode,
): SpotifyErrorCode {
  if (requestedErrorCode === 'PLAYLIST_ITEMS_FORBIDDEN') {
    if (status === 404) {
      return 'PLAYLIST_NOT_FOUND'
    }

    if (status === 403) {
      return 'PLAYLIST_ITEMS_FORBIDDEN'
    }
  }

  return requestedErrorCode ?? 'SPOTIFY_EXPORT_ERROR'
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

function getUniqueTrackUris(spotifyUris: string[]): string[] {
  return [...new Set(
    spotifyUris.filter(uri => uri.startsWith('spotify:track:')),
  )]
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
  const seenUris = new Set<string>()
  const seenNames = new Set<string>()
  const uniqueTracks: SpotifySearchTrack[] = []

  for (const track of tracks) {
    if (!isUsableSpotifyTrack(track)) {
      continue
    }

    const trackId = track.id as string
    const trackUri = track.uri as string
    const normalizedTrackName = normalizeName(track.name)

    if (
      seenIds.has(trackId)
      || seenUris.has(trackUri)
      || seenNames.has(normalizedTrackName)
    ) {
      continue
    }

    seenIds.add(trackId)
    seenUris.add(trackUri)
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
    artists: getTrackArtistNames(track.artists),
    durationMs: track.duration_ms,
    spotifyUri: track.uri,
    popularity: track.popularity,
    isCue: false,
  }
}

function isUsableSpotifyTrack(
  track: SpotifySearchTrack | null | undefined,
): track is SpotifySearchTrack {
  return Boolean(
    track
    && track.id
    && track.uri
    && track.name
    && Number.isFinite(track.duration_ms)
    && track.duration_ms > 0,
  )
}

function formatTrackArtists(artists?: SpotifyTrackArtist[]): string {
  const artistNames = getTrackArtistNames(artists)

  return artistNames.length ? artistNames.join(', ') : 'Unknown artist'
}

function getTrackArtistNames(artists?: SpotifyTrackArtist[]): string[] {
  return artists
    ?.map(artist => artist.name)
    .filter(Boolean) ?? []
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
