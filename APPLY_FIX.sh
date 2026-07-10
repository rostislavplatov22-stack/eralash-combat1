#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
PROJECT="${1:-..}"
node ./apply-ghlum-full-motion-30.mjs "$PROJECT"
