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
    description: "Share what is working well and what we should improve in Tower.",
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
