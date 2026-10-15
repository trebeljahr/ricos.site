import { describe } from "vitest";
import { checkLevels } from "../levelSuite";
import { GATE_LEVELS } from "./gates";

describe("logic gate levels", () => checkLevels(GATE_LEVELS, GATE_LEVELS));
