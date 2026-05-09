import { Loader2, Radio } from "lucide-react";
import { CMS_SLOTS_INSTALL_LABEL } from "@/shared/lib/cms-slots-feature-copy";
import { Button } from "@/shared/ui/button";

type CmsSlotPreInstallBlockProps = {
  installPending: boolean;
  pageScanLoading: boolean;
  onInstallWrapper: () => void;
};

export function CmsSlotPreInstallBlock(props: CmsSlotPreInstallBlockProps) {
  const { installPending, pageScanLoading, onInstallWrapper } = props;

  return (
    <div className="mx-auto w-full max-w-md py-4" data-slot="cms_slots_install">
      <Button
        type="button"
        variant="cmsSlotsCard"
        size="cmsSlotsCard"
        disabled={installPending || pageScanLoading}
        aria-busy={installPending}
        onClick={() => void onInstallWrapper()}
      >
        <span>{installPending ? "Installing…" : CMS_SLOTS_INSTALL_LABEL}</span>
        {installPending ? (
          <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Radio aria-hidden strokeWidth={2.25} />
        )}
      </Button>
    </div>
  );
}
