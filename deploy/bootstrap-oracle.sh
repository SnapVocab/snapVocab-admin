#!/bin/sh
# One-time host setup. Run as the SSH operator with passwordless sudo and Docker access.
set -eu
setup=/home/ubuntu/snapvocab-admin-setup
sudo install -d -m 755 -o 1000 -g 1000 /opt/snapvocab/admin
if [ ! -f /opt/snapvocab/admin/.env.production ]; then
  sudo install -m 600 -o 1000 -g 1000 "$setup/production.env.example" /opt/snapvocab/admin/.env.production
fi
if [ -e /etc/nginx/sites-enabled/snapvocab-admin ] || [ -e /etc/nginx/sites-available/snapvocab-admin ]; then
  echo 'Admin vhost already exists; refusing to overwrite it.' >&2
  exit 1
fi
sudo install -m 644 "$setup/host.nginx.conf" /etc/nginx/sites-available/snapvocab-admin
sudo ln -s /etc/nginx/sites-available/snapvocab-admin /etc/nginx/sites-enabled/snapvocab-admin
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx --non-interactive --agree-tos --redirect -d admin.snapvocab.thanhthbm.online

# Read-only check: a build without a recorded result is still in progress.
sudo python3 - <<'PY'
from pathlib import Path
import xml.etree.ElementTree as ET
root = Path('/var/lib/docker/volumes/jenkins_jenkins_home/_data')
for path in root.glob('jobs/*/builds/[0-9]*/build.xml'):
    tree = ET.parse(path)
    if tree.find('result') is None:
        raise SystemExit(f'Jenkins build in progress: {path}; wait before restarting')
print('No running Jenkins builds found')
PY

umask 077
python3 - <<'PY'
import secrets
from pathlib import Path
path = Path('/home/ubuntu/snapvocab-admin-setup/webhook-secret')
if not path.exists():
    path.write_text(secrets.token_hex(32))
PY
docker exec jenkins mkdir -p /var/jenkins_home/cicd
docker cp "$setup/webhook-secret" jenkins:/var/jenkins_home/cicd/admin-webhook-secret
docker cp "$setup/jenkins-bootstrap.groovy" jenkins:/var/jenkins_home/init.groovy.d/92-snapvocab-admin.groovy
docker exec -u root jenkins chown jenkins:jenkins /var/jenkins_home/cicd/admin-webhook-secret /var/jenkins_home/init.groovy.d/92-snapvocab-admin.groovy
docker exec jenkins chmod 600 /var/jenkins_home/cicd/admin-webhook-secret
docker restart jenkins
