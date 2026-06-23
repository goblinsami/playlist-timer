# Architecture

Playlist Timer is planned as a Nuxt 3 full-stack application written in
TypeScript. Vue pages and components render the interface, while future Nuxt
server routes will expose the application API.

## Folder responsibilities

- `app/pages`: route-level user interfaces.
- `app/components`: reusable Vue components.
- `server/api`: Nuxt API route handlers.
- `server/services`: Spotify and playlist-solving orchestration.
- `server/types`: shared server-side TypeScript types.
- `docs`: product and engineering decisions.

## Planned services

- A Spotify catalog service for track discovery and metadata.
- A playlist solver that selects tracks for a target duration.
- An export service that creates a playlist for an authorized Spotify user.

Spotify access and solver logic will remain separate so each can be tested and
changed independently.
