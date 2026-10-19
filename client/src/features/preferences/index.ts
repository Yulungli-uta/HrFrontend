export { UserPreferencesProvider } from "./context/UserPreferencesProvider";
export type { UserPreferencesContextValue } from "./context/UserPreferencesContext";
export { useUserPreferences } from "./hooks/useUserPreferences";
export { getHomeOptions, resolveHomePath, canAccessRoute, shouldReapplyHomeRedirect, DEFAULT_HOME_PATH } from "./services/homePath";
export type { HomeOption, HomeRouteInfo } from "./services/homePath";
export {
  readHomeFlag,
  writeHomeFlag,
  readHomeRedirect,
  writeHomeRedirect,
  isSafeReturnTo,
  writeReturnTo,
  peekReturnTo,
  clearReturnTo,
  markSessionAuthenticated,
  wasSessionAuthenticated,
} from "./services/preferencesStorage";
