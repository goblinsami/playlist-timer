<script setup lang="ts">
type Accuracy = 'exact' | 'balanced' | 'flexible'
type LocaleCode = 'en' | 'es' | 'ca'

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

const { t, locale, setLocale } = useI18n()
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

  if (spotifyError) {
    exportErrorMessage.value = getStatusMessage(spotifyError)
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
    exportErrorMessage.value = t('errors.missingPreview')
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
                <label for="artist">{{ t('form.artist.label') }}</label>
                <input
                  id="artist"
                  v-model="artist"
                  type="text"
                  name="artist"
                  :placeholder="t('form.artist.placeholder')"
                  autocomplete="on"
                  required
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

              <button type="submit" :disabled="isLoading">
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
