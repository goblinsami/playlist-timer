# Spotify flow

Playlist preview and playlist export use separate Spotify authorization flows.

- Preview with the Spotify Search source uses Spotify Client Credentials because
  it only needs public catalog data.
- Preview requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` on the
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
- Login is requested when the user exports a preview or selects a personal
  Spotify source.
- OAuth requests `playlist-modify-private`, `playlist-modify-public`,
  `playlist-read-private`, `playlist-read-collaborative`, and
  `user-library-read`.
- The callback stores the Spotify access token in a short-lived httpOnly cookie
  for local MVP export.
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
- After adding the personal source scopes, revoke app access or clear local
  cookies and re-authorize the app.

## Local OAuth setup

For local Spotify OAuth testing, keep the app URL and redirect URI consistent.

- In the Spotify Dashboard, set the Redirect URI exactly to:
  `http://127.0.0.1:3000/api/spotify/callback`
- Set `SPOTIFY_REDIRECT_URI` in `.env` to the same value.
- Start the dev server with:
  `npm run dev`
- Open the app using:
  `http://127.0.0.1:3000`
- Do not mix `localhost` and `127.0.0.1` during OAuth testing.
- If playlist export returns `403 Forbidden` while adding playlist items, clear cookies
  for `127.0.0.1:3000`, log in again, and verify
  `/api/debug/spotify-session` reports both playlist modify scopes as `true`.

No playlist creation is used for preview generation.
