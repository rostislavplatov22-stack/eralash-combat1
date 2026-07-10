#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
node apply-combat-director-32.mjs "$(pwd)"
