export interface Track {
  id: string
  name: string
  artist: string
  artists?: string[]
  durationMs: number
  spotifyUri?: string
  popularity?: number
  isCue?: boolean
}

export type PreviewSourceType =
  | 'spotify-search'
  | 'liked-songs'
  | 'user-playlist'

export type SelectionMode =
  | 'recent'
  | 'random'

export interface PreviewSource {
  type: PreviewSourceType
  selectionMode?: SelectionMode
  playlistId?: string
  playlistName?: string
}

export interface SolveInput {
  tracks: Track[]
  targetDurationMs: number
  toleranceMs: number
  startCue?: Track
  endCue?: Track
  maxTracks?: number
}

export interface SolveResult {
  tracks: Track[]
  actualDurationMs: number
  differenceMs: number
  isWithinTolerance: boolean
  targetDurationMs: number
  toleranceMs: number
  strategy: 'exact' | 'best-effort'
}
