import type { H3Event } from 'h3'
import {
  exchangeCodeForToken,
  hasRequiredSpotifyExportScopes,
  SpotifyServiceError,
} from '../../services/spotify.service'
import { getPreview } from '../../services/previewStore.service'

const SPOTIFY_ACCESS_TOKEN_COOKIE = 'spotify_access_token'
const SPOTIFY_SCOPE_COOKIE = 'spotify_scope'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const parsedState = parseSpotifyState(state)
  const previewId = parsedState.previewId
  const spotifyError = typeof query.error === 'string' ? query.error : ''
  const redirectUrl = createAppRedirectUrl(event, parsedState)

  if (spotifyError) {
    redirectUrl.searchParams.set('spotifyError', spotifyError)
    return await sendRedirect(event, redirectUrl.toString())
  }

  if (
    !code
    || (!parsedState.previewId && !parsedState.sourceType)
    || (previewId && !getPreview(previewId))
  ) {
    redirectUrl.searchParams.set('spotifyError', 'SPOTIFY_AUTH_ERROR')
    return await sendRedirect(event, redirectUrl.toString())
  }

  try {
    const token = await exchangeCodeForToken(code)

    if (!hasRequiredSpotifyExportScopes(token.scope)) {
      console.error('[spotify]', {
        step: 'oauth scope validation',
        error: 'SPOTIFY_SCOPE_ERROR',
        scope: token.scope,
        hasPlaylistModifyPrivate: token.scope.split(/\s+/).includes('playlist-modify-private'),
        hasPlaylistModifyPublic: token.scope.split(/\s+/).includes('playlist-modify-public'),
        hasPlaylistReadPrivate: token.scope.split(/\s+/).includes('playlist-read-private'),
        hasPlaylistReadCollaborative: token.scope.split(/\s+/).includes('playlist-read-collaborative'),
        hasUserLibraryRead: token.scope.split(/\s+/).includes('user-library-read'),
        hasStreaming: token.scope.split(/\s+/).includes('streaming'),
        hasUserReadPlaybackState: token.scope.split(/\s+/).includes('user-read-playback-state'),
        hasUserModifyPlaybackState: token.scope.split(/\s+/).includes('user-modify-playback-state'),
      })

      redirectUrl.searchParams.set('spotifyError', 'SPOTIFY_SCOPE_ERROR')
      return await sendRedirect(event, redirectUrl.toString())
    }

    setCookie(event, SPOTIFY_ACCESS_TOKEN_COOKIE, token.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: token.expiresIn,
    })

    setCookie(event, SPOTIFY_SCOPE_COOKIE, token.scope, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: token.expiresIn,
    })

    redirectUrl.searchParams.set('spotifyAuth', 'success')

    return await sendRedirect(event, redirectUrl.toString())
  }
  catch (error: unknown) {
    redirectUrl.searchParams.set(
      'spotifyError',
      error instanceof SpotifyServiceError ? error.code : 'SPOTIFY_AUTH_ERROR',
    )

    return await sendRedirect(event, redirectUrl.toString())
  }
})

function createAppRedirectUrl(
  event: H3Event,
  parsedState: { previewId: string, sourceType: string },
): URL {
  const requestUrl = getRequestURL(event)
  const redirectUrl = new URL('/', requestUrl.origin)

  if (parsedState.previewId) {
    redirectUrl.searchParams.set('previewId', parsedState.previewId)
  }

  if (parsedState.sourceType) {
    redirectUrl.searchParams.set('sourceType', parsedState.sourceType)
  }

  return redirectUrl
}

function parseSpotifyState(state: string): { previewId: string, sourceType: string } {
  if (state.startsWith('preview:')) {
    return {
      previewId: state.slice('preview:'.length),
      sourceType: '',
    }
  }

  if (state.startsWith('source:')) {
    return {
      previewId: '',
      sourceType: state.slice('source:'.length),
    }
  }

  return {
    previewId: state,
    sourceType: '',
  }
}
