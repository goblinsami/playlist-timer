<script setup lang="ts">
type Accuracy = 'exact' | 'balanced' | 'flexible'
type AppMode = 'playlist-timer' | 'timer-mix'
type LocaleCode = 'en' | 'es' | 'ca'
type SourceType = 'spotify-search' | 'liked-songs' | 'user-playlist'
type SelectionMode = 'recent' | 'random'

interface PreviewTrack {
  id: string
  name: string
  artist: string
  artists?: string[]
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
  hasStreaming?: boolean
  hasUserReadPlaybackState?: boolean
  hasUserModifyPlaybackState?: boolean
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

interface SpotifyTokenResponse {
  accessToken: string
}

interface TimerMixResponse {
  mixId: string
  source: {
    type: SourceType
    artist?: string
    artistFilter?: string
    playlistId?: string
    playlistName?: string
    selectionMode?: SelectionMode
  }
  totalDurationMs: number
  songCount: number
  fadeDurationMs: number
  blockDurationMs: number
  tracks: PreviewTrack[]
  warnings: string[]
}

interface StoredFormState {
  appMode: AppMode
  sourceType: SourceType
  selectionMode: SelectionMode
  artist: string
  durationMinutes: number | null
  songCount: number | null
  fadeSeconds: number | null
  accuracy: Accuracy
  selectedPlaylistId: string
}

const toleranceByAccuracy: Record<Accuracy, number> = {
  exact: 10,
  balanced: 30,
  flexible: 60,
}

const modeOptions: AppMode[] = ['timer-mix', 'playlist-timer']
const sourceOptions: SourceType[] = ['spotify-search', 'liked-songs', 'user-playlist']
const selectionModeOptions: SelectionMode[] = ['recent', 'random']
const FORM_STATE_STORAGE_KEY = 'playlist-timer-form-state'
const { t, locale, setLocale } = useI18n()
const route = useRoute()
const router = useRouter()
const appMode = ref<AppMode>('timer-mix')
const sourceType = ref<SourceType>('spotify-search')
const selectionMode = ref<SelectionMode>('random')
const artist = ref('')
const durationMinutes = ref<number | null>(null)
const songCount = ref<number | null>(null)
const fadeSeconds = ref<number | null>(null)
const accuracy = ref<Accuracy>('balanced')
const playlists = ref<UserPlaylist[]>([])
const selectedPlaylistId = ref('')
const preview = ref<PreviewResponse | null>(null)
const timerMix = ref<TimerMixResponse | null>(null)
const timerMixAccessToken = ref('')
const isLoading = ref(false)
const isPreparingMix = ref(false)
const isLoadingPlaylists = ref(false)
const isExporting = ref(false)
const hasSpotifyAccessToken = ref(false)
const hasPlaylistReadPrivate = ref(false)
const hasPlaylistReadCollaborative = ref(false)
const hasUserLibraryRead = ref(false)
const hasStreaming = ref(false)
const hasUserReadPlaybackState = ref(false)
const hasUserModifyPlaybackState = ref(false)
const errorMessage = ref('')
const timerMixErrorMessage = ref('')
const exportErrorMessage = ref('')
const spotifyPlaylistUrl = ref('')
const localeOptions: LocaleCode[] = ['en', 'es', 'ca']
const spotifyPlayer = useSpotifyPlayer()
const timerMixPlaybackInput = computed(() => ({
  deviceId: spotifyPlayer.deviceId.value,
  tracks: timerMix.value?.tracks
    .filter(track => Boolean(track.spotifyUri))
    .map(track => ({
      name: track.name,
      spotifyUri: track.spotifyUri ?? '',
    })) ?? [],
  totalDurationMs: timerMix.value?.totalDurationMs ?? 0,
  fadeDurationMs: timerMix.value?.fadeDurationMs ?? 0,
  accessToken: timerMixAccessToken.value,
}))
const timerMixPlayback = useTimerMix(timerMixPlaybackInput)
const runtimeConfig = useRuntimeConfig()
const appName = runtimeConfig.public.appName
const siteUrl = computed(() => normalizeSiteUrl(runtimeConfig.public.siteUrl))
const ogImageUrl = computed(() => `${siteUrl.value}/og-image.png`)

useSeoMeta({
  title: () => t('seo.meta.title', { appName }),
  description: () => t('seo.meta.description', { appName }),
  ogTitle: () => t('seo.og.title', { appName }),
  ogDescription: () => t('seo.og.description', { appName }),
  ogType: 'website',
  ogImage: () => ogImageUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.twitter.title', { appName }),
  twitterDescription: () => t('seo.twitter.description', { appName }),
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
  const rawSourceType = getQueryString(route.query.sourceType)
  const querySourceType = getSourceType(route.query.sourceType)

  if (previewId || spotifyAuth || spotifyError) {
    restoreStoredFormState()
  }

  if (rawSourceType === 'timer-mix') {
    appMode.value = 'timer-mix'
  }

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

async function handleMainSubmit(): Promise<void> {
  if (appMode.value === 'timer-mix') {
    await prepareTimerMix()
    return
  }

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
    hasStreaming.value = session.hasStreaming === true
    hasUserReadPlaybackState.value = session.hasUserReadPlaybackState === true
    hasUserModifyPlaybackState.value = session.hasUserModifyPlaybackState === true
  }
  catch {
    hasSpotifyAccessToken.value = false
    hasPlaylistReadPrivate.value = false
    hasPlaylistReadCollaborative.value = false
    hasUserLibraryRead.value = false
    hasStreaming.value = false
    hasUserReadPlaybackState.value = false
    hasUserModifyPlaybackState.value = false
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
  saveFormState()
  window.location.href = `/api/spotify/login?previewId=${encodeURIComponent(previewId)}`
}

function connectSpotifyForSource(): void {
  if (sourceType.value === 'spotify-search') {
    return
  }

  saveFormState()
  window.location.href = `/api/spotify/login?sourceType=${encodeURIComponent(sourceType.value)}`
}

function connectSpotifyForTimerMix(): void {
  saveFormState()
  window.location.href = '/api/spotify/login?sourceType=timer-mix'
}

function resetRootForm(): void {
  appMode.value = 'timer-mix'
  sourceType.value = 'spotify-search'
  selectionMode.value = 'random'
  artist.value = ''
  durationMinutes.value = null
  songCount.value = null
  fadeSeconds.value = null
  accuracy.value = 'balanced'
  selectedPlaylistId.value = ''
  preview.value = null
  timerMix.value = null
  timerMixAccessToken.value = ''
  errorMessage.value = ''
  timerMixErrorMessage.value = ''
  exportErrorMessage.value = ''
  spotifyPlaylistUrl.value = ''
  clearStoredFormState()

  if (timerMixPlayback.isPlaying.value) {
    void timerMixPlayback.stopMix()
  }
}

function saveFormState(): void {
  sessionStorage.setItem(FORM_STATE_STORAGE_KEY, JSON.stringify({
    appMode: appMode.value,
    sourceType: sourceType.value,
    selectionMode: selectionMode.value,
    artist: artist.value,
    durationMinutes: durationMinutes.value,
    songCount: songCount.value,
    fadeSeconds: fadeSeconds.value,
    accuracy: accuracy.value,
    selectedPlaylistId: selectedPlaylistId.value,
  } satisfies StoredFormState))
}

function restoreStoredFormState(): void {
  const rawState = sessionStorage.getItem(FORM_STATE_STORAGE_KEY)

  if (!rawState) {
    return
  }

  try {
    const state = JSON.parse(rawState) as Partial<StoredFormState>

    if (isAppMode(state.appMode)) {
      appMode.value = state.appMode
    }

    if (isSourceType(state.sourceType)) {
      sourceType.value = state.sourceType
    }

    if (isSelectionMode(state.selectionMode)) {
      selectionMode.value = state.selectionMode
    }

    if (typeof state.artist === 'string') {
      artist.value = state.artist
    }

    if (isNullableNumber(state.durationMinutes)) {
      durationMinutes.value = state.durationMinutes
    }

    if (isNullableNumber(state.songCount)) {
      songCount.value = state.songCount
    }

    if (isNullableNumber(state.fadeSeconds)) {
      fadeSeconds.value = state.fadeSeconds
    }

    if (isAccuracy(state.accuracy)) {
      accuracy.value = state.accuracy
    }

    if (typeof state.selectedPlaylistId === 'string') {
      selectedPlaylistId.value = state.selectedPlaylistId
    }
  }
  catch {
    clearStoredFormState()
  }
}

function clearStoredFormState(): void {
  sessionStorage.removeItem(FORM_STATE_STORAGE_KEY)
}

async function prepareTimerMix(): Promise<void> {
  const requestedSourceType = sourceType.value

  isPreparingMix.value = true
  timerMixErrorMessage.value = ''
  timerMix.value = null

  try {
    timerMix.value = await $fetch<TimerMixResponse>('/api/timer-mix/prepare', {
      method: 'POST',
      body: {
        sourceType: requestedSourceType,
        ...(requestedSourceType === 'spotify-search'
          ? { artist: artist.value }
          : { artistFilter: artist.value }),
        ...(requestedSourceType === 'user-playlist'
          ? { playlistId: selectedPlaylistId.value }
          : {}),
        selectionMode: selectionMode.value,
        durationMinutes: durationMinutes.value,
        songCount: songCount.value,
        fadeSeconds: fadeSeconds.value,
      },
    })
  }
  catch (error: unknown) {
    timerMixErrorMessage.value = getErrorMessage(error)
  }
  finally {
    isPreparingMix.value = false
  }
}

async function connectSpotifyPlayer(): Promise<void> {
  timerMixErrorMessage.value = ''

  if (!hasTimerMixPlaybackAuth.value) {
    connectSpotifyForTimerMix()
    return
  }

  await spotifyPlayer.connectPlayer()
}

async function startTimerMix(): Promise<void> {
  timerMixErrorMessage.value = ''

  if (!hasTimerMixPlaybackAuth.value) {
    connectSpotifyForTimerMix()
    return
  }

  try {
    const token = await $fetch<SpotifyTokenResponse>('/api/spotify/token')

    timerMixAccessToken.value = token.accessToken
    await nextTick()
    await timerMixPlayback.startMix()
  }
  catch (error: unknown) {
    timerMixErrorMessage.value = getErrorMessage(error)
  }
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

function isAppMode(value: unknown): value is AppMode {
  return typeof value === 'string' && modeOptions.includes(value as AppMode)
}

function isSourceType(value: unknown): value is SourceType {
  return typeof value === 'string' && sourceOptions.includes(value as SourceType)
}

function isSelectionMode(value: unknown): value is SelectionMode {
  return typeof value === 'string' && selectionModeOptions.includes(value as SelectionMode)
}

function isAccuracy(value: unknown): value is Accuracy {
  return typeof value === 'string' && value in toleranceByAccuracy
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

function selectMode(mode: AppMode): void {
  appMode.value = mode
  errorMessage.value = ''
  timerMixErrorMessage.value = ''
}

function isIgnorableReadyPlayerError(message: string): boolean {
  return spotifyPlayer.isReady.value && message === 'Invalid token scopes.'
}

function getSourceLabelKey(value: SourceType): string {
  const keys: Record<SourceType, string> = {
    'spotify-search': 'source.spotifySearch',
    'liked-songs': 'source.likedSongs',
    'user-playlist': 'source.myPlaylists',
  }

  return keys[value]
}

function getModeLabel(value: AppMode): string {
  return value === 'timer-mix' ? t('mode.timerMix') : t('mode.playlistTimer')
}

function getTimerMixSourceLabelKey(value: SourceType): string {
  const keys: Record<SourceType, string> = {
    'spotify-search': 'timerMix.spotifySearch',
    'liked-songs': 'timerMix.likedSongs',
    'user-playlist': 'timerMix.myPlaylists',
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
const hasTimerMixPlaybackAuth = computed(() =>
  hasSpotifyAccessToken.value
  && hasStreaming.value
  && hasUserReadPlaybackState.value
  && hasUserModifyPlaybackState.value,
)
const isTimerMixPrepareDisabled = computed(() =>
  isPreparingMix.value
  || (isPersonalSource.value && !hasRequiredSourceAuth.value)
  || (sourceType.value === 'user-playlist' && !selectedPlaylistId.value),
)
const isTimerMixStartDisabled = computed(() =>
  !timerMix.value
  || !spotifyPlayer.isReady.value
  || !hasTimerMixPlaybackAuth.value
  || timerMixPlayback.isPlaying.value,
)
const timerMixCurrentTrack = computed(() =>
  timerMix.value?.tracks[timerMixPlayback.currentTrackIndex.value],
)
const timerMixNextTrack = computed(() =>
  timerMix.value?.tracks[timerMixPlayback.currentTrackIndex.value + 1],
)
const spotifyPlayerError = computed(() =>
  spotifyPlayer.error.value && !isIgnorableReadyPlayerError(spotifyPlayer.error.value)
    ? getStatusMessage(spotifyPlayer.error.value)
    : '',
)
const timerMixPlaybackError = computed(() =>
  timerMixPlayback.error.value
    ? getStatusMessage(timerMixPlayback.error.value)
    : '',
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
                <NuxtLink class="app-home-link" to="/" @click="resetRootForm">
                  {{ appName }}
                </NuxtLink>
              </p>
              <h1 id="page-title">
                {{ t('hero.title') }}
              </h1>
              <p class="subtitle">
                {{ t('hero.subtitle') }}
              </p>
              <div class="button-row hero-actions">
                <button type="button" @click="selectMode('timer-mix')">
                  {{ t('hero.primaryCta') }}
                </button>
                <button class="button--secondary" type="button" @click="selectMode('playlist-timer')">
                  {{ t('hero.secondaryCta') }}
                </button>
              </div>
            </header>

            <div class="field mode-switcher">
              <label for="app-mode">{{ t('mode.label') }}</label>
              <div class="select-wrapper">
                <select
                  id="app-mode"
                  v-model="appMode"
                  name="appMode"
                >
                  <option
                    v-for="option in modeOptions"
                    :key="option"
                    :value="option"
                  >
                    {{ getModeLabel(option) }}
                  </option>
                </select>
              </div>
            </div>

            <form
              v-if="appMode === 'playlist-timer'"
              class="playlist-form"
              @submit.prevent="handleMainSubmit"
            >
              <div>
                <h2 class="section-title">
                  {{ t('playlistTimer.title') }}
                </h2>
                <p class="field-hint">
                  {{ t('playlistTimer.description') }}
                </p>
                <p class="field-hint">
                  {{ t('playlistTimer.helper') }}
                </p>
              </div>

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
                      {{ playlist.name }} &middot; {{ playlist.totalItems }}
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

            <form
              v-else
              class="playlist-form"
              @submit.prevent="handleMainSubmit"
            >
              <div>
                <h2 class="section-title">
                  {{ t('timerMix.title') }}
                  <span class="feature-badge">{{ t('timerMix.experimental') }}</span>
                </h2>
                <p class="field-hint">
                  {{ t('timerMix.description', { appName }) }}
                </p>
                <p class="field-hint">
                  {{ t('timerMix.helper') }}
                </p>
              </div>

              <div class="field">
                <label for="timer-mix-source">{{ t('timerMix.source') }}</label>
                <div class="select-wrapper">
                  <select
                    id="timer-mix-source"
                    v-model="sourceType"
                    name="timerMixSourceType"
                    @change="handleSourceChange"
                  >
                    <option
                      v-for="option in sourceOptions"
                      :key="option"
                      :value="option"
                    >
                      {{ t(getTimerMixSourceLabelKey(option)) }}
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
                <label for="timer-mix-playlist">{{ t('source.selectPlaylist') }}</label>
                <div class="select-wrapper">
                  <select
                    id="timer-mix-playlist"
                    v-model="selectedPlaylistId"
                    name="timerMixPlaylistId"
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
                <label for="timer-mix-selection-mode">{{ t('timerMix.selectionMode') }}</label>
                <div class="select-wrapper">
                  <select
                    id="timer-mix-selection-mode"
                    v-model="selectionMode"
                    name="timerMixSelectionMode"
                  >
                    <option value="random">
                      {{ t('timerMix.random') }}
                    </option>
                    <option value="recent">
                      {{ t('timerMix.recent') }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="field">
                <label for="timer-mix-artist">
                  {{ sourceType === 'spotify-search' ? t('timerMix.artist') : t('timerMix.artistFilterOptional') }}
                </label>
                <input
                  id="timer-mix-artist"
                  v-model="artist"
                  type="text"
                  name="timerMixArtist"
                  :placeholder="t('form.artist.placeholder')"
                  autocomplete="on"
                  :required="sourceType === 'spotify-search'"
                >
              </div>

              <div class="form-grid">
                <div class="field">
                  <label for="timer-mix-duration">{{ t('timerMix.duration') }}</label>
                  <input
                    id="timer-mix-duration"
                    v-model.number="durationMinutes"
                    type="number"
                  name="timerMixDurationMinutes"
                  min="1"
                  max="30"
                  step="1"
                  placeholder="7"
                  inputmode="numeric"
                  required
                >
                </div>

                <div class="field">
                  <label for="timer-mix-song-count">{{ t('timerMix.songCount') }}</label>
                  <input
                    id="timer-mix-song-count"
                    v-model.number="songCount"
                    type="number"
                  name="timerMixSongCount"
                  min="1"
                  max="10"
                  step="1"
                  placeholder="3"
                  inputmode="numeric"
                  required
                >
                </div>

                <div class="field">
                  <label for="timer-mix-fade">{{ t('timerMix.fadeSeconds') }}</label>
                  <input
                    id="timer-mix-fade"
                    v-model.number="fadeSeconds"
                    type="number"
                  name="timerMixFadeSeconds"
                  min="0"
                  max="15"
                  step="1"
                  placeholder="5"
                  inputmode="numeric"
                  required
                >
                </div>
              </div>

              <p class="timer-mix-note">
                {{ t('timerMix.requiresPremium') }}
              </p>

              <p class="timer-mix-note">
                {{ t('timerMix.limitation') }}
              </p>

              <button type="submit" :disabled="isTimerMixPrepareDisabled">
                {{ isPreparingMix ? t('preview.building') : t('timerMix.prepare') }}
              </button>
            </form>

            <p v-if="errorMessage" class="form-error" role="alert">
              {{ errorMessage }}
            </p>

            <p v-if="timerMixErrorMessage" class="form-error" role="alert">
              {{ timerMixErrorMessage }}
            </p>

            <p v-if="spotifyPlayerError" class="form-error" role="alert">
              {{ t('timerMix.sdkError') }} {{ spotifyPlayerError }}
            </p>

            <p v-if="timerMixPlaybackError" class="form-error" role="alert">
              {{ timerMixPlaybackError }}
            </p>

            <section
              v-if="appMode === 'playlist-timer'"
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

            <section
              v-else
              class="preview"
              aria-labelledby="timer-mix-preview-title"
              aria-live="polite"
              :aria-busy="isPreparingMix"
            >
              <div v-if="!timerMix" class="preview-empty">
                <div class="preview-icon" aria-hidden="true">
                  TM
                </div>
                <div>
                  <h2 id="timer-mix-preview-title">
                    {{ t('timerMix.title') }}
                  </h2>
                  <p>
                    {{ isPreparingMix ? t('preview.building') : t('preview.empty') }}
                  </p>
                </div>
              </div>

              <template v-else>
                <div class="preview-heading">
                  <div>
                    <h2 id="timer-mix-preview-title">
                      {{ t('timerMix.title') }}
                    </h2>
                    <p>
                      {{ t('timerMix.requiresPremium') }}
                    </p>
                  </div>
                  <span class="preview-status preview-status--success">
                    {{ timerMix.songCount }}
                  </span>
                </div>

                <dl class="preview-stats">
                  <div>
                    <dt>{{ t('preview.target') }}</dt>
                    <dd>{{ formatDuration(timerMix.totalDurationMs) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('timerMix.songCount') }}</dt>
                    <dd>{{ timerMix.songCount }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('timerMix.blockDuration') }}</dt>
                    <dd>{{ formatDuration(timerMix.blockDurationMs) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('timerMix.remaining') }}</dt>
                    <dd>{{ formatDuration(timerMixPlayback.remainingMs.value) }}</dd>
                  </div>
                </dl>

                <div class="timer-mix-now">
                  <p>
                    <strong>{{ t('timerMix.currentTrack') }}</strong>
                    <span>{{ timerMixCurrentTrack?.name ?? '-' }}</span>
                  </p>
                  <p>
                    <strong>{{ t('timerMix.nextTrack') }}</strong>
                    <span>{{ timerMixNextTrack?.name ?? '-' }}</span>
                  </p>
                </div>

                <ol class="track-list" :aria-label="t('preview.tracks')">
                  <li v-for="track in timerMix.tracks" :key="track.id">
                    <div>
                      <strong>{{ track.name }}</strong>
                      <span>{{ track.artist }}</span>
                    </div>
                    <time :datetime="`PT${Math.round(track.durationMs / 1000)}S`">
                      {{ formatDuration(track.durationMs) }}
                    </time>
                  </li>
                </ol>

                <ul v-if="timerMix.warnings.length" class="warning-list">
                  <li v-for="warning in timerMix.warnings" :key="warning">
                    {{ getStatusMessage(warning) }}
                  </li>
                </ul>

                <div class="button-row">
                  <button
                    v-if="!hasTimerMixPlaybackAuth || !spotifyPlayer.isReady.value"
                    type="button"
                    :disabled="spotifyPlayer.isConnecting.value"
                    @click="connectSpotifyPlayer"
                  >
                    {{ spotifyPlayer.isConnecting.value ? t('timerMix.connecting') : t('timerMix.connectSpotify') }}
                  </button>

                  <button
                    v-if="!timerMixPlayback.isPlaying.value"
                    type="button"
                    :disabled="isTimerMixStartDisabled"
                    @click="startTimerMix"
                  >
                    {{ t('timerMix.start') }}
                  </button>

                  <button
                    v-else
                    type="button"
                    @click="timerMixPlayback.stopMix"
                  >
                    {{ t('timerMix.stop') }}
                  </button>
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
              {{ t('seo.description', { appName }) }}
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
