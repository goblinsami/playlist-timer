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

## `GET /api/spotify/token`

Requires the Spotify OAuth cookie and returns the current user access token for
the Spotify Web Playback SDK:

```json
{
  "accessToken": "..."
}
```

Missing tokens return `SPOTIFY_AUTH_REQUIRED`. The endpoint never exposes the
Spotify client secret.

## `POST /api/timer-mix/prepare`

Prepares an experimental live Timer Mix. This does not create or export a
Spotify playlist.

Spotify Search source:

```json
{
  "sourceType": "spotify-search",
  "artist": "Chayanne",
  "durationMinutes": 5,
  "songCount": 3,
  "fadeSeconds": 5,
  "selectionMode": "random"
}
```

Liked Songs source:

```json
{
  "sourceType": "liked-songs",
  "artistFilter": "Chayanne",
  "durationMinutes": 5,
  "songCount": 3,
  "fadeSeconds": 5,
  "selectionMode": "random"
}
```

User Playlist source:

```json
{
  "sourceType": "user-playlist",
  "playlistId": "spotify-playlist-id",
  "artistFilter": "Chayanne",
  "durationMinutes": 5,
  "songCount": 3,
  "fadeSeconds": 5,
  "selectionMode": "random"
}
```

Response:

```json
{
  "mixId": "...",
  "source": {
    "type": "liked-songs",
    "artistFilter": "Chayanne",
    "selectionMode": "random"
  },
  "totalDurationMs": 300000,
  "songCount": 3,
  "fadeDurationMs": 5000,
  "blockDurationMs": 100000,
  "tracks": [
    {
      "id": "...",
      "name": "...",
      "artist": "...",
      "artists": ["..."],
      "durationMs": 210000,
      "spotifyUri": "spotify:track:..."
    }
  ],
  "warnings": []
}
```

Validation limits are 1-30 minutes, 1-10 songs, and 0-15 fade seconds.
`selectionMode` can be `random` or `recent`. Liked Songs and My Playlists
require OAuth. Optional artist filters are case-insensitive and match any artist
name on the track.

Playback is handled in the browser through the Spotify Web Playback SDK. The
Timer Mix player queues the next Spotify URI as soon as the current track starts,
uses Spotify skip-to-next for transitions when possible, and keeps the existing
direct play command as fallback. It does not preload, cache, or overlap Spotify
audio.
