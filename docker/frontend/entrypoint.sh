#!/bin/sh
set -eu

export PORT="${PORT:-8080}"

envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Storybook is only reachable in the dev environment; fail closed otherwise.
mkdir -p /etc/nginx/snippets
if [ "${ENV:-}" = "dev" ]; then
  cat > /etc/nginx/snippets/storybook.conf <<'EOF'
location = /storybook {
    return 301 /storybook/;
}

location ^~ /storybook/ {
    add_header Cache-Control "no-store, must-revalidate" always;
    try_files $uri $uri/ /storybook/index.html;
}
EOF
else
  cat > /etc/nginx/snippets/storybook.conf <<'EOF'
location ^~ /storybook {
    return 404;
}
EOF
fi

exec nginx -g 'daemon off;'
