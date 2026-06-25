export {}

declare global {
  interface Window {
    Spotify?: typeof Spotify
    onSpotifyWebPlaybackSDKReady?: () => void
  }

  namespace Spotify {
    interface PlayerInit {
      name: string
      getOAuthToken: (callback: (accessToken: string) => void) => void
      volume?: number
    }

    interface WebPlaybackPlayer {
      device_id: string
    }

    interface WebPlaybackError {
      message: string
    }

    interface WebPlaybackState {
      position: number
      duration: number
      paused: boolean
      track_window: {
        current_track: {
          id: string
          name: string
          uri: string
        }
      }
    }

    type ErrorEventName =
      | 'initialization_error'
      | 'authentication_error'
      | 'account_error'
      | 'playback_error'

    class Player {
      constructor(options: PlayerInit)
      connect(): Promise<boolean>
      disconnect(): void
      addListener(
        eventName: 'ready' | 'not_ready',
        callback: (player: WebPlaybackPlayer) => void,
      ): boolean
      addListener(
        eventName: ErrorEventName,
        callback: (error: WebPlaybackError) => void,
      ): boolean
      addListener(
        eventName: 'player_state_changed',
        callback: (state: WebPlaybackState | null) => void,
      ): boolean
      removeListener(eventName: string): boolean
    }
  }
}
