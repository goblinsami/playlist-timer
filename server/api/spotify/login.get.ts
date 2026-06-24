import { getPreview } from '../../services/previewStore.service'
import { getSpotifyRedirectUri } from '../../services/spotify.service'

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const previewId = typeof query.previewId === 'string' ? query.previewId : ''
  const preview = getPreview(previewId)

  if (!preview) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PREVIEW_NOT_FOUND',
    })
  }

  const config = useRuntimeConfig()
  const clientId = typeof config.spotifyClientId === 'string'
    ? config.spotifyClientId
    : ''
  const redirectUri = getSpotifyRedirectUri()
  const scopes = [
    'playlist-modify-private',
    'playlist-modify-public',
  ].join(' ')

  if (!clientId || !redirectUri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SPOTIFY_OAUTH_CONFIG_MISSING',
    })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    state: previewId,
  })

  return await sendRedirect(event, `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`)
})
