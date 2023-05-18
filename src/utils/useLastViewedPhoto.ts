import { createGlobalState } from "react-hooks-global-state";

const initialState = { photoToScrollTo: 0 };
const { useGlobalState } = createGlobalState(initialState);

export const useLastViewedPhoto = () => {
  return useGlobalState("photoToScrollTo");
};
