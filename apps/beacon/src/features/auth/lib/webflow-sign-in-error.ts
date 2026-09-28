/**
 * Copy for a failed explicit "Continue with Webflow" sign-in. The codes are the ones
 * `exchangeWebflowDesignerSession` returns: Tower's JSON `error` field, or a client-side code for a
 * Designer API / network failure.
 */
export function messageForWebflowSignInError(error: string): string {
  switch (error.trim()) {
    case "early_access_required":
      return "Your Webflow account isn't on the Tower access list yet. Request access below.";
    case "webflow_user_mismatch":
      return "This email belongs to a Tower account that is linked to a different Webflow user. Sign in with your email and password, then relink Webflow from Tower's Connection page to use this Webflow account here.";
    case "no_tower_account":
      return "No Tower account is linked to this Webflow user yet. Try again, or sign in with email.";
    case "get_id_token_failed":
      return "Webflow didn't provide a sign-in token. Reload the Designer and try again.";
    case "rate_limited":
      return "Too many sign-in attempts. Wait a few minutes and try again.";
    case "tower_unreachable":
      return "Couldn't reach Tower. Check your connection and try again.";
    case "tower_not_configured":
      return "Tower isn't available in this environment.";
    case "webflow_resolve_bearer_missing":
    case "webflow_resolve_bearer_invalid":
    case "webflow_resolve_scope_missing":
    case "webflow_resolve_upstream_error":
      return "Tower can't verify Webflow sign-ins right now. Sign in with email, or try again later.";
    default:
      return "Couldn't sign in with Webflow. Try again, or sign in with email.";
  }
}
