#!/usr/bin/env zsh

set -euo pipefail

source "$(dirname $0)/util.sh"

function file_ts {
    date -r "$1" +%s
}

function should_rebuild {
    if [[ -e "$EXE_PATH" ]]; then
        local build_ts=$(file_ts "$EXE_PATH")
        local max_ts=0
        for f in "$SRC_DIR"/**/*; do
            if [[ -f "$f" ]]; then
                fts=$(file_ts "$f")
                if [[ $fts -gt $max_ts ]]; then
                    max_ts=$fts
                fi
            fi
        done
        if [[ $max_ts -le $build_ts ]]; then
            return 1
        fi
    fi
    return 0
}
if should_rebuild; then
    echo ---- REBUILDING ----------------------------------------------------------------
    "$PROJECT_ROOT/scripts/build.sh"
    echo --------------------------------------------------------------------------------
    echo
fi
exec "$EXE_PATH"
