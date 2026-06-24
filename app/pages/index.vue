<script setup lang="ts">
type Accuracy = 'exact' | 'balanced' | 'flexible'

interface PreviewTrack {
  id: string
  name: string
  artist: string
  durationMs: number
  spotifyUri?: string
  isCue?: boolean
}

interface PreviewResponse {
  previewId: string
  artist: {
    name: string
  }
  targetDurationMs: number
  actualDurationMs: number
  differenceMs: number
  isWithinTolerance: boolean
  tracks: PreviewTrack[]
}

interface SpotifyExportResponse {
  spotifyPlaylistId: string
  spotifyUrl: string
}

const toleranceByAccuracy: Record<Accuracy, number> = {
  exact: 10,
  balanced: 30,
  flexible: 60,
}

const route = useRoute()
const router = useRouter()
const artist = ref('Shakira')
const durationMinutes = ref<number | null>(7)
const accuracy = ref<Accuracy>('balanced')
const preview = ref<PreviewResponse | null>(null)
const isLoading = ref(false)
const isExporting = ref(false)
const errorMessage = ref('')
const exportErrorMessage = ref('')
const spotifyPlaylistUrl = ref('')

onMounted(async () => {
  const previewId = getQueryString(route.query.previewId)
  const spotifyAuth = getQueryString(route.query.spotifyAuth)
  const spotifyError = getQueryString(route.query.spotifyError)

  if (spotifyError) {
    exportErrorMessage.value = spotifyError
    return
  }

  if (!previewId) {
    return
  }

  await loadStoredPreview(previewId)

  if (spotifyAuth === 'success') {
    await exportPreviewToSpotify()
    await router.replace({ path: '/', query: { previewId } })
  }
})

async function handlePreviewSubmit(): Promise<void> {
  await generatePreview()
}

async function generatePreview(): Promise<void> {
  const requestedArtist = artist.value
  const requestedDurationMinutes = durationMinutes.value
  const requestedAccuracy = accuracy.value

  isLoading.value = true
  errorMessage.value = ''

  try {
    preview.value = await $fetch<PreviewResponse>('/api/preview', {
      method: 'POST',
      body: {
        artist: requestedArtist,
        durationMinutes: requestedDurationMinutes,
        toleranceSeconds: toleranceByAccuracy[requestedAccuracy],
        includeCues: true,
      },
    })
    exportErrorMessage.value = ''
    spotifyPlaylistUrl.value = ''
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error)
  }
  finally {
    isLoading.value = false
  }
}

async function loadStoredPreview(previewId: string): Promise<void> {
  isLoading.value = true
  errorMessage.value = ''

  try {
    preview.value = await $fetch<PreviewResponse>(`/api/preview/${previewId}`)
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error)
  }
  finally {
    isLoading.value = false
  }
}

function startSpotifyLogin(): void {
  const previewId = preview.value?.previewId ?? ''

  if (isExporting.value) {
    return
  }

  if (!previewId) {
    exportErrorMessage.value = 'Preview is missing. Generate a preview before exporting.'
    return
  }

  exportErrorMessage.value = ''
  isExporting.value = true
  window.location.href = `/api/spotify/login?previewId=${encodeURIComponent(previewId)}`
}

async function exportPreviewToSpotify(): Promise<void> {
  if (!preview.value || isExporting.value) {
    return
  }

  isExporting.value = true
  exportErrorMessage.value = ''
  spotifyPlaylistUrl.value = ''

  try {
    const result = await $fetch<SpotifyExportResponse>('/api/spotify/export', {
      method: 'POST',
      body: {
        previewId: preview.value.previewId,
      },
    })

    spotifyPlaylistUrl.value = result.spotifyUrl
  }
  catch (error: unknown) {
    exportErrorMessage.value = getErrorMessage(error)
  }
  finally {
    isExporting.value = false
  }
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'data' in error
    && typeof error.data === 'object'
    && error.data !== null
    && 'statusMessage' in error.data
    && typeof error.data.statusMessage === 'string'
  ) {
    if (error.data.statusMessage === 'SPOTIFY_ADD_TRACKS_FORBIDDEN') {
      return 'Spotify created the playlist but refused adding tracks. The empty playlist was removed if possible. Please check Spotify app permissions and try again.'
    }

    return error.data.statusMessage
  }

  return 'Unable to generate a preview. Please try again.'
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1_000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function getQueryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
</script>

