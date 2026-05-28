import { cva, type VariantProps } from "class-variance-authority";
import { promptOpenCmsCollectionTemplateInDesigner } from "@/features/cms-slots/model/prompt-open-cms-collection-template";
import { BEACON_HOME_TILE_CSS_VARS } from "@/shared/lib/beacon-app-backgrounds";
import {
  CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_LABEL,
  CMS_SLOTS_REQUIRES_COLLECTION_TEMPLATE_ARIA_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyAction } from "@/shared/ui/empty";

const collectionTemplatePromptVariants = cva("text-center", {
  variants: {
    variant: {
      tile: "max-w-[min(100%,14rem)] text-[0.8125rem] leading-snug",
      gate: "",
    },
  },
  defaultVariants: {
    variant: "tile",
  },
});

export type CmsSlotsCollectionTemplatePromptProps = VariantProps<typeof collectionTemplatePromptVariants> & {
  className?: string;
};

export function CmsSlotsCollectionTemplatePrompt(props: CmsSlotsCollectionTemplatePromptProps) {
  const { variant = "tile", className } = props;

  if (variant === "gate") {
    return (
      <EmptyAction
        className={className}
        aria-label={CMS_SLOTS_REQUIRES_COLLECTION_TEMPLATE_ARIA_LABEL}
        onClick={(event) => {
          event.stopPropagation();
          promptOpenCmsCollectionTemplateInDesigner();
        }}
      >
        {CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_LABEL}
      </EmptyAction>
    );
  }

  return (
    <Button
      type="button"
      variant="emptyAction"
      size="emptyAction"
      className={cn(collectionTemplatePromptVariants({ variant }), className)}
      aria-label={CMS_SLOTS_REQUIRES_COLLECTION_TEMPLATE_ARIA_LABEL}
      onClick={(event) => {
        event.stopPropagation();
        promptOpenCmsCollectionTemplateInDesigner();
      }}
    >
      {CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_LABEL}
    </Button>
  );
}

export function CmsSlotsCollectionTemplateGatePrompt() {
  return (
    <Empty
      data-slot="cms_slots_collection_template_gate"
      className="relative isolate min-h-[min(44vh,16rem)] gap-0 overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `var(${BEACON_HOME_TILE_CSS_VARS.cmsSlot})` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-background/70 to-background/40"
      />
      <CmsSlotsCollectionTemplatePrompt variant="gate" className="relative z-1" />
    </Empty>
  );
}
