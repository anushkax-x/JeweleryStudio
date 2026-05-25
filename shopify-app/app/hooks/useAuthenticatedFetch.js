import { useCallback } from "react";

/**
 * App Bridge intercepts same-origin fetch() and adds the session ID token.
 * @see https://shopify.dev/docs/api/app-bridge-library/apis/resource-fetching
 */
export function useAuthenticatedFetch() {
  return useCallback((uri, options) => fetch(uri, options), []);
}
