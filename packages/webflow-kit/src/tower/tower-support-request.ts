export type TowerSupportRequestKind = "feedback" | "help";

export type TowerSupportTopicOption = {
  value: string;
  label: string;
};

export type TowerSupportRequestConfig = {
  kind: TowerSupportRequestKind;
  title: string;
  description: string;
  topicLabel: string;
  topicPlaceholder: string;
  topics: readonly TowerSupportTopicOption[];
  detailsLabel: string;
  detailsPlaceholder: string;
  submitLabel: string;
  captureEvent: string;
};

export const TOWER_SUPPORT_REQUEST_CONFIG: Record<TowerSupportRequestKind, TowerSupportRequestConfig> = {
  feedback: {
    kind: "feedback",
    title: "Submit feedback",
    description: "Share what is working well and what we should improve.",
    topicLabel: "Category",
    topicPlaceholder: "Select a category",
    topics: [
      { value: "general", label: "General" },
      { value: "bug", label: "Bug report" },
      { value: "feature", label: "Feature idea" },
      { value: "billing", label: "Billing" },
    ],
    detailsLabel: "Feedback",
    detailsPlaceholder: "What happened, and what would you like to see instead?",
    submitLabel: "Send feedback",
    captureEvent: "tower_feedback_submitted",
  },
  help: {
    kind: "help",
    title: "Get help",
    description: "Tell us what you are trying to do and where you are stuck. We will follow up by email.",
    topicLabel: "Topic",
    topicPlaceholder: "Select a topic",
    topics: [
      { value: "account", label: "Account & sign-in" },
      { value: "beacon", label: "Beacon" },
      { value: "webflow", label: "Webflow connection" },
      { value: "billing", label: "Billing" },
      { value: "team", label: "Team & invites" },
    ],
    detailsLabel: "Details",
    detailsPlaceholder: "Include steps, URLs, or error messages if you have them.",
    submitLabel: "Request help",
    captureEvent: "tower_help_requested",
  },
};

export function isTowerSupportRequestKind(raw: unknown): raw is TowerSupportRequestKind {
  return raw === "feedback" || raw === "help";
}

export function isTowerSupportRequestTopic(kind: TowerSupportRequestKind, topic: string): boolean {
  return TOWER_SUPPORT_REQUEST_CONFIG[kind].topics.some((option) => option.value === topic);
}

export function towerSupportRequestTopicLabel(kind: TowerSupportRequestKind, topic: string): string {
  return TOWER_SUPPORT_REQUEST_CONFIG[kind].topics.find((option) => option.value === topic)?.label ?? topic;
}

export const TOWER_SUPPORT_REQUEST_EMAIL_LABEL = "Email";
export const TOWER_SUPPORT_REQUEST_EMAIL_PLACEHOLDER = "you@example.com";

type SupportRequestFormValues = {
  topic: string;
  details: string;
  email?: string;
};

/** Mirrors Tower `parseAccessEmailInput` rules for client-side validation. */
export function isSupportRequestEmailValid(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  return email.length >= 3 && email.includes("@") && !email.startsWith("@") && !email.endsWith("@");
}

export function validateSupportRequestForm(
  config: TowerSupportRequestConfig,
  values: SupportRequestFormValues,
  options?: { requireEmail?: boolean }
): string | null {
  if (options?.requireEmail && !isSupportRequestEmailValid(values.email ?? "")) {
    return "Enter a valid email address.";
  }
  if (!values.topic.trim()) {
    return `Choose a ${config.topicLabel.toLowerCase()}.`;
  }
  if (!values.details.trim()) {
    return `Enter your ${config.detailsLabel.toLowerCase()}.`;
  }
  return null;
}

export function supportRequestSubmitErrorMessage(
  config: TowerSupportRequestConfig,
  errorCode: string | undefined
): string {
  if (errorCode === "invalid_email") {
    return "Enter a valid email address.";
  }
  if (errorCode === "unauthorized") {
    return "Sign in to continue.";
  }
  if (errorCode === "invalid_details") {
    return `Enter your ${config.detailsLabel.toLowerCase()}.`;
  }
  if (errorCode === "invalid_topic") {
    return `Choose a ${config.topicLabel.toLowerCase()}.`;
  }
  return "Could not send your request. Try again.";
}
