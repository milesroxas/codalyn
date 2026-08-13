import { IconInfoCircle, IconShieldLock } from "@tabler/icons-react";

import {
  AVIF_PRESET_CONSENT_DESCRIPTION,
  AVIF_PRESET_CONSENT_TITLE,
  AVIF_TOWER_ACTIVE_DISCLOSURE,
  AVIF_TOWER_CONSENT_CANCEL_LABEL,
  AVIF_TOWER_CONSENT_CONFIRM_LABEL,
  AVIF_TOWER_CONSENT_DESCRIPTION,
  AVIF_TOWER_CONSENT_TITLE,
} from "@/shared/lib/avif-tower-consent-copy";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

/**
 * Explicit opt-in prompt shown when the user selects AVIF before consenting.
 * The export format only switches to AVIF after Confirm — no image bytes are
 * sent to Tower until then.
 */
export function AvifTowerConsentPrompt(props: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <Alert variant="info">
      <IconShieldLock aria-hidden stroke={1.5} />
      <AlertTitle>{AVIF_TOWER_CONSENT_TITLE}</AlertTitle>
      <AlertDescription>
        <p>{AVIF_TOWER_CONSENT_DESCRIPTION}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button type="button" size="2xs" onClick={props.onConfirm}>
            {AVIF_TOWER_CONSENT_CONFIRM_LABEL}
          </Button>
          <Button type="button" size="2xs" variant="secondary" onClick={props.onCancel}>
            {AVIF_TOWER_CONSENT_CANCEL_LABEL}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/** Always-visible disclosure line while AVIF is the active export format (never tooltip-only). */
export function AvifTowerActiveDisclosure() {
  return (
    <p className="text-muted-foreground text-[10px] leading-snug" data-testid="avif-tower-active-disclosure">
      {AVIF_TOWER_ACTIVE_DISCLOSURE}
    </p>
  );
}

/**
 * A preset requests AVIF but the user has not opted in: exports fall back to
 * in-Designer WebP until they explicitly enable Tower conversion here.
 */
export function AvifPresetConsentNotice(props: { onEnable: () => void }) {
  return (
    <Alert variant="info">
      <IconInfoCircle aria-hidden stroke={1.5} />
      <AlertTitle>{AVIF_PRESET_CONSENT_TITLE}</AlertTitle>
      <AlertDescription>
        <p>{AVIF_PRESET_CONSENT_DESCRIPTION}</p>
        <div className="mt-2">
          <Button type="button" size="2xs" onClick={props.onEnable}>
            {AVIF_TOWER_CONSENT_CONFIRM_LABEL}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
