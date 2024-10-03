import { SATWithResponse } from "./SATWithResponse";
import React from "react";

export const SATWithConcaveShapes = () => (
  <SATWithResponse
    drawProjections={false}
    changeColorOnCollision={true}
    withStar={true}
  />
);
