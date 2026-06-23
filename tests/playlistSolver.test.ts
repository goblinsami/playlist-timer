import { describe, expect, it } from 'vitest'
import { solvePlaylistDuration } from '../server/services/playlistSolver.service'
import type { Track } from '../server/types/playlist'

function track(id: string, durationMs: number, popularity = 0): Track {
  return {
    id,
    name: `Track ${id}`,
    artist: 'Test Artist',
    durationMs,
    popularity,
  }
}

describe('solvePlaylistDuration', () => {
  it('returns a playlist within tolerance when possible', () => {
    const result = solvePlaylistDuration({
      tracks: [
        track('a', 120_000),
        track('b', 180_000),
        track('c', 240_000),
      ],
      targetDurationMs: 300_000,
      toleranceMs: 1_000,
    })

    expect(result.tracks.map(item => item.id)).toEqual(['a', 'b'])
    expect(result.actualDurationMs).toBe(300_000)
    expect(result.differenceMs).toBe(0)
    expect(result.isWithinTolerance).toBe(true)
    expect(result.strategy).toBe('exact')
  })

  it('includes start and end cues in the correct positions', () => {
    const startCue = { ...track('start', 10_000), isCue: true }
    const endCue = { ...track('end', 20_000), isCue: true }

    const result = solvePlaylistDuration({
      tracks: [track('main', 270_000), track('other', 100_000)],
      targetDurationMs: 300_000,
      toleranceMs: 0,
      startCue,
      endCue,
    })

    expect(result.tracks.map(item => item.id)).toEqual(['start', 'main', 'end'])
    expect(result.actualDurationMs).toBe(300_000)
  })

  it('returns the closest best-effort playlist when no match is within tolerance', () => {
    const result = solvePlaylistDuration({
      tracks: [track('a', 100_000), track('b', 160_000)],
      targetDurationMs: 300_000,
      toleranceMs: 10_000,
    })

    expect(result.tracks.map(item => item.id)).toEqual(['a', 'b'])
    expect(result.differenceMs).toBe(40_000)
    expect(result.isWithinTolerance).toBe(false)
    expect(result.strategy).toBe('best-effort')
  })

  it('does not mutate the input tracks', () => {
    const tracks = [track('a', 100_000), track('b', 200_000)]
    const snapshot = structuredClone(tracks)

    solvePlaylistDuration({
      tracks,
      targetDurationMs: 300_000,
      toleranceMs: 0,
    })

    expect(tracks).toEqual(snapshot)
  })

  it('ignores tracks with invalid durations', () => {
    const result = solvePlaylistDuration({
      tracks: [
        track('zero', 0),
        track('negative', -1),
        track('invalid', Number.NaN),
        track('valid', 120_000),
      ],
      targetDurationMs: 120_000,
      toleranceMs: 0,
    })

    expect(result.tracks.map(item => item.id)).toEqual(['valid'])
  })

  it('respects maxTracks, including cues', () => {
    const result = solvePlaylistDuration({
      tracks: [
        track('a', 100_000),
        track('b', 100_000),
        track('c', 100_000),
      ],
      targetDurationMs: 310_000,
      toleranceMs: 0,
      startCue: { ...track('start', 10_000), isCue: true },
      maxTracks: 3,
    })

    expect(result.tracks).toHaveLength(3)
    expect(result.tracks.map(item => item.id)).toEqual(['start', 'a', 'b'])
  })
})
