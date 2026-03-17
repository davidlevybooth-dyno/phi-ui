/**
 * Feature flags — flip a boolean here to enable/disable work-in-progress features.
 *
 * Flags are intentionally compile-time constants (not env vars) so that
 * changes appear in git history and dead branches can be tree-shaken in prod.
 */
export const FEATURES = {
  /**
   * Show the Agent experience across the app:
   * - "Agent" button on the landing page hero
   * - Agent and Chats pages in the dashboard sidebar
   */
  dashboardAgent: false,
} as const;
