#!/bin/bash
# Exists only to pin node v22 from nvm. Everything else comes from .claude/launch.json.
export PATH="/Users/rico/.nvm/versions/node/v22.20.0/bin:$PATH"
export NODE="/Users/rico/.nvm/versions/node/v22.20.0/bin/node"
# Images come from the worktree, like `pnpm dev` does it.
export NEXT_PUBLIC_IMAGE_BACKEND=local

# Pass through whatever arguments we are given; only supply a port if none was.
args=("$@")
has_port=false
for arg in "${args[@]}"; do
  case "$arg" in
    -p|--port|-p=*|--port=*) has_port=true ;;
  esac
done
if [ "$has_port" = false ]; then
  args+=(-p "${PORT:-3713}")
fi

# No --webpack: webpack refuses the node: imports in src/lib/mapToImageProps.ts.
exec "$NODE" ./node_modules/next/dist/bin/next dev "${args[@]}"
