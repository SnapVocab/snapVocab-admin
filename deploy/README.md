# Production deployment

- Site: https://admin.snapvocab.thanhthbm.online
- Branch: `prod`; Jenkins job: `snapvocab-admin-prod`.
- Agent label: `spring` on Oracle; builds run in Docker, no host Node installation needed.
- Host directory: `/opt/snapvocab/admin` (inside the existing agent mount `/opt/snapvocab`).
- Container: `snapvocab-admin`, bound to `127.0.0.1:8086` only.
- Host Nginx proxies the admin domain to this port. Certbot manages HTTPS and renewal.

Jenkins loads `Jenkinsfile` from `prod`. A GitHub push webhook calls `https://jenkins.thanhthbm.online/github-webhook/`; Jenkins checks the tracked `prod` branch before scheduling a build. Pushes to other branches do not deploy. Each build runs tests sequentially, lint and the production build in Docker, then deploys an image tagged with the build number and commit. Failed container health checks restore the previous image when one exists. Images remain local to Oracle; no registry credentials are required for publication.

Copy `production.env.example` to `/opt/snapvocab/admin/.env.production` on the host. These are public Vite build settings, passed with a BuildKit secret mount; local `.env` and `.env.local` files are excluded from the Docker context. Editing the production env requires a new Jenkins build. All fixtures are disabled. Screens marked MOCK/LEGACY by the application remain hidden in production.

```sh
# Inspect production
docker ps --filter name=snapvocab-admin
docker logs --tail 50 snapvocab-admin
curl --fail https://admin.snapvocab.thanhthbm.online/healthz

# Rebuild after changing production environment settings
# Use Build Now on snapvocab-admin-prod in Jenkins.

# Roll back to the previous image (run on Oracle)
cd /opt/snapvocab/admin
export ADMIN_IMAGE="$(cat .previous-image)"
docker compose -p snapvocab-admin -f compose.yml up -d --no-build --wait
printf '%s\n' "$ADMIN_IMAGE" > .deployed-image
```

The Nginx file `host.nginx.conf` is the initial HTTP configuration. Install it once, validate with `nginx -t`, reload Nginx, then run `certbot --nginx -d admin.snapvocab.thanhthbm.online --redirect`. Do not overwrite the live vhost with this HTTP template after Certbot has installed TLS. Check renewal with `systemctl status certbot.timer` and `certbot renew --cert-name admin.snapvocab.thanhthbm.online --dry-run`.
