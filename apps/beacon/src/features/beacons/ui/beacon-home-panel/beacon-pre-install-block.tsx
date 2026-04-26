import { Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";

type BeaconPreInstallBlockProps = {
  installPending: boolean;
  pageScanLoading: boolean;
  onInstallWrapper: () => void;
};

export function BeaconPreInstallBlock(props: BeaconPreInstallBlockProps) {
  const { installPending, pageScanLoading, onInstallWrapper } = props;
  return (
    <div className="mx-auto w-full max-w-sm space-y-3" data-slot="beacon_install">
      <p className="text-sm font-medium">Install</p>
      <Button
        type="button"
        className="w-full"
        disabled={installPending || pageScanLoading}
        onClick={() => void onInstallWrapper()}
      >
        {installPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Installing…
          </>
        ) : (
          "Install beacons on this page"
        )}
      </Button>
    </div>
  );
}
