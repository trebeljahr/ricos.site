import { useSyncExternalStore } from "react";
import { EMPTY_PROGRESS, progressStore } from "../lib/computer/tutorial/progress";

const serverProgress = () => EMPTY_PROGRESS;

/** The reader's tutorial progress, shared by every builder on the page. */
export const useTutorialProgress = () =>
  useSyncExternalStore(progressStore.subscribe, progressStore.get, serverProgress);
