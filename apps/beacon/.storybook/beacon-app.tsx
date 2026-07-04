/**
 * App-shell harness for feature-level stories.
 *
 * `beaconScreen(persona, opts)` is the one knob a story sets: it bundles the MSW handlers for a
 * Tower persona, the localStorage seeds (bearer token, app settings), a baseline Designer scene,
 * and the flag that makes `withBeaconApp` wrap the story in the real app providers
 * (router → settings → CMS-template-page → nav history → leave guard). Stories that don't call
 * it (all of `shared/ui`) render exactly as before — no providers, no fetches.
 *
 * Known caveat: Better Auth's `useSession` caches in a module-level store, so switching between
 * personas relies on the store refetching when a story remounts. If a persona looks stale after
 * flipping stories, reload the preview iframe.
 */
import { type BeaconAppSettings, getDefaultBeaconAppSettings } from "@codalyn/webflow-kit";
import type { Decorator, LoaderFunction, Parameters as SBParameters } from "@storybook/react-vite";
import type { RequestHandler } from "msw";
import { MemoryRouter } from "react-router-dom";
import { BeaconNavigationHistoryProvider } from "@/app/beacon-navigation-history";
import { BeaconRouteLeaveGuardProvider } from "@/app/beacon-route-leave-guard";
import { clearBeaconGuestChosen, writeBeaconGuestChosen } from "@/features/auth/lib/beacon-guest-choice";
import { BeaconAppSettingsProvider } from "@/features/settings/model/beacon-app-settings-provider";
import { CmsCollectionTemplatePageProvider } from "@/shared/lib/use-cms-collection-template-page";
import { TOWER_PERSONAS, type TowerPersonaName, towerHandlers } from "./tower-mock";
import { designerScene, fakePage } from "./webflow-fixtures";
import { setWebflowStoryOverrides, type WebflowStoryOverrides } from "./webflow-stub";

/** Keep in sync with the app's storage keys (settings provider / session token lib). */
const SETTINGS_STORAGE_KEY = "beacon:app-settings-v1";
const SESSION_TOKEN_STORAGE_KEY = "codalyn:beacon-tower-session-token";

type BeaconAppParameters = {
  appShell: boolean;
  persona: TowerPersonaName;
  route: string;
  settings?: Partial<BeaconAppSettings>;
  /** Simulate the user having pressed "Continue as guest" (hides the first-run welcome gate). */
  guestChosen?: boolean;
};

export type BeaconScreenOptions = {
  /** Initial route for the story's MemoryRouter (default `/home`). */
  route?: string;
  /** Current Designer page, e.g. `fakePage("cms")` for CMS-collection-template states. */
  page?: Page;
  /** Extra Designer API overrides, merged over the baseline scene. */
  webflow?: WebflowStoryOverrides;
  /** Extra MSW handlers, checked before the persona's (first match wins). */
  handlers?: RequestHandler[];
  /** Local app-settings overrides seeded before mount. */
  settings?: Partial<BeaconAppSettings>;
  guestChosen?: boolean;
};

/** Story `parameters` for a feature screen under a Tower persona. Spread nothing else on top. */
export function beaconScreen(persona: TowerPersonaName = "guest", opts: BeaconScreenOptions = {}): SBParameters {
  const beacon: BeaconAppParameters = {
    appShell: true,
    persona,
    route: opts.route ?? "/home",
    settings: opts.settings,
    // Guests start on the welcome gate by default; signed-in personas never see it.
    guestChosen: opts.guestChosen ?? persona !== "guest",
  };
  return {
    msw: { handlers: [...(opts.handlers ?? []), ...towerHandlers(persona)] },
    beacon,
    webflow: { ...designerScene(opts.page ?? fakePage()), ...opts.webflow },
  };
}

/**
 * Runs before every story (registered globally in `preview.tsx`): installs the story's Designer
 * overrides and resets/seeds the storage the app providers read on mount. Loaders run before
 * render, so `BeaconAppSettingsProvider`'s `useState(() => readLocal())` sees the seeded value.
 */
export const beaconAppLoader: LoaderFunction = (context) => {
  setWebflowStoryOverrides(context.parameters.webflow as WebflowStoryOverrides | undefined);

  // Always reset so a shell story can't leak auth/settings state into a plain UI story.
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  clearBeaconGuestChosen();

  const beacon = context.parameters.beacon as BeaconAppParameters | undefined;
  if (!beacon?.appShell) {
    return {};
  }

  const persona = TOWER_PERSONAS[beacon.persona];
  if (persona?.sessionToken) {
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, persona.sessionToken);
  }
  if (beacon.guestChosen) {
    writeBeaconGuestChosen();
  }

  // Follow the theme toolbar so the app's ThemeProvider (driven by settings.theme) and the
  // addon-themes html class agree instead of fighting over `.dark`.
  const toolbarTheme = context.globals?.theme;
  const theme: Partial<BeaconAppSettings> =
    toolbarTheme === "light" || toolbarTheme === "dark" ? { theme: toolbarTheme } : {};
  const settings = { ...getDefaultBeaconAppSettings(), ...theme, ...beacon.settings };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

  return {};
};

/** Mirrors the provider nesting in `src/app/app.tsx` for stories flagged via `beaconScreen()`. */
export const withBeaconApp: Decorator = (Story, context) => {
  const beacon = context.parameters.beacon as BeaconAppParameters | undefined;
  if (!beacon?.appShell) {
    return <Story />;
  }
  return (
    // Keyed so switching stories/personas remounts the whole provider tree instead of
    // reconciling one persona's state into another's.
    <MemoryRouter key={`${context.id}:${beacon.persona}`} initialEntries={[beacon.route]}>
      <BeaconAppSettingsProvider>
        <CmsCollectionTemplatePageProvider>
          <BeaconNavigationHistoryProvider>
            <BeaconRouteLeaveGuardProvider>
              <Story />
            </BeaconRouteLeaveGuardProvider>
          </BeaconNavigationHistoryProvider>
        </CmsCollectionTemplatePageProvider>
      </BeaconAppSettingsProvider>
    </MemoryRouter>
  );
};
