#!/usr/bin/env bash

set -euo pipefail

source "$(dirname $0)/util.sh"

if [[ ! -z "$DEBUG" ]]; then
    set -x
fi

if ! which ponyc; then
    echo 'ponyc not found! please install pony to continue (https://github.com/ponylang/ponyc)' >&2
    exit 1
fi

mkdir -p build
CC=gcc ponyc --pic -o "$BUILD_DIR" "$SRC_DIR"
mv "$BUILD_DIR/src" "$EXE_PATH"
