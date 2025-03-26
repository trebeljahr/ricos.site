#!/bin/bash

# This script updates R3F pages to use the new loader system

# Function to convert a file
convert_file() {
  local file="$1"
  echo "Converting $file..."
  
  # Replace imports
  sed -i '' 's/import { CanvasWithKeyboardInput } from "src\/canvas\/Controllers\/KeyboardControls";/import { KeyboardControlledScene } from "src\/canvas\/Helpers\/SceneLoader";/' "$file"
  sed -i '' 's/import { CanvasWithKeyboardInput } from "@r3f\/Controllers\/KeyboardControls";/import { KeyboardControlledScene } from "src\/canvas\/Helpers\/SceneLoader";/' "$file"
  
  # Replace component usage - for variations with different props
  sed -i '' 's/<CanvasWithKeyboardInput>/<KeyboardControlledScene>/' "$file"
  sed -i '' 's/<CanvasWithKeyboardInput /<KeyboardControlledScene /' "$file"
  sed -i '' 's/<\/CanvasWithKeyboardInput>/<\/KeyboardControlledScene>/' "$file"
  
  echo "Converted $file"
}

# Find all R3F pages using CanvasWithKeyboardInput
files=$(grep -l "CanvasWithKeyboardInput" src/pages/r3f/**/*.tsx)

# Convert each file
for file in $files; do
  convert_file "$file"
done

echo "All R3F pages have been updated to use the new loader system!" 