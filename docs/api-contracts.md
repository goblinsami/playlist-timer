# API contracts

## `POST /api/preview`

Accepts an artist, target duration in minutes, and tolerance. Returns the best
playlist candidate with track details and its total duration.

## `GET /api/preview/:id`

Returns a temporarily stored preview by id. Missing or expired previews return
`PREVIEW_NOT_FOUND`.

## `GET /api/spotify/login`

Requires `previewId`. Validates the preview, starts Spotify OAuth for playlist
export, and redirects the user to Spotify.

## `GET /api/spotify/callback`

Handles Spotify's OAuth callback, exchanges the code server-side, stores the
Spotify access token in an httpOnly cookie, and redirects back to the app with
the preview id.

## `POST /api/spotify/export`

Accepts `{ "previewId": "..." }`, reads the Spotify access token from the
httpOnly cookie, creates a playlist in the authorized user's Spotify account,
and adds preview tracks that have `spotifyUri` via Spotify's playlist items
endpoint: `POST /v1/playlists/{playlist_id}/items`. Do not use the deprecated
`POST /v1/playlists/{playlist_id}/tracks` endpoint for playlist writes.
