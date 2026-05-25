import { IconInfoCircle } from "@tabler/icons-react";

import {
  TOWER_AVIF_LIMIT_FALLBACK_DESCRIPTION,
  TOWER_AVIF_LIMIT_FALLBACK_TITLE,
} from "@/shared/lib/tower-usage-limit-copy";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";

export function AvifTowerLimitFallbackNotice() {
  return (
    <Alert variant="info">
      <IconInfoCircle aria-hidden stroke={1.5} />
      <AlertTitle>{TOWER_AVIF_LIMIT_FALLBACK_TITLE}</AlertTitle>
      <AlertDescription>{TOWER_AVIF_LIMIT_FALLBACK_DESCRIPTION}</AlertDescription>
    </Alert>
  );
}
