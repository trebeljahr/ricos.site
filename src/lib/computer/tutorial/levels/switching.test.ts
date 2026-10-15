import { describe } from "vitest";
import { checkLevels } from "../levelSuite";
import { GATE_LEVELS } from "./gates";
import { SWITCHING_LEVELS } from "./switching";

describe("switching levels", () =>
  checkLevels(SWITCHING_LEVELS, [...GATE_LEVELS, ...SWITCHING_LEVELS]));