<template>
  <main class="page-shell">
    <div class="page-content">
      <div class="page-layout">
        <div class="layout-spacer" aria-hidden="true" />

        <div class="primary-column">
          <section class="app-card" aria-labelledby="page-title">
            <header class="hero">
              <p class="eyebrow">
                Your time, your soundtrack
              </p>
              <h1 id="page-title">
                Playlist Timer
              </h1>
              <p class="subtitle">
                Create Spotify playlists that end exactly when you need them to.
              </p>
            </header>

            <form class="playlist-form" @submit.prevent="handlePreviewSubmit">
              <div class="field">
                <label for="artist">Artist</label>
                <input
                  id="artist"
                  v-model="artist"
                  type="text"
                  name="artist"
                  placeholder="e.g. Daft Punk"
                  autocomplete="on"
                  required
                >
              </div>

              <div class="field">
                <label for="duration">Duration in minutes</label>
                <input
                  id="duration"
                  v-model.number="durationMinutes"
                  type="number"
                  name="durationMinutes"
                  min="1"
                  step="1"
                  placeholder="45"
                  autocomplete="on"
                  inputmode="numeric"
                  required
                >
              </div>

              <fieldset class="field">
                <legend>Accuracy</legend>
                <div class="select-wrapper">
                  <select id="accuracy" v-model="accuracy" name="accuracy">
                    <option value="exact">
                      Exact ±10s
                    </option>
                    <option value="balanced">
                      Balanced ±30s
                    </option>
                    <option value="flexible">
                      Flexible ±60s
                    </option>
                  </select>
                </div>
              </fieldset>

              <button type="submit" :disabled="isLoading">
                {{ isLoading ? 'Generating…' : 'Generate Preview' }}
              </button>
            </form>

            <p v-if="errorMessage" class="form-error" role="alert">
              {{ errorMessage }}
            </p>

            <section
              class="preview"
              aria-labelledby="preview-title"
              aria-live="polite"
              :aria-busy="isLoading"
            >
              <div v-if="!preview" class="preview-empty">
                <div class="preview-icon" aria-hidden="true">
                  ♪
                </div>
                <div>
                  <h2 id="preview-title">
                    Playlist preview
                  </h2>
                  <p>
                    {{ isLoading ? 'Building your mock playlist…' : 'Your generated track list will appear here.' }}
                  </p>
                </div>
              </div>

              <template v-else>
                <div class="preview-heading">
                  <div>
                    <h2 id="preview-title">
                      Playlist preview
                    </h2>
                    <p>Mock tracks for {{ preview.artist.name }}</p>
                  </div>
                  <span
                    class="preview-status"
                    :class="{ 'preview-status--success': preview.isWithinTolerance }"
                  >
                    {{ preview.isWithinTolerance ? 'Within tolerance' : 'Best effort' }}
                  </span>
                </div>

                <dl class="preview-stats">
                  <div>
                    <dt>Target</dt>
                    <dd>{{ formatDuration(preview.targetDurationMs) }}</dd>
                  </div>
                  <div>
                    <dt>Actual</dt>
                    <dd>{{ formatDuration(preview.actualDurationMs) }}</dd>
                  </div>
                  <div>
                    <dt>Difference</dt>
                    <dd>{{ formatDuration(preview.differenceMs) }}</dd>
                  </div>
                </dl>

                <ol class="track-list">
                  <li v-for="track in preview.tracks" :key="track.id">
                    <div>
                      <strong>{{ track.name }}</strong>
                      <span>{{ track.artist }}{{ track.isCue ? ' · Cue' : '' }}</span>
                    </div>
                    <time :datetime="`PT${Math.round(track.durationMs / 1000)}S`">
                      {{ formatDuration(track.durationMs) }}
                    </time>
                  </li>
                </ol>

                <div style="display: grid; gap: 12px; margin-top: 20px;">
                  <button
                    v-if="!spotifyPlaylistUrl"
                    type="button"
                    :disabled="isExporting"
                    @click="startSpotifyLogin"
                  >
                    {{ isExporting ? 'Exportingâ€¦' : 'Export to Spotify' }}
                  </button>

                  <a
                    v-else
                    :href="spotifyPlaylistUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Spotify
                  </a>

                  <p v-if="exportErrorMessage" class="form-error" role="alert">
                    {{ exportErrorMessage }}
                  </p>
                </div>
              </template>
            </section>

            <AdSlot position="after-preview" />
          </section>

          <section class="seo-content" aria-labelledby="seo-title">
            <h2 id="seo-title">
              Create Spotify playlists by duration
            </h2>
            <p>
              Playlist Timer will generate playlists based on your chosen artist,
              target duration, and preferred accuracy.
            </p>
          </section>

          <AdSlot position="bottom" />
        </div>

        <div class="sidebar-column">
          <AdSlot position="sidebar" />
        </div>
      </div>
    </div>
  </main>
</template>
