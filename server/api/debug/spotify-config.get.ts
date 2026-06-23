export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  const clientId = getRuntimeConfigString(config.spotifyClientId)
  const clientSecret = getRuntimeConfigString(config.spotifyClientSecret)

  return {
    hasClientId: clientId.length > 0,
    hasClientSecret: clientSecret.length > 0,
    clientIdLength: clientId.length,
    clientSecretLength: clientSecret.length,
  }
})

function getRuntimeConfigString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
