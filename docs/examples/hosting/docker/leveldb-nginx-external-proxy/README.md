# LevelDB + NGINX

This is the classic Padloc Docker + NGINX example, adapted for this fork:

-   LevelDB storage
-   filesystem attachments
-   internal NGINX serves the PWA and proxies the API on one port
-   images are built from the local repository (Node 18 + pnpm Dockerfiles)

## Setup

1. Install Docker and Docker Compose.
2. From this directory:

```sh
docker compose up -d --build
```

The web app is available at http://localhost

-   `/` serves the PWA
-   `/server` proxies to the Padloc API

## Notes

-   Build context points to the repository root of this fork, not upstream
    GitHub.
-   Data is stored in Docker volumes `data` and `attachments`.
-   If you put another reverse proxy in front, point it at host port `80`.
