const SPOTIFY_ACCESS_TOKEN_COOKIE = 'spotify_access_token'
const SPOTIFY_SCOPE_COOKIE = 'spotify_scope'

export default defineEventHandler((event) => {
  const accessToken = getCookie(event, SPOTIFY_ACCESS_TOKEN_COOKIE)
  const scope = getCookie(event, SPOTIFY_SCOPE_COOKIE) ?? ''
  const scopes = scope.split(/\s+/).filter(Boolean)

  return {
    hasAccessToken: Boolean(accessToken),
    hasPlaylistModifyPrivate: scopes.includes('playlist-modify-private'),
    hasPlaylistModifyPublic: scopes.includes('playlist-modify-public'),
    hasPlaylistReadPrivate: scopes.includes('playlist-read-private'),
    hasPlaylistReadCollaborative: scopes.includes('playlist-read-collaborative'),
    hasUserLibraryRead: scopes.includes('user-library-read'),
    hasStreaming: scopes.includes('streaming'),
    hasUserReadPlaybackState: scopes.includes('user-read-playback-state'),
    hasUserModifyPlaybackState: scopes.includes('user-modify-playback-state'),
  }
})
