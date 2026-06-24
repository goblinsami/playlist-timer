import {
  getCurrentUserPlaylists,
  SpotifyServiceError,
} from '../../services/spotify.service'

const SPOTIFY_ACCESS_TOKEN_COOKIE = 'spotify_access_token'

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, SPOTIFY_ACCESS_TOKEN_COOKIE)

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'SPOTIFY_AUTH_REQUIRED',
    })
  }

  try {
    const playlists = await getCurrentUserPlaylists(accessToken)

    return {
      playlists,
    }
  }
  catch (error: unknown) {
    if (error instanceof SpotifyServiceError) {
      throw createError({
        statusCode: 502,
        statusMessage: error.code,
      })
    }

    throw createError({
      statusCode: 502,
      statusMessage: 'PLAYLISTS_LOAD_FAILED',
    })
  }
})
