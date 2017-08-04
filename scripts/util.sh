PROJECT_ROOT="$(realpath $(dirname $0)/..)"

BUILD_DIR="$PROJECT_ROOT/build"
SRC_DIR="$PROJECT_ROOT/src"

: ${EXE_NAME:="$(basename "$PROJECT_ROOT" | tr '[:blank:]' _)"}
EXE_PATH="$BUILD_DIR/$EXE_NAME"

: ${DEBUG:=}
