#!/bin/bash
export PATH="/Users/rico/.nvm/versions/node/v22.20.0/bin:$PATH"
export NODE="/Users/rico/.nvm/versions/node/v22.20.0/bin/node"
# Images come from the worktree, like `pnpm dev` does it.
export NEXT_PUBLIC_IMAGE_BACKEND=local
exec /Users/rico/.nvm/versions/node/v22.20.0/bin/node ./node_modules/next/dist/bin/next dev -p "${PORT:-3456}"
