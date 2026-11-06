#!/bin/sh
set -eu

: "${BUILD_LOD:?Set BUILD_LOD to the build-lod binary from the Spark repository (rust/build-lod)}"

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cp "$root/source-assets/background.splat" "$work/background.splat"
(cd "$work" && "$BUILD_LOD" --quality --rad background.splat)
mv "$work/background-lod.rad" "$root/src/assets/background-lod.rad"
