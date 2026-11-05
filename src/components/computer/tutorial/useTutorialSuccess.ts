import { useCallback, useEffect, useRef, useState } from "react";
import { gateStructure } from "src/lib/computer/blockFolding";
import type { Circuit } from "src/lib/computer/logic";
import { type Grade, gradePassed } from "src/lib/computer/tutorial/grade";

type Attempt = {
  session: object;
  circuit: Circuit;
  structure: string;
  edited: boolean;
  passing: boolean;
  celebrated: boolean;
  recorded?: string;
};

/** Watches shared-grader results; presentation changes and restored boards never count as construction. */
export function useTutorialSuccess({
  session,
  initial,
  circuit,
  liveGrade,
  enabled,
  solved = true,
  recordLivePass,
}: {
  session: object;
  initial: Circuit;
  circuit: Circuit;
  liveGrade?: Grade;
  enabled: boolean;
  /** False records a restored board that passes without being on record yet, with no celebration. */
  solved?: boolean;
  recordLivePass: (circuit: Circuit) => void;
}) {
  const attempt = useRef<Attempt | null>(null);
  const serial = useRef(0);
  const [celebration, setCelebration] = useState<{ session: object; id: number } | null>(null);

  const current = useCallback(() => {
    if (!attempt.current || attempt.current.session !== session)
      attempt.current = {
        session,
        circuit: initial,
        structure: gateStructure(initial),
        edited: false,
        passing: false,
        celebrated: false,
      };
    return attempt.current;
  }, [session, initial]);

  const celebrate = useCallback((state: Attempt) => {
    if (!state.edited || state.celebrated) return;
    state.celebrated = true;
    setCelebration({ session: state.session, id: ++serial.current });
  }, []);

  const noteChange = useCallback(
    (next: Circuit) => {
      const state = current();
      const structure = gateStructure(next);
      if (structure !== state.structure) state.edited = true;
      state.circuit = next;
      state.structure = structure;
    },
    [current],
  );

  useEffect(() => {
    if (!enabled || !liveGrade) return;
    const state = current();
    // The old level's React state can survive until its reset effect runs.
    if (state.structure !== gateStructure(circuit)) return;
    const passing = gradePassed(liveGrade);
    if (passing && state.edited && !state.passing) celebrate(state);
    if (passing && (state.edited || !solved) && state.recorded !== state.structure) {
      state.recorded = state.structure;
      recordLivePass(circuit);
    }
    state.passing = passing;
  }, [enabled, liveGrade, circuit, solved, current, celebrate, recordLivePass]);

  const resetSuccess = useCallback(
    (next: Circuit) => {
      attempt.current = {
        session,
        circuit: next,
        structure: gateStructure(next),
        edited: false,
        passing: false,
        celebrated: false,
      };
      setCelebration(null);
    },
    [session],
  );

  return {
    celebration: celebration?.session === session ? celebration.id : 0,
    noteChange,
    resetSuccess,
  };
}
