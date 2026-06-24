<script setup lang="ts">
type Accuracy = 'exact' | 'balanced' | 'flexible'
type LocaleCode = 'en' | 'es' | 'ca'
type SourceType = 'spotify-search' | 'liked-songs' | 'user-playlist'
type SelectionMode = 'recent' | 'random'

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
  source?: {
    type: SourceType
    playlistId?: string
    playlistName?: string
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

interface SpotifySessionResponse {
  hasAccessToken: boolean
  hasPlaylistReadPrivate?: boolean
  hasPlaylistReadCollaborative?: boolean
  hasUserLibraryRead?: boolean
}

interface UserPlaylist {
  id: string
  name: string
  ownerId: string
  totalItems: number
  imageUrl?: string
  isCollaborative: boolean
  isPublic: boolean
}

interface UserPlaylistsResponse {
  playlists: UserPlaylist[]
}

const toleranceByAccuracy: Record<Accuracy, number> = {
  exact: 10,
  balanced: 30,
  flexible: 60,
}

const sourceOptions: SourceType[] = ['spotify-search', 'liked-songs', 'user-playlist']
const selectionModeOptions: SelectionMode[] = ['recent', 'random']
const { t, locale, setLocale } = useI18n()
const route = useRoute()
const router = useRouter()
const sourceType = ref<SourceType>('spotify-search')
const selectionMode = ref<SelectionMode>('random')
const artist = ref('Shakira')
const durationMinutes = ref<number | null>(7)
const accuracy = ref<Accuracy>('balanced')
const playlists = ref<UserPlaylist[]>([])
const selectedPlaylistId = ref('')
const preview = ref<PreviewResponse | null>(null)
const isLoading = ref(false)
const isLoadingPlaylists = ref(false)
const isExporting = ref(false)
const hasSpotifyAccessToken = ref(false)
const hasPlaylistReadPrivate = ref(false)
const hasPlaylistReadCollaborative = ref(false)
const hasUserLibraryRead = ref(false)
const errorMessage = ref('')
const exportErrorMessage = ref('')
const spotifyPlaylistUrl = ref('')
const localeOptions: LocaleCode[] = ['en', 'es', 'ca']
const runtimeConfig = useRuntimeConfig()
const siteUrl = computed(() => normalizeSiteUrl(runtimeConfig.public.siteUrl))
const ogImageUrl = computed(() => `${siteUrl.value}/og-image.png`)

useSeoMeta({
  title: () => t('seo.meta.title'),
  description: () => t('seo.meta.description'),
  ogTitle: () => t('seo.og.title'),
  ogDescription: () => t('seo.og.description'),
  ogType: 'website',
  ogImage: () => ogImageUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.twitter.title'),
  twitterDescription: () => t('seo.twitter.description'),
  twitterImage: () => ogImageUrl.value,
})

useHead(() => ({
  htmlAttrs: {
    lang: locale.value,
  },
  link: [
    {
      rel: 'canonical',
      href: `${siteUrl.value}/`,
    },
  ],
}))

onMounted(async () => {
  const previewId = getQueryString(route.query.previewId)
  const spotifyAuth = getQueryString(route.query.spotifyAuth)
  const spotifyError = getQueryString(route.query.spotifyError)
  const querySourceType = getSourceType(route.query.sourceType)

  if (querySourceType) {
    sourceType.value = querySourceType
  }

  await loadSpotifySession()

  if (spotifyError) {
    exportErrorMessage.value = getStatusMessage(spotifyError)
    return
  }

  if (!previewId) {
    return
  }

  await loadStoredPreview(previewId)

  if (spotifyAuth === 'success') {
    if (previewId) {
      await exportPreviewToSpotify()
    }
    else if (sourceType.value === 'user-playlist') {
      await loadUserPlaylists()
    }

    await router.replace({
      path: '/',
      query: previewId ? { previewId } : {},
    })
  }
})

async function handlePreviewSubmit(): Promise<void> {
  await generatePreview()
}

async function generatePreview(): Promise<void> {
  const requestedArtist = artist.value
  const requestedDurationMinutes = durationMinutes.value
  const requestedAccuracy = accuracy.value
  const requestedSourceType = sourceType.value
  const requestedSelectionMode = selectionMode.value
  const requestedPlaylistId = selectedPlaylistId.value

  isLoading.value = true
  errorMessage.value = ''

  try {
    preview.value = await $fetch<PreviewResponse>('/api/preview', {
      method: 'POST',
      body: {
        sourceType: requestedSourceType,
        ...(requestedSourceType === 'spotify-search'
          ? { artist: requestedArtist }
          : { artistFilter: requestedArtist }),
        ...(requestedSourceType === 'user-playlist'
          ? { playlistId: requestedPlaylistId }
          : {}),
        ...(requestedSourceType !== 'spotify-search'
          ? { selectionMode: requestedSelectionMode }
          : {}),
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

async function loadSpotifySession(): Promise<void> {
  try {
    const session = await $fetch<SpotifySessionResponse>('/api/debug/spotify-session')

    hasSpotifyAccessToken.value = session.hasAccessToken
    hasPlaylistReadPrivate.value = session.hasPlaylistReadPrivate === true
    hasPlaylistReadCollaborative.value = session.hasPlaylistReadCollaborative === true
    hasUserLibraryRead.value = session.hasUserLibraryRead === true
  }
  catch {
    hasSpotifyAccessToken.value = false
    hasPlaylistReadPrivate.value = false
    hasPlaylistReadCollaborative.value = false
    hasUserLibraryRead.value = false
  }
}

async function loadUserPlaylists(): Promise<void> {
  if (!hasRequiredSourceAuth.value) {
    return
  }

  isLoadingPlaylists.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<UserPlaylistsResponse>('/api/spotify/playlists')

    playlists.value = response.playlists

    if (!selectedPlaylistId.value && response.playlists.length > 0) {
      selectedPlaylistId.value = response.playlists[0]?.id ?? ''
    }
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error)
  }
  finally {
    isLoadingPlaylists.value = false
  }
}

function startSpotifyLogin(): void {
  const previewId = preview.value?.previewId ?? ''

  if (isExporting.value) {
    return
  }

  if (!previewId) {
    exportErrorMessage.value = t('errors.missingPreview')
    return
  }

  exportErrorMessage.value = ''
  isExporting.value = true
  window.location.href = `/api/spotify/login?previewId=${encodeURIComponent(previewId)}`
}

function connectSpotifyForSource(): void {
  if (sourceType.value === 'spotify-search') {
    return
  }

  window.location.href = `/api/spotify/login?sourceType=${encodeURIComponent(sourceType.value)}`
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
    return getStatusMessage(error.data.statusMessage)
  }

  return t('errors.previewFailed')
}

function getStatusMessage(statusMessage: string): string {
  const translationKey = `errors.codes.${statusMessage}`
  const translatedMessage = t(translationKey)

  return translatedMessage === translationKey ? statusMessage : translatedMessage
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

function getSourceType(value: unknown): SourceType | '' {
  return typeof value === 'string' && sourceOptions.includes(value as SourceType)
    ? value as SourceType
    : ''
}

function getSourceLabelKey(value: SourceType): string {
  const keys: Record<SourceType, string> = {
    'spotify-search': 'source.spotifySearch',
    'liked-songs': 'source.likedSongs',
    'user-playlist': 'source.myPlaylists',
  }

  return keys[value]
}

function getSelectionModeLabelKey(value: SelectionMode): string {
  const keys: Record<SelectionMode, string> = {
    recent: 'source.selectionMode.recent',
    random: 'source.selectionMode.random',
  }

  return keys[value]
}

function normalizeSiteUrl(value: unknown): string {
  const rawSiteUrl = typeof value === 'string' && value.trim()
    ? value.trim()
    : 'http://127.0.0.1:3000'

  return rawSiteUrl.replace(/\/+$/, '')
}

function handleLocaleChange(event: Event): void {
  const target = event.target as HTMLSelectElement

  void setLocale(target.value as LocaleCode)
}

async function handleSourceChange(): Promise<void> {
  if (sourceType.value === 'user-playlist' && hasRequiredSourceAuth.value) {
    await loadUserPlaylists()
  }
}

const isPersonalSource = computed(() => sourceType.value !== 'spotify-search')
const artistInputRequired = computed(() => sourceType.value === 'spotify-search')
const hasRequiredSourceAuth = computed(() => {
  if (sourceType.value === 'liked-songs') {
    return hasSpotifyAccessToken.value && hasUserLibraryRead.value
  }

  if (sourceType.value === 'user-playlist') {
    return hasSpotifyAccessToken.value
      && hasPlaylistReadPrivate.value
      && hasPlaylistReadCollaborative.value
  }

  return true
})
const isPreviewSubmitDisabled = computed(() =>
  isLoading.value
  || (isPersonalSource.value && !hasRequiredSourceAuth.value)
  || (sourceType.value === 'user-playlist' && !selectedPlaylistId.value),
)
const sourceConnectLabel = computed(() =>
  sourceType.value === 'liked-songs'
    ? t('source.connectForLikedSongs')
    : t('source.connectForPlaylists'),
)
</script>

<template>
  <main class="page-shell">
    <div class="page-content">
      <div class="page-layout">
        <div class="layout-spacer" aria-hidden="true" />

        <div class="primary-column">
          <section class="app-card" aria-labelledby="page-title">
            <label class="language-switcher">
              <span>{{ t('language.label') }}</span>
              <select :value="locale" name="language" @change="handleLocaleChange">
                <option
                  v-for="localeCode in localeOptions"
                  :key="localeCode"
                  :value="localeCode"
                >
                  {{ t(`language.options.${localeCode}`) }}
                </option>
              </select>
            </label>

            <header class="hero">
              <p class="eyebrow">
                {{ t('app.name') }}
              </p>
              <h1 id="page-title">
                {{ t('hero.title') }}
              </h1>
              <p class="subtitle">
                {{ t('hero.subtitle') }}
              </p>
            </header>

            <form class="playlist-form" @submit.prevent="handlePreviewSubmit">
              <div class="field">
                <label for="source">{{ t('source.label') }}</label>
                <div class="select-wrapper">
                  <select
                    id="source"
                    v-model="sourceType"
                    name="sourceType"
                    @change="handleSourceChange"
                  >
                    <option
                      v-for="option in sourceOptions"
                      :key="option"
                      :value="option"
                    >
                      {{ t(getSourceLabelKey(option)) }}
                    </option>
                  </select>
                </div>
              </div>

              <div
                v-if="isPersonalSource && !hasRequiredSourceAuth"
                class="field"
              >
                <button
                  type="button"
                  @click="connectSpotifyForSource"
                >
                  {{ sourceConnectLabel }}
                </button>
              </div>

              <div
                v-if="sourceType === 'user-playlist' && hasRequiredSourceAuth"
                class="field"
              >
                <label for="playlist">{{ t('source.selectPlaylist') }}</label>
                <div class="select-wrapper">
                  <select
                    id="playlist"
                    v-model="selectedPlaylistId"
                    name="playlistId"
                    :disabled="isLoadingPlaylists || playlists.length === 0"
                  >
                    <option
                      v-for="playlist in playlists"
                      :key="playlist.id"
                      :value="playlist.id"
                    >
                      {{ playlist.name }} · {{ playlist.totalItems }}
                    </option>
                  </select>
                </div>
                <p v-if="isLoadingPlaylists" class="field-hint">
                  {{ t('source.loadingPlaylists') }}
                </p>
                <p v-else-if="playlists.length === 0" class="field-hint">
                  {{ t('source.noPlaylistsFound') }}
                </p>
              </div>

              <div v-if="isPersonalSource" class="field">
                <label for="selection-mode">{{ t('source.selectionMode.label') }}</label>
                <div class="select-wrapper">
                  <select
                    id="selection-mode"
                    v-model="selectionMode"
                    name="selectionMode"
                  >
                    <option
                      v-for="option in selectionModeOptions"
                      :key="option"
                      :value="option"
                    >
                      {{ t(getSelectionModeLabelKey(option)) }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="field">
                <label for="artist">
                  {{ artistInputRequired ? t('form.artist.label') : t('source.artistFilterOptional') }}
                </label>
                <input
                  id="artist"
                  v-model="artist"
                  type="text"
                  name="artist"
                  :placeholder="t('form.artist.placeholder')"
                  autocomplete="on"
                  :required="artistInputRequired"
                >
              </div>

              <div class="field">
                <label for="duration">{{ t('form.duration.label') }}</label>
                <input
                  id="duration"
                  v-model.number="durationMinutes"
                  type="number"
                  name="durationMinutes"
                  min="1"
                  step="1"
                  :placeholder="t('form.duration.placeholder')"
                  autocomplete="on"
                  inputmode="numeric"
                  required
                >
              </div>

              <fieldset class="field">
                <legend>{{ t('form.accuracy.label') }}</legend>
                <div class="select-wrapper">
                  <select id="accuracy" v-model="accuracy" name="accuracy">
                    <option value="exact">
                      {{ t('form.accuracy.exact') }}
                    </option>
                    <option value="balanced">
                      {{ t('form.accuracy.balanced') }}
                    </option>
                    <option value="flexible">
                      {{ t('form.accuracy.flexible') }}
                    </option>
                  </select>
                </div>
              </fieldset>

              <button type="submit" :disabled="isPreviewSubmitDisabled">
                {{ isLoading ? t('loading.generating') : t('form.generate') }}
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
                    {{ t('preview.title') }}
                  </h2>
                  <p>
                    {{ isLoading ? t('preview.building') : t('preview.empty') }}
                  </p>
                </div>
              </div>

              <template v-else>
                <div class="preview-heading">
                  <div>
                    <h2 id="preview-title">
                      {{ t('preview.title') }}
                    </h2>
                    <p>{{ t('preview.tracksFor', { artist: preview.artist.name }) }}</p>
                  </div>
                  <span
                    class="preview-status"
                    :class="{ 'preview-status--success': preview.isWithinTolerance }"
                  >
                    {{ preview.isWithinTolerance ? t('preview.withinTolerance') : t('preview.outsideTolerance') }}
                  </span>
                </div>

                <dl class="preview-stats">
                  <div>
                    <dt>{{ t('preview.target') }}</dt>
                    <dd>{{ formatDuration(preview.targetDurationMs) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('preview.actual') }}</dt>
                    <dd>{{ formatDuration(preview.actualDurationMs) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('preview.difference') }}</dt>
                    <dd>{{ formatDuration(preview.differenceMs) }}</dd>
                  </div>
                </dl>

                <ol class="track-list" :aria-label="t('preview.tracks')">
                  <li v-for="track in preview.tracks" :key="track.id">
                    <div>
                      <strong>{{ track.name }}</strong>
                      <span>{{ track.artist }}{{ track.isCue ? ` · ${t('preview.cue')}` : '' }}</span>
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
                    {{ isExporting ? t('loading.exporting') : t('form.export') }}
                  </button>

                  <a
                    v-else
                    class="spotify-open-link"
                    :href="spotifyPlaylistUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span aria-hidden="true">♪</span>
                    {{ t('preview.openInSpotify') }}
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
              {{ t('seo.title') }}
            </h2>
            <p>
              {{ t('seo.description') }}
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
