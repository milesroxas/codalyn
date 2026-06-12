/** Whether a logged-out visitor on the Tower app host `/` should be sent to the marketing site. */
export function shouldRedirectLoggedOutAppHostHomeToMarketing(options: {
  signedIn: boolean;
  hostSplitEnabled: boolean;
  isAppHost: boolean;
  hasSessionCookie: boolean;
}): boolean {
  return !options.signedIn && options.hostSplitEnabled && options.isAppHost && !options.hasSessionCookie;
}
