import {
  getSpotifyAppAccessToken,
  getSpotifyAppTokenExpiresInSeconds,
  SpotifyServiceError,
} from '../../services/spotify.service'

export default defineEventHandler(async () => {
  try {
    await getSpotifyAppAccessToken()
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
      statusMessage: 'SPOTIFY_AUTH_ERROR',
    })
  }

  return {
    ok: true,
    tokenType: 'Bearer',
    expiresIn: getSpotifyAppTokenExpiresInSeconds(),
  }
})
