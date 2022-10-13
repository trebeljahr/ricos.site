// src/components/CodeBlock.js
import React from "react";
// import Highlight, { defaultProps } from "prism-react-renderer";
import { LiveProvider, LiveEditor, LiveError, LivePreview } from "react-live";
import { useEffect, useState } from "react";
import SimpleReactCanvasComponent from "simple-react-canvas-component";
import { initPolygons, instrument } from "../lib/math/drawHelpers";
import {
  checkCollision,
  drawAllProjections,
  drawBackground,
} from "../components/collision-detection/helpers";

export const CodeBlock = ({ children, live }: any) => {
  console.log("Rendering code block!");

  if (live) {
    console.log("Rendering live code block!");
    return (
      <div style={{ marginTop: "40px" }}>
        <LiveProvider
          code={children}
          scope={{
            useEffect,
            useState,
            SimpleReactCanvasComponent,
            initPolygons,
            instrument,
            checkCollision,
            drawAllProjections,
            drawBackground,
          }}
        >
          <LivePreview />
          <LiveEditor />
          <LiveError />
        </LiveProvider>
      </div>
    );
  }
  return children;
};
