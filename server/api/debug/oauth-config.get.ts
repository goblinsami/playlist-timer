export default defineEventHandler(() => {
  const config = useRuntimeConfig()

  return {
    redirectUri: getRuntimeConfigString(config.spotifyRedirectUri),
    expectedLocalAppUrl: 'http://127.0.0.1:3000',
  }
})

function getRuntimeConfigString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
