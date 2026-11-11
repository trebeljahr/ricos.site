// Worker entry. The runtime accepts only handlers as exports from this
// module, so the routing and its testable pieces live in router.ts.
import data from "../generated/api-data.json";
import { type ApiData, type Env, handleRequest, withSecurityHeaders } from "./router";

export default {
  fetch: async (request: Request, env: Env) =>
    withSecurityHeaders(await handleRequest(request, env, data as ApiData)),
};
