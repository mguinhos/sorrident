#!/usr/bin/env bash
# Sobe a interface web (Next.js + Ant Design).
set -e
cd "$(dirname "$0")/frontend"
[ -d node_modules ] || npm install
exec npm run dev
