export interface Track {
  id: string
  name: string
  artist: string
  durationMs: number
  spotifyUri?: string
  popularity?: number
  isCue?: boolean
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
