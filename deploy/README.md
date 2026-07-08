# Production Docker Compose

Root `docker-compose.yml` is the main deploy entrypoint for this fork.

It follows the classic Padloc nginx example:

-   `server` with LevelDB
-   `pwa` build into a shared volume
-   `nginx` serves `/` and proxies `/server` on one HTTP port

## Local

```sh
cp .env.example .env
# edit public URLs in .env if needed
docker compose up -d --build
```

Open http://localhost

## Dokploy (GitHub + Docker Compose)

1. Create a Compose application from this GitHub repo.
2. Compose file path: `docker-compose.yml`
3. Set environment variables in Dokploy UI:
    - `PL_PWA_URL=https://your-domain`
    - `PL_SERVER_URL=https://your-domain/server`
    - `PL_SERVER_CLIENT_URL=https://your-domain`
4. Deploy.

If Dokploy puts Traefik/Caddy in front of the app, point the domain to the
`nginx` service port `80`.

## Paths

-   `/` - web app
-   `/server` - API

## Data

Named volumes:

-   `data` - LevelDB
-   `attachments` - file attachments
-   `pwa` - built frontend assets
