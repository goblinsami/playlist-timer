import type { Track } from '../types/playlist'

const MOCK_TRACKS = [
  { name: 'First Light', durationMs: 168_000, popularity: 82 },
  { name: 'Open Road', durationMs: 192_000, popularity: 76 },
  { name: 'Midnight Signal', durationMs: 214_000, popularity: 91 },
  { name: 'Slow Motion', durationMs: 226_000, popularity: 68 },
  { name: 'Golden Hour', durationMs: 238_000, popularity: 88 },
  { name: 'City Echoes', durationMs: 181_000, popularity: 73 },
  { name: 'Afterglow', durationMs: 205_000, popularity: 85 },
  { name: 'Neon Skies', durationMs: 247_000, popularity: 79 },
  { name: 'New Perspective', durationMs: 156_000, popularity: 65 },
  { name: 'One More Night', durationMs: 219_000, popularity: 84 },
  { name: 'Northern Line', durationMs: 173_000, popularity: 71 },
  { name: 'Home Again', durationMs: 232_000, popularity: 80 },
] as const

export function getMockTracks(artist: string): Track[] {
  return MOCK_TRACKS.map((track, index) => ({
    id: `mock-track-${index + 1}`,
    name: track.name,
    artist,
    durationMs: track.durationMs,
    popularity: track.popularity,
  }))
}

export function getMockStartCue(): Track {
  return {
    id: 'start-cue',
    name: 'Playlist starts',
    artist: 'Playlist Timer',
    durationMs: 5_000,
    isCue: true,
  }
}

export function getMockEndCue(): Track {
  return {
    id: 'end-cue',
    name: 'Playlist ends',
    artist: 'Playlist Timer',
    durationMs: 5_000,
    isCue: true,
  }
}
