import { applyOpinionMode, type OpinionMode } from "@/features/linter/model/opinion.modes";
import { resolvePresetOrFallback } from "@/features/linter/presets";
import { createChildGroupKeyMatchRule } from "@/features/linter/rules/canonical/child-group-key-match";
import { createMainChildrenPageRule } from "@/features/linter/rules/canonical/main-children.page";
import {
  createCFGlobalStylesRequiredRule,
  createCFMainWrapperParentRule,
  createCFPageWrapperRequiredRule,
} from "@/features/linter/rules/client-first/structure";
import { createRuleConfigurationService } from "@/features/linter/services/rule-configuration-service";
import { createRuleRegistry } from "@/features/linter/services/rule-registry";
import {
  createLocalStorageAdapter,
  DEFAULT_RULE_CONFIG_STORAGE_KEY,
} from "@/features/linter/services/storage/local-storage-adapter";
import { createTowerMirroringStorageAdapter } from "@/features/linter/services/storage/tower-mirroring-storage-adapter";
import { isFlintCloudSyncEnabled, pushRuleConfigToTower } from "@/features/linter/services/sync/flint-settings-sync";

// Global registry instance
export const ruleRegistry = createRuleRegistry();

// Local storage is always the source of truth (free/offline). The mirroring adapter
// additionally pushes rule-config writes to Tower, but only when cloud sync is
// enabled (paid tier + Tower configured) — otherwise it is a pass-through to local.
const ruleConfigStorage = createTowerMirroringStorageAdapter(
  createLocalStorageAdapter(DEFAULT_RULE_CONFIG_STORAGE_KEY),
  {
    shouldMirror: isFlintCloudSyncEnabled,
    push: pushRuleConfigToTower,
  }
);

// Pass the registry into the config service
const ruleConfigService = createRuleConfigurationService(ruleRegistry, { storage: ruleConfigStorage });

// Initialize with default rules and user configurations
export function initializeRuleRegistry(mode: OpinionMode = "balanced", presetId?: string): void {
  console.log("Initializing rule registry…");

  // 1) register preset rules (seeds defaults too)
  ruleRegistry.clear();
  const selected = resolvePresetOrFallback(presetId);
  ruleRegistry.registerRules([...selected.rules]);

  // 2) register canonical page rules globally (preset-agnostic)
  ruleRegistry.registerPageRules([createMainChildrenPageRule()]);

  // 2a) register preset-specific page rules
  if (selected.id === "client-first") {
    ruleRegistry.registerPageRules([
      createCFPageWrapperRequiredRule(),
      createCFMainWrapperParentRule(),
      createCFGlobalStylesRequiredRule(),
    ]);
  }
  const childGroupRule = createChildGroupKeyMatchRule();

  // 2b) register canonical element rules
  ruleRegistry.registerRules([childGroupRule]);

  // 3) apply opinion mode adjustments (preset-level severity policy)
  applyOpinionMode(ruleRegistry, mode);

  // 4) apply persisted user settings.
  //    Severity precedence: explicit user override > opinion mode > rule default.
  //    Enabled/customSettings always apply; severity applies ONLY where the user
  //    stored an explicit override, so opinion-mode severities are not clobbered.
  const userConfigs = ruleConfigService.load();
  userConfigs.forEach((cfg) => {
    ruleRegistry.updateRuleConfiguration(cfg.ruleId, {
      enabled: cfg.enabled,
      customSettings: cfg.customSettings,
    });
  });
  const severityOverrides = ruleConfigService.getStoredSeverities();
  for (const [ruleId, severity] of Object.entries(severityOverrides)) {
    ruleRegistry.updateRuleConfiguration(ruleId, { severity });
  }

  console.log(
    `Registry initialized with preset '${selected.id}' containing ${ruleRegistry.getAllRules().length} rules`
  );
}
