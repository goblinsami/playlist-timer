<script setup lang="ts">
type Accuracy = 'exact' | 'balanced' | 'flexible'

const artist = ref('')
const durationMinutes = ref<number | null>(null)
const accuracy = ref<Accuracy>('balanced')
</script>

<template>
  <main class="page-shell">
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

      <form class="playlist-form" @submit.prevent>
        <div class="field">
          <label for="artist">Artist</label>
          <input
            id="artist"
            v-model="artist"
            type="text"
            name="artist"
            placeholder="e.g. Daft Punk"
            autocomplete="off"
          >
        </div>

        <div class="field">
          <label for="duration">Duration in minutes</label>
          <input
            id="duration"
            v-model="durationMinutes"
            type="number"
            name="duration"
            min="1"
            step="1"
            placeholder="45"
            inputmode="numeric"
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

        <button type="submit">
          Generate Preview
        </button>
      </form>

      <section class="preview" aria-labelledby="preview-title" aria-disabled="true">
        <div class="preview-icon" aria-hidden="true">
          ♪
        </div>
        <div>
          <h2 id="preview-title">
            Playlist preview
          </h2>
          <p>Your generated track list will appear here.</p>
        </div>
      </section>
    </section>
  </main>
</template>
