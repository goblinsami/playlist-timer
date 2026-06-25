interface TimerMixPlaybackTrack {
  name: string
  spotifyUri: string
}

interface TimerMixPlaybackInput {
  deviceId: string
  tracks: TimerMixPlaybackTrack[]
  totalDurationMs: number
  fadeDurationMs: number
  accessToken: string
}

const SPOTIFY_API_URL = 'https://api.spotify.com/v1'
const FADE_OUT_STEPS = [100, 80, 60, 40, 20, 0]
const FADE_IN_STEPS = [0, 20, 40, 60, 80, 100]

export function useTimerMix(input: MaybeRefOrGetter<TimerMixPlaybackInput>) {
  const isPlaying = ref(false)
  const currentTrackIndex = ref(0)
  const elapsedMs = ref(0)
  const error = ref('')
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let stopped = false
  let startedAtMs = 0

  const remainingMs = computed(() =>
    Math.max(0, toValue(input).totalDurationMs - elapsedMs.value),
  )

  async function startMix(): Promise<void> {
    const mixInput = toValue(input)

    if (isPlaying.value || mixInput.tracks.length === 0) {
      return
    }

    stopped = false
    isPlaying.value = true
    currentTrackIndex.value = 0
    elapsedMs.value = 0
    error.value = ''
    startedAtMs = Date.now()
    startElapsedClock()

    try {
      await playSequence(mixInput)
    }
    catch (playbackError: unknown) {
      if (!stopped) {
        error.value = playbackError instanceof Error
          ? playbackError.message
          : 'TIMER_MIX_PLAYBACK_FAILED'
      }
    }
    finally {
      await stopMix()
    }
  }

  async function stopMix(): Promise<void> {
    const mixInput = toValue(input)

    stopped = true
    clearTimers()
    isPlaying.value = false
    elapsedMs.value = startedAtMs
      ? Math.min(mixInput.totalDurationMs, Date.now() - startedAtMs)
      : elapsedMs.value

    if (mixInput.accessToken && mixInput.deviceId) {
      await pausePlayback(mixInput).catch(() => {})
    }
  }

  async function playSequence(mixInput: TimerMixPlaybackInput): Promise<void> {
    const blockDurationMs = mixInput.totalDurationMs / mixInput.tracks.length

    for (let index = 0; index < mixInput.tracks.length; index += 1) {
      if (stopped) {
        return
      }

      currentTrackIndex.value = index
      await startTrack(mixInput, mixInput.tracks[index])
      await setVolume(mixInput, 100)
      await fade(mixInput, FADE_IN_STEPS)
      await wait(Math.max(0, blockDurationMs - (mixInput.fadeDurationMs * 2)))
      await fade(mixInput, FADE_OUT_STEPS)
    }
  }

  function startElapsedClock(): void {
    const tick = () => {
      if (stopped) {
        return
      }

      elapsedMs.value = Math.min(toValue(input).totalDurationMs, Date.now() - startedAtMs)
      const timer = setTimeout(tick, 500)

      timers.add(timer)
    }

    tick()
  }

  function clearTimers(): void {
    for (const timer of timers) {
      clearTimeout(timer)
    }

    timers.clear()
  }

  function wait(durationMs: number): Promise<void> {
    if (durationMs <= 0 || stopped) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer)
        resolve()
      }, durationMs)

      timers.add(timer)
    })
  }

  async function fade(mixInput: TimerMixPlaybackInput, steps: number[]): Promise<void> {
    const stepDelayMs = steps.length > 1
      ? Math.floor(mixInput.fadeDurationMs / (steps.length - 1))
      : 0

    for (const volume of steps) {
      if (stopped) {
        return
      }

      await setVolume(mixInput, volume)
      await wait(stepDelayMs)
    }
  }

  onBeforeUnmount(() => {
    void stopMix()
  })

  return {
    isPlaying,
    currentTrackIndex,
    elapsedMs,
    remainingMs,
    error,
    startMix,
    stopMix,
  }
}

async function startTrack(
  input: TimerMixPlaybackInput,
  track: TimerMixPlaybackTrack,
): Promise<void> {
  const response = await fetch(
    `${SPOTIFY_API_URL}/me/player/play?device_id=${encodeURIComponent(input.deviceId)}`,
    {
      method: 'PUT',
      headers: getSpotifyHeaders(input.accessToken),
      body: JSON.stringify({
        uris: [track.spotifyUri],
        position_ms: 0,
      }),
    },
  )

  await assertSpotifyCommand(response, 'TIMER_MIX_PLAY_FAILED')
}

async function setVolume(
  input: TimerMixPlaybackInput,
  volumePercent: number,
): Promise<void> {
  const params = new URLSearchParams({
    volume_percent: String(volumePercent),
    device_id: input.deviceId,
  })
  const response = await fetch(`${SPOTIFY_API_URL}/me/player/volume?${params.toString()}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  })

  await assertSpotifyCommand(response, 'TIMER_MIX_VOLUME_FAILED')
}

async function pausePlayback(input: TimerMixPlaybackInput): Promise<void> {
  const response = await fetch(
    `${SPOTIFY_API_URL}/me/player/pause?device_id=${encodeURIComponent(input.deviceId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  )

  await assertSpotifyCommand(response, 'TIMER_MIX_PAUSE_FAILED')
}

function getSpotifyHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

async function assertSpotifyCommand(response: Response, code: string): Promise<void> {
  if (response.ok || response.status === 204) {
    return
  }

  throw new Error(code)
}
