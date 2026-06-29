import { getPreview } from '../../services/previewStore.service'
import {
  getSpotifyRedirectUri,
  SPOTIFY_EXPORT_SCOPES,
} from '../../services/spotify.service'

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'
const LOGIN_SOURCE_TYPES = new Set(['liked-songs', 'user-playlist', 'timer-mix'])

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const previewId = typeof query.previewId === 'string' ? query.previewId : ''
  const sourceType = typeof query.sourceType === 'string' ? query.sourceType : ''
  const quickStartId = typeof query.quickStartId === 'string' ? query.quickStartId : ''
  const state = createSpotifyState(previewId, sourceType, quickStartId)

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

function createSpotifyState(previewId: string, sourceType: string, quickStartId: string): string {
  if (previewId) {
    return `preview:${previewId}`
  }

  if (LOGIN_SOURCE_TYPES.has(sourceType)) {
    if (sourceType === 'timer-mix' && isSafeStateValue(quickStartId)) {
      return `source:${sourceType}:quickStart:${quickStartId}`
    }

    return `source:${sourceType}`
  }

  return ''
}

function isSafeStateValue(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value)
}
