import { describe } from "vitest";
import { checkLevels } from "../levelSuite";
import { ALU_LEVELS } from "./alu";
import { ARITHMETIC_LEVELS } from "./arithmetic";
import { GATE_LEVELS } from "./gates";
import { SWITCHING_LEVELS } from "./switching";

describe("arithmetic logic unit levels", () =>
  checkLevels(ALU_LEVELS, [
    ...GATE_LEVELS,
    ...ARITHMETIC_LEVELS,
    ...SWITCHING_LEVELS,
    ...ALU_LEVELS,
  ]));
