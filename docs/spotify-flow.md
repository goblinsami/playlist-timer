# Spotify flow

Playlist preview and playlist export use separate Spotify authorization flows.

- Preview with the Spotify Search source uses Spotify Client Credentials because
  it only needs public catalog data.
- Preview requires `NUXT_SPOTIFY_CLIENT_ID` and `NUXT_SPOTIFY_CLIENT_SECRET` on the
  server.
- Preview searches the requested artist and public track catalog, then passes
  those tracks into the independent duration solver.
- Personal preview sources use Spotify OAuth:
  - Liked Songs reads saved tracks with `GET /v1/me/tracks` and requires
    `user-library-read`.
  - My Playlists lists playlists with `GET /v1/me/playlists` and reads selected
    playlist items with `GET /v1/playlists/{playlist_id}/items`.
- Personal sources support `random` and `recent` selection modes. Random is the
  default and samples bounded pages with Spotify pagination offsets so previews
  are not always based on only the most recent saved songs or first playlist
  items.
- Export uses Spotify OAuth because it writes a playlist to a user's account.
- Timer Mix uses Spotify OAuth because the Web Playback SDK requires a Spotify
  Connect device with a user token for a Spotify Premium account.
- Login is requested when the user exports a preview or selects a personal
  Spotify source, and when Timer Mix needs a browser playback device.
- Before leaving the app for Spotify OAuth, the current form state is stored in
  browser session storage. When the user returns from OAuth/export, the form is
  restored so the selected source, artist/filter, duration, playlist, and mode
  remain visible.
- Clicking the app name navigates back to `/`, clears URL parameters, and resets
  the local form state.
- OAuth requests `playlist-modify-private`, `playlist-modify-public`,
  `playlist-read-private`, `playlist-read-collaborative`, and
  `user-library-read`, `streaming`, `user-read-playback-state`, and
  `user-modify-playback-state`.
- The callback stores the Spotify access token in a short-lived httpOnly cookie
  for local MVP export.
- `GET /api/spotify/token` returns only the current user access token for the
  Web Playback SDK. It never exposes the Spotify client secret.
- Export loads the stored preview, creates a playlist with `POST /me/playlists`,
  and adds only real Spotify track URIs with
  `POST /v1/playlists/{playlist_id}/items`.
- Do not use deprecated playlist `/tracks` endpoints for reading or writing
  playlist items.
- If Spotify creates a playlist but refuses adding playlist items, the server attempts
  to remove/unfollow the newly created playlist with
  `DELETE /v1/playlists/{playlist_id}/followers` before returning
  `SPOTIFY_ADD_TRACKS_FORBIDDEN`.
- If OAuth scopes change, clear local cookies or re-authorize the app so Spotify
  returns a fresh token with the new permissions.
- After adding personal source or Timer Mix playback scopes, revoke app access
  or clear local cookies and re-authorize the app.

## Timer Mix playback

Timer Mix is an experimental live mode, not an exportable playlist.

- Preparation uses `POST /api/timer-mix/prepare` to collect tracks from Spotify
  Search, Liked Songs, or My Playlists and divide the target duration into equal
  blocks.
- Browser playback uses the Spotify Web Playback SDK loaded from
  `https://sdk.scdn.co/spotify-player.js`.
- Playback starts the first track with
  `PUT /v1/me/player/play?device_id=...`, queues the next item early with
  `POST /v1/me/player/queue?uri=...&device_id=...`, advances during
  transitions with `POST /v1/me/player/next?device_id=...`, sets volume with
  `PUT /v1/me/player/volume`, and pauses at the end with
  `PUT /v1/me/player/pause`.
- If queueing or skip-to-next fails, Timer Mix falls back to the direct play
  command for the expected next track using
  `PUT /v1/me/player/play?device_id=...`.
- Fade is simulated by short volume steps. Spotify does not provide real audio
  preloading, local buffering, or two simultaneous Web Playback SDK decks, so
  Timer Mix does not implement overlapping crossfade.

## Local OAuth setup

For local Spotify OAuth testing, keep the app URL and redirect URI consistent.

- In the Spotify Dashboard, set the Redirect URI exactly to:
  `http://127.0.0.1:3000/api/spotify/callback`
- Set `NUXT_SPOTIFY_REDIRECT_URI` in `.env` and Netlify to the same value.
- Set Spotify env vars in Netlify with Nuxt runtime names:
  `NUXT_SPOTIFY_CLIENT_ID`, `NUXT_SPOTIFY_CLIENT_SECRET`,
  `NUXT_SPOTIFY_REDIRECT_URI`, and
  `NUXT_SPOTIFY_EXPORT_PLAYLIST_PUBLIC`.
- Start the dev server with:
  `npm run dev`
- Open the app using:
  `http://127.0.0.1:3000`
- Do not mix `localhost` and `127.0.0.1` during OAuth testing.
- If playlist export returns `403 Forbidden` while adding playlist items, clear cookies
  for `127.0.0.1:3000`, log in again, and verify the session has both playlist
  modify scopes.

No playlist creation is used for preview generation.
