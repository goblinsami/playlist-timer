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
const FINAL_FADE_OUT_STEPS = [100, 80, 60, 40, 20, 0]
const TRANSITION_FADE_OUT_STEPS = [100, 70, 45, 25, 15]
const TRANSITION_FADE_IN_STEPS = [25, 45, 70, 100]
const DIRECT_PLAY_FALLBACK_POSITION_MS = 500
const SKIP_SETTLE_MS = 300
const MIN_TRANSITION_FADE_OUT_MS = 1500
const MAX_TRANSITION_FADE_OUT_MS = 2500
const MIN_TRANSITION_FADE_IN_MS = 800
const MAX_TRANSITION_FADE_IN_MS = 1500

export function useTimerMix(input: MaybeRefOrGetter<TimerMixPlaybackInput>) {
  const isPlaying = ref(false)
  const currentTrackIndex = ref(0)
  const elapsedMs = ref(0)
  const error = ref('')
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const pendingWaits = new Set<() => void>()
  const queuedTrackUris = new Set<string>()
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
    queuedTrackUris.clear()
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
    queuedTrackUris.clear()
    isPlaying.value = false
    elapsedMs.value = startedAtMs
      ? Math.min(mixInput.totalDurationMs, Date.now() - startedAtMs)
      : elapsedMs.value

    if (mixInput.accessToken && mixInput.deviceId) {
      await pausePlayback(mixInput).catch(() => {})
      await setVolume(mixInput, 100).catch(() => {})
    }
  }

  async function playSequence(mixInput: TimerMixPlaybackInput): Promise<void> {
    const blockDurationMs = mixInput.totalDurationMs / mixInput.tracks.length
    const transitionFadeOutMs = getTransitionFadeOutMs(mixInput.fadeDurationMs)
    const transitionFadeInMs = getTransitionFadeInMs(mixInput.fadeDurationMs)
    const transitionDurationMs = transitionFadeOutMs + SKIP_SETTLE_MS + transitionFadeInMs

    for (let index = 0; index < mixInput.tracks.length; index += 1) {
      if (stopped) {
        return
      }

      currentTrackIndex.value = index
      const currentTrack = mixInput.tracks[index]
      const nextTrack = mixInput.tracks[index + 1]
      const followingTrack = mixInput.tracks[index + 2]

      if (index === 0) {
        await setVolume(mixInput, 100).catch(() => {})
        await startTrack(mixInput, currentTrack)
      }

      if (nextTrack) {
        await queueNextTrack(mixInput, nextTrack)
        await wait(Math.max(0, blockDurationMs - transitionDurationMs))
        await transitionToNextTrack(
          mixInput,
          nextTrack,
          followingTrack,
          {
            fadeOutMs: transitionFadeOutMs,
            fadeInMs: transitionFadeInMs,
          },
        )
      }
      else {
        await wait(Math.max(0, blockDurationMs - mixInput.fadeDurationMs))
        await fade(mixInput, FINAL_FADE_OUT_STEPS, mixInput.fadeDurationMs)
      }
    }
  }

  async function queueNextTrack(
    mixInput: TimerMixPlaybackInput,
    track: TimerMixPlaybackTrack,
  ): Promise<void> {
    if (queuedTrackUris.has(track.spotifyUri)) {
      return
    }

    console.debug('timerMix: queue requested')
    const queued = await queueTrack(track.spotifyUri, mixInput.deviceId, mixInput.accessToken)

    if (queued) {
      queuedTrackUris.add(track.spotifyUri)
      console.debug('timerMix: queue success')
      return
    }

    console.debug('timerMix: queue failed')
  }

  async function transitionToNextTrack(
    mixInput: TimerMixPlaybackInput,
    nextTrack: TimerMixPlaybackTrack,
    followingTrack: TimerMixPlaybackTrack | undefined,
    durations: { fadeOutMs: number, fadeInMs: number },
  ): Promise<void> {
    console.debug('timerMix: transition start')
    await fade(mixInput, TRANSITION_FADE_OUT_STEPS, durations.fadeOutMs)

    if (stopped) {
      return
    }

    const skipped = await skipToNext(mixInput.deviceId, mixInput.accessToken)

    if (stopped) {
      return
    }

    if (skipped) {
      console.debug('timerMix: skip next success')
      if (followingTrack) {
        await queueNextTrack(mixInput, followingTrack)
      }
      await wait(SKIP_SETTLE_MS)
      await fade(mixInput, TRANSITION_FADE_IN_STEPS, durations.fadeInMs)
      return
    }

    console.debug('timerMix: skip next failed fallback to play')
    const played = await playDirectFallback(mixInput, nextTrack)

    if (!played) {
      throw new Error('TIMER_MIX_PLAY_FAILED')
    }

    if (followingTrack) {
      await queueNextTrack(mixInput, followingTrack)
    }

    await wait(SKIP_SETTLE_MS)
    await fade(mixInput, TRANSITION_FADE_IN_STEPS, durations.fadeInMs)
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

    for (const resolve of [...pendingWaits]) {
      resolve()
    }

    pendingWaits.clear()
  }

  function wait(durationMs: number): Promise<void> {
    if (durationMs <= 0 || stopped) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer)
        pendingWaits.delete(settle)
        resolve()
      }, durationMs)
      const settle = () => {
        clearTimeout(timer)
        timers.delete(timer)
        pendingWaits.delete(settle)
        resolve()
      }

      timers.add(timer)
      pendingWaits.add(settle)
    })
  }

  async function fade(
    mixInput: TimerMixPlaybackInput,
    steps: number[],
    durationMs: number,
  ): Promise<void> {
    const stepDelayMs = steps.length > 1
      ? Math.floor(durationMs / (steps.length - 1))
      : 0

    for (const volume of steps) {
      if (stopped) {
        return
      }

      await setVolume(mixInput, volume).catch(() => {})
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
  positionMs = 0,
): Promise<void> {
  const response = await fetch(
    `${SPOTIFY_API_URL}/me/player/play?device_id=${encodeURIComponent(input.deviceId)}`,
    {
      method: 'PUT',
      headers: getSpotifyHeaders(input.accessToken),
      body: JSON.stringify({
        uris: [track.spotifyUri],
        position_ms: positionMs,
      }),
    },
  )

  await assertSpotifyCommand(response, 'TIMER_MIX_PLAY_FAILED')
}

async function playDirectFallback(
  input: TimerMixPlaybackInput,
  track: TimerMixPlaybackTrack,
): Promise<boolean> {
  try {
    await startTrack(input, track, DIRECT_PLAY_FALLBACK_POSITION_MS)
    console.debug('timerMix: direct play fallback success')
    return true
  }
  catch {
    console.debug('timerMix: direct play fallback failed')
    return false
  }
}

async function queueTrack(
  uri: string,
  deviceId: string,
  accessToken: string,
): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      uri,
      device_id: deviceId,
    })
    const response = await fetch(`${SPOTIFY_API_URL}/me/player/queue?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (response.ok || response.status === 204) {
      console.debug('queue next track success')
      return true
    }

    console.debug('queue next track failed', { status: response.status })
    return false
  }
  catch {
    console.debug('queue next track failed')
    return false
  }
}

async function skipToNext(deviceId: string, accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${SPOTIFY_API_URL}/me/player/next?device_id=${encodeURIComponent(deviceId)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (response.ok || response.status === 204) {
      console.debug('skip to next success')
      return true
    }

    console.debug('skip to next failed', { status: response.status })
    return false
  }
  catch {
    console.debug('skip to next failed')
    return false
  }
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

function getTransitionFadeOutMs(fadeDurationMs: number): number {
  return clamp(fadeDurationMs, MIN_TRANSITION_FADE_OUT_MS, MAX_TRANSITION_FADE_OUT_MS)
}

function getTransitionFadeInMs(fadeDurationMs: number): number {
  return clamp(fadeDurationMs, MIN_TRANSITION_FADE_IN_MS, MAX_TRANSITION_FADE_IN_MS)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
