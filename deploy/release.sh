#!/usr/bin/env bash
set -euo pipefail
umask 077
revision=${1:?Commit SHA required}
export IMAGE_PREFIX=${2:?Image prefix required}
registry_user=${3:?Registry user required}
[[ "$revision" =~ ^[a-f0-9]{40}$ && "$IMAGE_PREFIX" == ghcr.io/toxirov36/oyla ]] || exit 1
base="$HOME/oyla"
test -s "$base/.env"
mkdir -p "$base/releases" "$base/backups"
exec 9>"$base/.deploy.lock"
flock -w 1200 9
export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d)
trap 'rm -rf -- "$DOCKER_CONFIG"' EXIT
docker login ghcr.io -u "$registry_user" --password-stdin
source_dir="$base/releases/$revision"
mkdir -p "$source_dir"
entries=$(tar -tzf "$base/incoming/$revision.tar.gz")
filtered_entries=$(grep -Ev '(^|/)\.env\.example$' <<< "$entries" || true)
if grep -Eq '(^|/)\.env($|\.)|(^|/)\.\.(/|$)|^/' <<< "$filtered_entries"; then
  echo 'Archive contains an unsafe or protected file'; exit 1
fi
tar -xzf "$base/incoming/$revision.tar.gz" -C "$source_dir" --no-same-owner --same-permissions
if [[ ! -e "$source_dir/.env" && ! -L "$source_dir/.env" ]]; then
  ln -s "$base/.env" "$source_dir/.env"
fi
[[ "$(readlink -f "$source_dir/.env")" == "$base/.env" ]] || exit 1
cd "$source_dir"
export DEPLOY_SHA="$revision"
compose=(docker compose -p oyla --env-file "$base/.env" -f deploy/compose.production.yaml)
"${compose[@]}" config --quiet
available=$(df -Pk "$base" | awk 'NR==2 {print $4}')
(( available > 1048576 )) || { echo 'Less than 1 GiB disk space available'; exit 1; }
"${compose[@]}" pull api web < /dev/null
if docker inspect oyla-postgres-1 >/dev/null 2>&1; then
  dump="$base/backups/pre-$revision-$(date -u +%Y%m%dT%H%M%SZ).dump"
  "${compose[@]}" exec -T postgres pg_dump -U oyla -d oyla -Fc < /dev/null > "$dump"
  test -s "$dump"
fi
# First installation requires a separately verified database import/provisioning.
test -f "$base/.database-ready" || { echo 'Provision and verify the production database first'; exit 1; }
"${compose[@]}" up -d --no-build --wait --wait-timeout 180 < /dev/null
curl --fail --silent --max-time 10 http://127.0.0.1:3001/api/v1/health >/dev/null
docker exec oyla-web-1 wget -q --spider http://127.0.0.1/
for service in api web; do
  actual=$(docker inspect --format '{{.Config.Image}}' "oyla-$service-1")
  [[ "$actual" == "$IMAGE_PREFIX-$service:$revision" ]] || exit 1
done
if [[ -s "$base/deployed-sha" ]]; then cp "$base/deployed-sha" "$base/previous-sha"; fi
ln -sfn "$source_dir" "$base/current"
printf '%s\n' "$revision" > "$base/deployed-sha"
rm -f "$base/incoming/$revision.tar.gz" "$base/incoming/$revision.sh"
echo "Deployed $revision. Database backup and previous release retained."
