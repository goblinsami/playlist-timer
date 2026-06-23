# Planned API contracts

No API routes are implemented in the initial skeleton.

## `POST /api/preview`

Accepts an artist, target duration in minutes, and tolerance. Returns the best
playlist candidate with track details and its total duration.

## `GET /api/spotify/login`

Starts Spotify OAuth for playlist export and redirects the user to Spotify.

## `GET /api/spotify/callback`

Handles Spotify's OAuth callback, validates the authorization response, and
returns the user to the export flow.

## `POST /api/spotify/export`

Accepts an approved preview and creates the playlist in the authorized user's
Spotify account.
