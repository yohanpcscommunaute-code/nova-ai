# NOVA AI — Development Notes

## Project Overview
Cloudflare Workers app (Wrangler) with a static HTML frontend and a Worker backend.
The frontend (`index.html`) is a vanilla-JS SPA with two tabs: an AI chat assistant and a site builder.
The backend (`src/index.js`) exposes `/api/health` and `/api/generate` (calls Cloudflare Workers AI).

## Sandbox Setup (docker-compose.base44.yml)

### Key decisions and quirks

1. **Source is copied to `/tmp/nova` at startup, not run from the bind mount.**
   Wrangler's file watcher + Docker bind mounts cause an infinite reload loop (inotify storms).
   A background `cp -u` loop syncs edits from the bind mount (`/app`) to the running copy (`/tmp/nova`) every 2 seconds.

2. **A separate `public/` directory is used for static assets** (via `wrangler.base44.jsonc`).
   The original `wrangler.jsonc` sets `assets.directory = "."` (the working directory).
   Wrangler creates `.wrangler/` internal files in the working directory at runtime; when the assets
   watcher sees them, it triggers constant reloads. Using `public/` (containing only `index.html`)
   isolates the watcher from wrangler's internal files.

3. **`wrangler.base44.jsonc` is a sandbox-specific config** that uses `public/` as the assets directory.
   It includes the AI binding so credentials can be wired in without a config change.
   The original `wrangler.jsonc` is untouched.

4. **The `.assetsignore` file (without trailing dot) was created** because the original `.assetsignore.`
   (with trailing dot) is not recognized by wrangler. It excludes `src/`, `wrangler.jsonc`,
   `node_modules/`, etc. from being served as static assets.

5. **`--local` flag is used when no Cloudflare credentials are present.** In local mode, the AI binding
   is "not supported" and the `/api/generate` endpoint returns 503 (the worker code handles this).
   When `CLOUDFLARE_API_TOKEN` is set, `--local` is dropped so the AI binding connects remotely.

### Credentials
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID (optional for boot, required for AI feature)
- `CLOUDFLARE_API_TOKEN` — Cloudflare API token with Workers AI permission (optional for boot, required for AI feature)
- Without these, the app boots and the frontend works; only AI generation returns 503.

## Useful Commands
```bash
# Start the app
docker compose -f docker-compose.base44.yml up -d

# Check logs
docker compose -f docker-compose.base44.yml logs -f

# Health check
curl http://localhost:3000/api/health

# Stop
docker compose -f docker-compose.base44.yml down
```
