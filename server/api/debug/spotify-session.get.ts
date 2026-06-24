const SPOTIFY_ACCESS_TOKEN_COOKIE = 'spotify_access_token'
const SPOTIFY_SCOPE_COOKIE = 'spotify_scope'

export default defineEventHandler((event) => {
  const accessToken = getCookie(event, SPOTIFY_ACCESS_TOKEN_COOKIE)
  const scope = getCookie(event, SPOTIFY_SCOPE_COOKIE) ?? ''
  const scopes = scope.split(/\s+/).filter(Boolean)

  return {
    hasAccessToken: Boolean(accessToken),
    scope,
    hasPlaylistModifyPrivate: scopes.includes('playlist-modify-private'),
    hasPlaylistModifyPublic: scopes.includes('playlist-modify-public'),
  }
})
