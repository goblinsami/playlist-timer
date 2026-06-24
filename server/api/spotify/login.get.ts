import { getPreview } from '../../services/previewStore.service'
import {
  getSpotifyRedirectUri,
  SPOTIFY_EXPORT_SCOPES,
} from '../../services/spotify.service'

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'
const PERSONAL_SOURCE_TYPES = new Set(['liked-songs', 'user-playlist'])

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const previewId = typeof query.previewId === 'string' ? query.previewId : ''
  const sourceType = typeof query.sourceType === 'string' ? query.sourceType : ''
  const state = createSpotifyState(previewId, sourceType)

  if (!state) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SPOTIFY_LOGIN_STATE_REQUIRED',
    })
  }

  if (previewId && !getPreview(previewId)) {
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
  const scopes = SPOTIFY_EXPORT_SCOPES.join(' ')

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
    state,
  })

  return await sendRedirect(event, `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`)
})

function createSpotifyState(previewId: string, sourceType: string): string {
  if (previewId) {
    return `preview:${previewId}`
  }

  if (PERSONAL_SOURCE_TYPES.has(sourceType)) {
    return `source:${sourceType}`
  }

  return ''
}
