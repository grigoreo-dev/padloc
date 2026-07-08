# Production Docker Compose

Root `docker-compose.yml` is the main deploy entrypoint for this fork.

It follows the classic Padloc nginx example, extended with the admin portal:

-   `server` with LevelDB
-   `pwa` build into a shared volume
-   `admin` build into a shared volume
-   `nginx` serves `/` (PWA), `/admin` (Admin), and proxies `/server` on one HTTP port

No host ports are published. Traefik/Dokploy (or another reverse proxy) should
route traffic to the `nginx` service on container port `80`.

## Local (optional host publish)

If you want to open the stack directly on a machine without Dokploy:

```sh
cp .env.example .env
# edit public URLs in .env if needed
docker compose up -d --build
```

Then temporarily publish nginx yourself, for example:

```sh
docker compose run --rm --service-ports nginx
```

or add a local override with `ports: ["80:80"]`.

## Dokploy (GitHub + Docker Compose)

1. Create a Compose application from this GitHub repo.
2. Branch: `release/v4.4.0-dokploy` (or `main` after merge).
3. Compose file path: `docker-compose.yml`
4. Set environment variables in Dokploy UI:
    - `PL_PWA_URL=https://your-domain`
    - `PL_SERVER_URL=https://your-domain/server`
    - `PL_SERVER_CLIENT_URL=https://your-domain`
    - `PL_ADMIN_URL=https://your-domain/admin`
    - `PL_ADMIN_URL_PATH=/admin/`
    - `PL_SERVER_ADMINS=you@example.com` (comma-separated emails allowed as super-admins)
5. Point the domain to service `nginx`, port `80`.
6. Deploy.

### Admin portal access

The UI at `/admin` is public, but API calls require a **super-admin** account:

1. Register/login once on the normal PWA (`/`) so the account exists.
2. Set `PL_SERVER_ADMINS` to that account's email (exact match).
3. Restart the `server` service.
4. Open `/admin` and log in again there (admin login creates an `asAdmin` session).

If you see "You don't have the necessary permissions to use this feature!", the
email is missing from `PL_SERVER_ADMINS` or you are still on a non-admin session.

After any public URL change, rebuild the `pwa` and `admin` services (URLs are
baked in at build time).

## Paths

-   `/` - web app (PWA)
-   `/admin` - admin portal (redirects to `/admin/`)
-   `/server` - API

## Security note

The admin UI is a public SPA path. Authorization is enforced by the server for
privileged accounts. Edge protection (Basic Auth, IP allowlist, SSO) for
`/admin` is optional and not configured in this stack.

## Data

Named volumes:

-   `data` - LevelDB
-   `attachments` - file attachments
-   `pwa` - built PWA assets
-   `admin` - built admin portal assets
