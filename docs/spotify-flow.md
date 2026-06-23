# Spotify flow

Playlist preview and playlist export use separate Spotify authorization flows.

- Preview uses Spotify Client Credentials because it only needs public catalog
  data.
- Preview requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` on the
  server.
- Preview searches the requested artist, reads public album/single tracks, and
  passes those tracks into the independent duration solver.
- Export uses Spotify OAuth because it writes a playlist to a user's account.
- Login is requested only when the user chooses to export a preview.

No user OAuth, playlist scopes, user tokens, or playlist creation are used for
preview generation.
