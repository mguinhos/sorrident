#!/usr/bin/env bash
# Sobe a interface web (Next.js + Ant Design).
set -e
cd "$(dirname "$0")/frontend"
[ -d node_modules ] || npm install
# Silencia o aviso de deprecação emitido internamente pelo http-proxy do Next.js
# (util._extend), inofensivo e fora do nosso controle.
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--no-deprecation"
exec npm run dev
