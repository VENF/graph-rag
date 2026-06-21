import { GraphStateType } from '../../graph/state.js';
import { getCodeHierarchy } from '../../tools/getCodeHierarchy.js';
import { getCodeRegimes } from '../../tools/getCodeRegimes.js';

export const traceback = async (state: GraphStateType) => {
  const code = state.currentCode?.code;
  if (!code) return { traceback: null };

  const hierarchy = await getCodeHierarchy(code);
  const { regimes, articles } = await getCodeRegimes(code);

  return {
    traceback: { hierarchy, regimes, articles },
  };
};
