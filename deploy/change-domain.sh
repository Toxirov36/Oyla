#!/usr/bin/env bash
set -euo pipefail
umask 077
domain=${1:?Domain required}
[[ "$domain" =~ ^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$ ]] || { echo 'Invalid domain'; exit 1; }
base="$HOME/oyla"
test -s "$base/deployed-sha"
exec 9>"$base/.deploy.lock"
flock -w 1200 9
addresses=$(getent ahostsv4 "$domain" | awk '{print $1}' | sort -u)
[[ "$addresses" == 34.176.204.70 ]] || { echo 'All A records must point to 34.176.204.70 before HTTPS can be issued.'; exit 1; }
python3 - "$domain" <<'PY'
import socket, sys
try:
    results=socket.getaddrinfo(sys.argv[1],443,socket.AF_INET6)
except socket.gaierror:
    results=[]
if results:
    raise SystemExit('Remove stale AAAA records; this VM is configured for IPv4.')
PY
sudo /opt/certbot/bin/certbot certonly --non-interactive --agree-tos --webroot -w /var/www/letsencrypt --cert-name "$domain" -d "$domain"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$base/backups/config"
sudo cp /etc/nginx/sites-available/oyla "$base/backups/config/nginx-$stamp.conf"
sudo chown "$(id -u):$(id -g)" "$base/backups/config/nginx-$stamp.conf"
export OYLA_TARGET_DOMAIN="$domain"
port=$(node -e 'const fs=require("node:fs"),dotenv=require(process.env.HOME+"/oyla/ops/node_modules/dotenv");console.log(dotenv.parse(fs.readFileSync(process.env.HOME+"/oyla/.env")).WEB_PORT||"8080");')
[[ "$port" =~ ^[0-9]+$ ]] || exit 1
sed -e "s/DOMAIN/$domain/g" -e "s#CERT_DIRECTORY#/etc/letsencrypt/live/$domain#g" -e "s/127.0.0.1:8080/127.0.0.1:$port/g" "$base/current/deploy/nginx-site.conf.template" > "$base/incoming/nginx-domain.conf"
sudo install -m 644 "$base/incoming/nginx-domain.conf" /etc/nginx/sites-available/oyla
if ! sudo nginx -t; then sudo cp "$base/backups/config/nginx-$stamp.conf" /etc/nginx/sites-available/oyla; exit 1; fi
node <<'NODE'
const fs=require('node:fs');
const file=process.env.HOME+'/oyla/.env';
const updated=fs.readFileSync(file,'utf8').split('\n').map(line=>line.startsWith('WEB_ORIGIN=')?'WEB_ORIGIN='+JSON.stringify('https://'+process.env.OYLA_TARGET_DOMAIN):line).join('\n');
fs.writeFileSync(file,updated,{mode:0o600});
NODE
export IMAGE_PREFIX=ghcr.io/toxirov36/oyla
export DEPLOY_SHA
DEPLOY_SHA=$(cat "$base/deployed-sha")
docker compose -p oyla --env-file "$base/.env" -f "$base/current/deploy/compose.production.yaml" up -d --no-build --wait --wait-timeout 180 api < /dev/null
sudo systemctl reload nginx
healthy=false
for attempt in {1..20}; do
  if curl --fail --silent --resolve "$domain:443:127.0.0.1" "https://$domain/api/v1/health"; then healthy=true; break; fi
  sleep 1
done
[[ "$healthy" == true ]] || { echo 'HTTPS health check did not complete'; exit 1; }
echo
echo "Active HTTPS origin: https://$domain"
