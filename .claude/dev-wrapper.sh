#!/bin/bash
export PATH="/Users/rico/.nvm/versions/node/v22.20.0/bin:$PATH"
export NODE="/Users/rico/.nvm/versions/node/v22.20.0/bin/node"
exec /Users/rico/.nvm/versions/node/v22.20.0/bin/node ./node_modules/next/dist/bin/next dev -p 3713 --webpack
