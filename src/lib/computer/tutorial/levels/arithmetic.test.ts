import { describe } from "vitest";
import { checkLevels } from "../levelSuite";
import { ARITHMETIC_LEVELS } from "./arithmetic";
import { GATE_LEVELS } from "./gates";

describe("arithmetic levels", () =>
  checkLevels(ARITHMETIC_LEVELS, [...GATE_LEVELS, ...ARITHMETIC_LEVELS]));
