import { describe, expect, it } from "vitest";
import {
  messageForWebflowOAuthCallbackError,
  parseTowerWebflowQueryStatus,
  parseWebflowOAuthPostMessage,
  resolveTowerWorkspaceOnboardingBlocker,
  shouldShowPageHeaderWebflowAction,
  shouldSuppressOnboardingForQuery,
} from "@/features/tower-ui/lib/tower-workspace-onboarding";

const gate = {
  workspaceMembershipCount: 1,
  activeOrganizationId: "org-1",
  webflowOAuthConnected: false,
  activeOrgTeamAdmin: true,
  canCreateOrganization: true,
  signedIn: true,
};

describe("resolveTowerWorkspaceOnboardingBlocker", () => {
  it("returns needs_workspace when user has no memberships", () => {
    expect(
      resolveTowerWorkspaceOnboardingBlocker({
        ...gate,
        workspaceMembershipCount: 0,
        activeOrganizationId: null,
      })
    ).toBe("needs_workspace");
  });

  it("returns needs_active_workspace when no active org is selected", () => {
    expect(
      resolveTowerWorkspaceOnboardingBlocker({
        ...gate,
        activeOrganizationId: null,
      })
    ).toBe("needs_active_workspace");
  });

  it("returns webflow_admin_only for non-admin without connection", () => {
    expect(
      resolveTowerWorkspaceOnboardingBlocker({
        ...gate,
        activeOrgTeamAdmin: false,
      })
    ).toBe("webflow_admin_only");
  });

  it("returns needs_webflow_connect for admin when includeWebflowConnect", () => {
    expect(resolveTowerWorkspaceOnboardingBlocker(gate, { includeWebflowConnect: true })).toBe("needs_webflow_connect");
  });

  it("returns null when connected", () => {
    expect(
      resolveTowerWorkspaceOnboardingBlocker({
        ...gate,
        webflowOAuthConnected: true,
      })
    ).toBeNull();
  });
});

describe("shouldShowPageHeaderWebflowAction", () => {
  it("hides connect CTA when onboarding banner would show and Webflow is not connected", () => {
    expect(shouldShowPageHeaderWebflowAction(gate)).toBe(false);
  });

  it("shows manage CTA for connected admins", () => {
    expect(
      shouldShowPageHeaderWebflowAction({
        ...gate,
        webflowOAuthConnected: true,
      })
    ).toBe(true);
  });

  it("shows header link when no blocker applies and not connected", () => {
    expect(
      shouldShowPageHeaderWebflowAction({
        ...gate,
        webflowOAuthConnected: true,
        activeOrgTeamAdmin: false,
      })
    ).toBe(false);
  });
});

describe("messageForWebflowOAuthCallbackError", () => {
  it("maps known OAuth error codes", () => {
    expect(messageForWebflowOAuthCallbackError("access_denied")).toBe("Webflow authorization was cancelled.");
    expect(messageForWebflowOAuthCallbackError("token_exchange")).toBe(
      "Could not complete Webflow connection. Try again."
    );
  });

  it("uses generic copy for unknown codes", () => {
    expect(messageForWebflowOAuthCallbackError("internal_server_error")).toBe("Webflow connection failed. Try again.");
  });
});

describe("parseWebflowOAuthPostMessage", () => {
  it("accepts success payloads", () => {
    expect(parseWebflowOAuthPostMessage({ type: "codalyn:webflow-oauth", status: "success" })).toEqual({
      type: "codalyn:webflow-oauth",
      status: "success",
    });
  });

  it("accepts error payloads with error code", () => {
    expect(
      parseWebflowOAuthPostMessage({ type: "codalyn:webflow-oauth", status: "error", error: "access_denied" })
    ).toEqual({
      type: "codalyn:webflow-oauth",
      status: "error",
      error: "access_denied",
    });
  });

  it("rejects unknown status", () => {
    expect(parseWebflowOAuthPostMessage({ type: "codalyn:webflow-oauth", status: "pending" })).toBeNull();
  });

  it("rejects wrong type", () => {
    expect(parseWebflowOAuthPostMessage({ type: "other", status: "success" })).toBeNull();
  });
});

describe("shouldSuppressOnboardingForQuery", () => {
  it("suppresses connect banner when query reports connected", () => {
    expect(shouldSuppressOnboardingForQuery("connected", "needs_webflow_connect")).toBe(true);
  });

  it("does not suppress unrelated blockers", () => {
    expect(shouldSuppressOnboardingForQuery("connected", "needs_workspace")).toBe(false);
  });
});

describe("parseTowerWebflowQueryStatus", () => {
  it("allows only known query values", () => {
    expect(parseTowerWebflowQueryStatus("connected")).toBe("connected");
    expect(parseTowerWebflowQueryStatus("bogus")).toBeNull();
  });
});
