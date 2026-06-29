export type TimerMixOAuthSourceType = 'spotify-search' | 'liked-songs' | 'user-playlist'
export type TimerMixOAuthSelectionMode = 'recent' | 'random'

export interface TimerMixOAuthTrack {
  id: string
  name: string
  artist: string
  artists?: string[]
  durationMs: number
  spotifyUri?: string
  isCue?: boolean
}

export interface TimerMixOAuthPreparedMix {
  mixId: string
  source: {
    type: TimerMixOAuthSourceType
    artist?: string
    artistFilter?: string
    playlistId?: string
    playlistName?: string
    selectionMode?: TimerMixOAuthSelectionMode
  }
  totalDurationMs: number
  songCount: number
  fadeDurationMs: number
  blockDurationMs: number
  tracks: TimerMixOAuthTrack[]
  warnings: string[]
}

export interface TimerMixOAuthState {
  activeMode: 'timer-mix'
  sourceType: 'timer-mix'
  timerMixSourceType: TimerMixOAuthSourceType
  artist: string
  artistFilter: string
  selectedPlaylistId: string
  selectedPlaylistName: string
  durationMinutes: number | null
  songCount: number | null
  fadeSeconds: number | null
  selectionMode: TimerMixOAuthSelectionMode
  selectedQuickStartId: string
  preparedMix: TimerMixOAuthPreparedMix | null
}

interface TimerMixOAuthStorageEnvelope {
  version: 1
  savedAt: number
  state: TimerMixOAuthState
}

const TIMER_MIX_OAUTH_STORAGE_KEY = 'mashupTimer.timerMix.pendingOAuthState'
const TIMER_MIX_OAUTH_STATE_MAX_AGE_MS = 30 * 60 * 1_000

export function saveTimerMixState(state: TimerMixOAuthState): void {
  const storage = getSessionStorage()

  if (!storage) {
    return
  }

  try {
    storage.setItem(TIMER_MIX_OAUTH_STORAGE_KEY, JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      state,
    } satisfies TimerMixOAuthStorageEnvelope))
  }
  catch {
    // Session storage can be unavailable or full; OAuth should still continue.
  }
}

export function loadTimerMixState(): TimerMixOAuthState | null {
  const storage = getSessionStorage()

  if (!storage) {
    return null
  }

  const rawState = getStoredValue(storage)

  if (!rawState) {
    return null
  }

  try {
    const envelope = JSON.parse(rawState) as Partial<TimerMixOAuthStorageEnvelope>

    if (
      envelope.version !== 1
      || typeof envelope.savedAt !== 'number'
      || !envelope.state
    ) {
      clearTimerMixState()
      return null
    }

    if (Date.now() - envelope.savedAt > TIMER_MIX_OAUTH_STATE_MAX_AGE_MS) {
      clearTimerMixState()
      return null
    }

    return envelope.state
  }
  catch {
    clearTimerMixState()
    return null
  }
}

export function clearTimerMixState(): void {
  const storage = getSessionStorage()

  if (!storage) {
    return
  }

  try {
    storage.removeItem(TIMER_MIX_OAUTH_STORAGE_KEY)
  }
  catch {
    // Ignore storage failures.
  }
}

export function hasTimerMixState(): boolean {
  const storage = getSessionStorage()

  if (!storage) {
    return false
  }

  return getStoredValue(storage) !== ''
}

function getStoredValue(storage: Storage): string {
  try {
    return storage.getItem(TIMER_MIX_OAUTH_STORAGE_KEY) ?? ''
  }
  catch {
    return ''
  }
}

function getSessionStorage(): Storage | null {
  if (import.meta.server || typeof window === 'undefined') {
    return null
  }

  try {
    return window.sessionStorage
  }
  catch {
    return null
  }
}
