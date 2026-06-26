# Mashup Timer product

Mashup Timer turns Spotify into a music timer. It helps people make a short music
session for a shower, workout, break, cooking task, focus session, or any other
fixed-length activity.

## Primary mode: Live Timer Mix

Live Timer Mix is the primary experience. Choose a duration, how many songs to
play, and a source: Spotify Search, Liked Songs, or one of your playlists.
Mashup Timer plays a live mini-mix in the browser and stops when the timer ends.

This mode uses the Spotify Web Playback SDK and requires Spotify Premium,
because browser playback is available only to Premium accounts. It is
experimental and live-only: it does not create an exportable audio file or a
permanent mashup.

## Secondary mode: Playlist Timer

Playlist Timer is the stable fallback. It selects full songs that add up as
closely as possible to a target duration, then lets the user export the result
as a Spotify playlist. Use it when the result needs to be saved or shared in
Spotify.

## Scope

Mashup Timer does not create accounts, saved playlist history, payments, social
features, or integrations with music services other than Spotify.
