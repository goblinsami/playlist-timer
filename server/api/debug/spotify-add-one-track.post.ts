const SPOTIFY_API_URL = 'https://api.spotify.com/v1'
const SPOTIFY_ACCESS_TOKEN_COOKIE = 'spotify_access_token'
const KNOWN_TRACK_URI = 'spotify:track:1dHbcmMm9bov1q4lG7Q4nQ'

interface SpotifyDebugUser {
  id: string
  display_name?: string
}

interface SpotifyDebugPlaylist {
  id: string
  owner?: {
    id?: string
  }
  public?: boolean
}

interface SpotifyAddTracksResponse {
  snapshot_id?: string
}

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, SPOTIFY_ACCESS_TOKEN_COOKIE)

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'SPOTIFY_AUTH_REQUIRED',
    })
  }

  const user = await getCurrentUserForDebug(accessToken)
  const playlist = await createPublicPlaylistForDebug(accessToken)
  const addTracksResult = await addOneTrackForDebug(accessToken, playlist.id)

  console.info('[spotify-debug-add-one-track]', {
    spotifyUserId: user.id,
    displayName: user.display_name ?? '',
    playlistId: playlist.id,
    playlistOwnerId: playlist.owner?.id ?? '',
    playlistPublic: playlist.public ?? true,
    addTracksStatus: addTracksResult.status,
    cleanupAttempted: addTracksResult.cleanupAttempted,
    cleanupSucceeded: addTracksResult.cleanupSucceeded,
  })

  return {
    spotifyUserId: user.id,
    displayName: user.display_name ?? '',
    playlistId: playlist.id,
    playlistOwnerId: playlist.owner?.id ?? '',
    playlistPublic: playlist.public ?? true,
    addTracksStatus: addTracksResult.status,
    snapshotId: addTracksResult.snapshotId,
    spotifyErrorBody: addTracksResult.errorBody,
    cleanupAttempted: addTracksResult.cleanupAttempted,
    cleanupSucceeded: addTracksResult.cleanupSucceeded,
  }
})

async function getCurrentUserForDebug(accessToken: string): Promise<SpotifyDebugUser> {
  const url = `${SPOTIFY_API_URL}/me`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logDebugFailure('current user', response.status, errorBody, url)

    throw createError({
      statusCode: 502,
      statusMessage: 'SPOTIFY_DEBUG_ME_ERROR',
    })
  }

  const user = await response.json() as SpotifyDebugUser

  console.info('[spotify-debug-add-one-track]', {
    step: 'current user success',
    spotifyUserId: user.id,
    displayName: user.display_name ?? '',
  })

  return user
}

async function createPublicPlaylistForDebug(
  accessToken: string,
): Promise<SpotifyDebugPlaylist> {
  const url = `${SPOTIFY_API_URL}/me/playlists`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Playlist Timer Debug Add Track',
      description: 'Temporary debug playlist created by Playlist Timer.',
      public: true,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logDebugFailure('create public playlist', response.status, errorBody, url)

    throw createError({
      statusCode: 502,
      statusMessage: 'SPOTIFY_DEBUG_CREATE_PLAYLIST_ERROR',
    })
  }

  const playlist = await response.json() as SpotifyDebugPlaylist

  console.info('[spotify-debug-add-one-track]', {
    step: 'create public playlist success',
    playlistId: playlist.id,
    playlistOwnerId: playlist.owner?.id ?? '',
    playlistPublic: playlist.public ?? true,
  })

  return playlist
}

async function addOneTrackForDebug(
  accessToken: string,
  playlistId: string,
): Promise<{
  status: number
  snapshotId?: string
  errorBody?: string
  cleanupAttempted: boolean
  cleanupSucceeded: boolean
}> {
  const url = `${SPOTIFY_API_URL}/playlists/${encodeURIComponent(playlistId)}/items`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris: [KNOWN_TRACK_URI],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logDebugFailure('add one playlist item', response.status, errorBody, url)

    const cleanupSucceeded = await cleanupDebugPlaylist(accessToken, playlistId)

    return {
      status: response.status,
      errorBody,
      cleanupAttempted: true,
      cleanupSucceeded,
    }
  }

  const data = await response.json() as SpotifyAddTracksResponse

  console.info('[spotify-debug-add-one-track]', {
    step: 'add one playlist item success',
    playlistId,
    addTracksStatus: response.status,
    snapshotId: data.snapshot_id ?? '',
  })

  return {
    status: response.status,
    snapshotId: data.snapshot_id,
    cleanupAttempted: false,
    cleanupSucceeded: false,
  }
}

async function cleanupDebugPlaylist(
  accessToken: string,
  playlistId: string,
): Promise<boolean> {
  const url = `${SPOTIFY_API_URL}/playlists/${encodeURIComponent(playlistId)}/followers`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logDebugFailure('cleanup debug playlist', response.status, errorBody, url)

    return false
  }

  console.info('[spotify-debug-add-one-track]', {
    step: 'cleanup debug playlist success',
    playlistId,
    status: response.status,
  })

  return true
}

function logDebugFailure(
  step: string,
  status: number,
  responseBody: string,
  url: string,
): void {
  console.error('[spotify-debug-add-one-track]', {
    step,
    status,
    body: responseBody,
    url,
  })
}
