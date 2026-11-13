#!/bin/sh
set -eu
: "${DEPLOY_DIR:?}" "${ADMIN_IMAGE:?}"
mkdir -p "$DEPLOY_DIR"
previous=''
if [ -f "$DEPLOY_DIR/.deployed-image" ]; then
  previous=$(cat "$DEPLOY_DIR/.deployed-image")
fi
cp deploy/compose.yml "$DEPLOY_DIR/compose.yml"
docker compose -p snapvocab-admin -f "$DEPLOY_DIR/compose.yml" config --quiet
if ! docker compose -p snapvocab-admin -f "$DEPLOY_DIR/compose.yml" up -d --no-build --wait --wait-timeout 90; then
  docker logs --tail 50 snapvocab-admin || true
  if [ -n "$previous" ]; then
    export ADMIN_IMAGE="$previous"
    docker compose -p snapvocab-admin -f "$DEPLOY_DIR/compose.yml" up -d --no-build --wait --wait-timeout 90
    echo 'Restored the previous production image.'
  fi
  exit 1
fi
if [ -n "$previous" ]; then
  printf '%s\n' "$previous" > "$DEPLOY_DIR/.previous-image"
fi
printf '%s\n' "$ADMIN_IMAGE" > "$DEPLOY_DIR/.deployed-image"
git rev-parse HEAD > "$DEPLOY_DIR/.deployed-commit"
