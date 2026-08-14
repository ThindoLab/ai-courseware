#!/bin/zsh
# 安装每小时同步：npm run ima:sync:hourly
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/scripts/ima-sync.plist.example"
DEST="$HOME/Library/LaunchAgents/local.ai-courseware.ima-sync.plist"
sed "s|REPLACE_WITH_REPO_ROOT|$ROOT|g" "$SRC" > "$DEST"
launchctl unload "$DEST" 2>/dev/null || true
launchctl load "$DEST"
echo "已安装每小时同步：$DEST"
echo "立刻跑一次：npm run ima:sync"
echo "卸载：launchctl unload $DEST && rm $DEST"
