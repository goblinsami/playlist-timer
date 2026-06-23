import type { SolveInput, SolveResult, Track } from '../types/playlist'

const DEFAULT_MAX_TRACKS = 8
const MAX_STATES_PER_TRACK_COUNT = 5_000

interface SearchState {
  tracks: Track[]
  durationMs: number
  popularity: number
  key: string
}

export function solvePlaylistDuration(input: SolveInput): SolveResult {
  const targetDurationMs = normalizeNonNegative(input.targetDurationMs)
  const toleranceMs = normalizeNonNegative(input.toleranceMs)
  const maxTracks = normalizeMaxTracks(input.maxTracks)
  const cues = collectCues(input.startCue, input.endCue)
  const cueDurationMs = sumDuration(cues)
  const availableTrackSlots = Math.max(0, maxTracks - cues.length)
  const cueIds = new Set(cues.map(track => track.id))
  const candidates = getValidUniqueTracks(input.tracks, cueIds)
  const targetTrackDurationMs = targetDurationMs - cueDurationMs
  const bestState = findBestCombination(
    candidates,
    targetTrackDurationMs,
    availableTrackSlots,
  )
  const tracks = combineTracks(bestState.tracks, input.startCue, input.endCue)
  const actualDurationMs = sumDuration(tracks)
  const differenceMs = Math.abs(actualDurationMs - targetDurationMs)
  const isWithinTolerance = differenceMs <= toleranceMs

  return {
    tracks,
    actualDurationMs,
    differenceMs,
    isWithinTolerance,
    targetDurationMs,
    toleranceMs,
    strategy: isWithinTolerance ? 'exact' : 'best-effort',
  }
}

function findBestCombination(
  tracks: Track[],
  targetDurationMs: number,
  maxTracks: number,
): SearchState {
  const emptyState: SearchState = {
    tracks: [],
    durationMs: 0,
    popularity: 0,
    key: '',
  }

  if (maxTracks === 0 || tracks.length === 0) {
    return emptyState
  }

  const statesByTrackCount: SearchState[][] = Array.from(
    { length: maxTracks + 1 },
    () => [],
  )
  statesByTrackCount[0] = [emptyState]

  for (const track of tracks) {
    for (let trackCount = maxTracks; trackCount >= 1; trackCount -= 1) {
      const additions = statesByTrackCount[trackCount - 1].map(state =>
        addTrack(state, track),
      )

      statesByTrackCount[trackCount] = pruneStates(
        [...statesByTrackCount[trackCount], ...additions],
        targetDurationMs,
      )
    }
  }

  return statesByTrackCount
    .flat()
    .reduce((best, state) =>
      compareStates(state, best, targetDurationMs) < 0 ? state : best,
    )
}

function addTrack(state: SearchState, track: Track): SearchState {
  return {
    tracks: [...state.tracks, track],
    durationMs: state.durationMs + track.durationMs,
    popularity: state.popularity + normalizePopularity(track.popularity),
    key: state.key ? `${state.key}|${track.id}` : track.id,
  }
}

function pruneStates(states: SearchState[], targetDurationMs: number): SearchState[] {
  const bestByDuration = new Map<number, SearchState>()

  for (const state of states) {
    const existing = bestByDuration.get(state.durationMs)

    if (!existing || compareEqualDurationStates(state, existing) < 0) {
      bestByDuration.set(state.durationMs, state)
    }
  }

  return [...bestByDuration.values()]
    .sort((left, right) => compareStates(left, right, targetDurationMs))
    .slice(0, MAX_STATES_PER_TRACK_COUNT)
}

function compareStates(
  left: SearchState,
  right: SearchState,
  targetDurationMs: number,
): number {
  const difference =
    Math.abs(left.durationMs - targetDurationMs)
    - Math.abs(right.durationMs - targetDurationMs)

  if (difference !== 0) {
    return difference
  }

  return compareEqualDurationStates(left, right)
}

function compareEqualDurationStates(left: SearchState, right: SearchState): number {
  const popularityDifference = right.popularity - left.popularity

  if (popularityDifference !== 0) {
    return popularityDifference
  }

  const trackCountDifference = left.tracks.length - right.tracks.length

  if (trackCountDifference !== 0) {
    return trackCountDifference
  }

  return left.key.localeCompare(right.key)
}

function getValidUniqueTracks(tracks: Track[], excludedIds: Set<string>): Track[] {
  const seenIds = new Set(excludedIds)

  return tracks.filter((track) => {
    if (!isValidTrack(track) || seenIds.has(track.id)) {
      return false
    }

    seenIds.add(track.id)
    return true
  })
}

function collectCues(startCue?: Track, endCue?: Track): Track[] {
  const cues: Track[] = []

  if (startCue && isValidTrack(startCue)) {
    cues.push(startCue)
  }

  if (endCue && isValidTrack(endCue) && endCue.id !== startCue?.id) {
    cues.push(endCue)
  }

  return cues
}

function combineTracks(
  tracks: Track[],
  startCue?: Track,
  endCue?: Track,
): Track[] {
  const playlist = [...tracks]

  if (startCue && isValidTrack(startCue)) {
    playlist.unshift(startCue)
  }

  if (endCue && isValidTrack(endCue) && endCue.id !== startCue?.id) {
    playlist.push(endCue)
  }

  return playlist
}

function isValidTrack(track: Track): boolean {
  return Number.isFinite(track.durationMs) && track.durationMs > 0
}

function sumDuration(tracks: Track[]): number {
  return tracks.reduce((total, track) => total + track.durationMs, 0)
}

function normalizeMaxTracks(maxTracks?: number): number {
  if (maxTracks === undefined || !Number.isFinite(maxTracks)) {
    return DEFAULT_MAX_TRACKS
  }

  return Math.max(0, Math.floor(maxTracks))
}

function normalizeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function normalizePopularity(popularity?: number): number {
  return Number.isFinite(popularity) ? popularity ?? 0 : 0
}
