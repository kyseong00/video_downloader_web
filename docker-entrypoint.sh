#!/bin/sh
set -e

# PUID/PGID 지원: 환경변수로 유저/그룹 ID 변경 (기본값 1001)
PUID=${PUID:-1001}
PGID=${PGID:-1001}

# 현재 nextjs 유저/그룹 ID
CURRENT_UID=$(id -u nextjs)
CURRENT_GID=$(getent group nodejs | cut -d: -f3)

# ID가 다르면 변경
if [ "$PUID" != "$CURRENT_UID" ] || [ "$PGID" != "$CURRENT_GID" ]; then
  echo "[entrypoint] Updating nextjs uid=$CURRENT_UID -> $PUID, nodejs gid=$CURRENT_GID -> $PGID"
  groupmod -o -g "$PGID" nodejs
  usermod -o -u "$PUID" nextjs
fi

# 마운트된 디렉토리 소유권 보정
chown -R "$PUID:$PGID" /app/data /app/public/downloads 2>/dev/null || true

# nextjs 유저로 권한 낮춰서 앱 실행
exec gosu nextjs:nodejs "$@"
