# Spotify flow

Playlist preview and playlist export use separate Spotify authorization flows.

- Preview uses Spotify Client Credentials because it only needs public catalog
  data.
- Export uses Spotify OAuth because it writes a playlist to a user's account.
- Login is requested only when the user chooses to export a preview.

No Spotify integration or credentials are included in the initial skeleton.
