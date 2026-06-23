# Playlist solver

The solver receives a set of candidate tracks, a target duration, and an
allowed tolerance. It returns the best available combination of tracks,
including the total duration and difference from the target.

The solver is independent from Spotify. It works with typed track-duration
data and does not fetch tracks, manage credentials, or export playlists.
