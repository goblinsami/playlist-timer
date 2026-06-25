interface SpotifyTokenResponse {
  accessToken: string
}

const SPOTIFY_SDK_URL = 'https://sdk.scdn.co/spotify-player.js'

let sdkLoadPromise: Promise<void> | null = null

export function useSpotifyPlayer() {
  const player = shallowRef<Spotify.Player | null>(null)
  const deviceId = ref('')
  const isReady = ref(false)
  const isConnecting = ref(false)
  const error = ref('')

  async function connectPlayer(): Promise<void> {
    if (isConnecting.value) {
      return
    }

    isConnecting.value = true
    error.value = ''

    try {
      await loadSpotifySdk()

      if (!player.value) {
        player.value = createPlayer({
          onReady: (playerDeviceId) => {
            deviceId.value = playerDeviceId
            isReady.value = true
            isConnecting.value = false
          },
          onNotReady: () => {
            isReady.value = false
          },
          onError: (message) => {
            error.value = message
            isConnecting.value = false
          },
        })
      }

      const connected = await player.value.connect()

      if (!connected) {
        throw new Error('SPOTIFY_SDK_CONNECT_FAILED')
      }
    }
    catch (connectError: unknown) {
      error.value = connectError instanceof Error
        ? connectError.message
        : 'SPOTIFY_SDK_CONNECT_FAILED'
      isConnecting.value = false
    }
  }

  function disconnectPlayer(): void {
    player.value?.disconnect()
    player.value = null
    deviceId.value = ''
    isReady.value = false
    isConnecting.value = false
  }

  return {
    player,
    deviceId,
    isReady,
    isConnecting,
    error,
    connectPlayer,
    disconnectPlayer,
  }
}

function createPlayer(callbacks: {
  onReady: (deviceId: string) => void
  onNotReady: () => void
  onError: (message: string) => void
}): Spotify.Player {
  if (!window.Spotify) {
    throw new Error('SPOTIFY_SDK_NOT_READY')
  }

  const player = new window.Spotify.Player({
    name: 'Playlist Timer Mix',
    getOAuthToken: async (callback) => {
      const response = await fetch('/api/spotify/token')

      if (!response.ok) {
        callbacks.onError('SPOTIFY_AUTH_REQUIRED')
        callback('')
        return
      }

      const data = await response.json() as SpotifyTokenResponse

      callback(data.accessToken)
    },
    volume: 1,
  })

  player.addListener('ready', ({ device_id }) => callbacks.onReady(device_id))
  player.addListener('not_ready', () => callbacks.onNotReady())
  player.addListener('initialization_error', ({ message }) => callbacks.onError(message))
  player.addListener('authentication_error', ({ message }) => callbacks.onError(message))
  player.addListener('account_error', ({ message }) => callbacks.onError(message))
  player.addListener('playback_error', ({ message }) => callbacks.onError(message))
  player.addListener('player_state_changed', () => {})

  return player
}

function loadSpotifySdk(): Promise<void> {
  if (window.Spotify) {
    return Promise.resolve()
  }

  if (sdkLoadPromise) {
    return sdkLoadPromise
  }

  sdkLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${SPOTIFY_SDK_URL}"]`,
    )

    window.onSpotifyWebPlaybackSDKReady = () => resolve()

    if (existingScript) {
      return
    }

    const script = document.createElement('script')

    script.src = SPOTIFY_SDK_URL
    script.async = true
    script.onerror = () => reject(new Error('SPOTIFY_SDK_LOAD_FAILED'))
    document.body.appendChild(script)
  })

  return sdkLoadPromise
}
