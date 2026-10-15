import { describe } from "vitest";
import { checkLevels } from "../levelSuite";
import { ARITHMETIC_LEVELS } from "./arithmetic";
import { GATE_LEVELS } from "./gates";
import { MEMORY_LEVELS } from "./memory";
import { SWITCHING_LEVELS } from "./switching";

describe("memory levels", () =>
  checkLevels(MEMORY_LEVELS, [
    ...GATE_LEVELS,
    ...ARITHMETIC_LEVELS,
    ...SWITCHING_LEVELS,
    ...MEMORY_LEVELS,
  ]));
