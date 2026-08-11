#!/usr/bin/env bash
# エックスサーバーへデプロイ
#   ./deploy.sh          … 実際に反映
#   ./deploy.sh --dry    … 何が変わるか確認するだけ（転送しない）
set -euo pipefail

REMOTE="xserver-wedding"                                   # ~/.ssh/config のホスト名
DEST="/home/xs7091kawa/arlys-japan.com/public_html/wedding/"
SRC="$(cd "$(dirname "$0")" && pwd)/"

DRY=""
[ "${1:-}" = "--dry" ] && DRY="--dry-run"

rsync -rlptvz --delete $DRY \
  -e "ssh -p 10022" \
  --exclude '.git/' \
  --exclude '.gitignore' \
  --exclude '.claude/' \
  --exclude 'README.md' \
  --exclude 'deploy.sh' \
  --exclude '.DS_Store' \
  "$SRC" "$REMOTE:$DEST"

if [ -n "$DRY" ]; then
  echo "--- ドライランです。実際には転送していません ---"
  exit 0
fi

# macOS の openrsync は --chmod 非対応。転送後にサーバー側で権限を揃える
# （ディレクトリが 700 のままだと Apache が読めず 403 になる）
ssh -p 10022 "$REMOTE" \
  "find '$DEST' -type d -exec chmod 755 {} + ; find '$DEST' -type f -exec chmod 644 {} +"

echo "--- 完了 ---"
