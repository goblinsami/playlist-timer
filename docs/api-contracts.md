# API contracts

## `POST /api/preview`

Accepts a source, target duration in minutes, and tolerance. Returns the best
playlist candidate with track details, its total duration, and source metadata.

Spotify Search source:

```json
{
  "sourceType": "spotify-search",
  "artist": "Shakira",
  "durationMinutes": 10,
  "toleranceSeconds": 30,
  "includeCues": true
}
```

Liked Songs source:

```json
{
  "sourceType": "liked-songs",
  "artistFilter": "Shakira",
  "selectionMode": "random",
  "durationMinutes": 10,
  "toleranceSeconds": 30,
  "includeCues": true
}
```

User Playlist source:

```json
{
  "sourceType": "user-playlist",
  "playlistId": "spotify-playlist-id",
  "artistFilter": "Shakira",
  "selectionMode": "random",
  "durationMinutes": 10,
  "toleranceSeconds": 30,
  "includeCues": true
}
```

For personal sources, `selectionMode` can be `random` or `recent`. It defaults
to `random`. Random mode samples bounded pages across the user's saved tracks or
selected playlist using Spotify pagination offsets.

Personal sources require the Spotify OAuth cookie. Liked Songs uses
`GET /v1/me/tracks`. My Playlists uses `GET /v1/me/playlists` and
`GET /v1/playlists/{playlist_id}/items`. Do not use deprecated playlist
`/tracks` endpoints.

## `GET /api/preview/:id`

Returns a temporarily stored preview by id. Missing or expired previews return
`PREVIEW_NOT_FOUND`.

## `GET /api/spotify/login`

Accepts either `previewId` for playlist export or `sourceType` for personal
sources. Validates an export preview when `previewId` is present, starts Spotify
OAuth, and redirects the user to Spotify.

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

## `GET /api/spotify/playlists`

Requires the Spotify OAuth cookie and returns simplified current-user playlists:

```json
{
  "playlists": [
    {
      "id": "...",
      "name": "...",
      "ownerId": "...",
      "totalItems": 42,
      "imageUrl": "...",
      "isCollaborative": false,
      "isPublic": false
    }
  ]
}
```
