const SPOTIFY_ACCESS_TOKEN_COOKIE = 'spotify_access_token'

export default defineEventHandler((event) => {
  const accessToken = getCookie(event, SPOTIFY_ACCESS_TOKEN_COOKIE)

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'SPOTIFY_AUTH_REQUIRED',
    })
  }

  return {
    accessToken,
  }
})
