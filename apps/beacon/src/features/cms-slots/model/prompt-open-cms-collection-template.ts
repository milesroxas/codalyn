import { CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_NOTIFY_MESSAGE } from "@/shared/lib/cms-slots-feature-copy";

/** Guides the user to open a CMS collection template in the Designer (extension cannot switch pages for them). */
export function promptOpenCmsCollectionTemplateInDesigner(): void {
  void webflow.notify({
    type: "Info",
    message: CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_NOTIFY_MESSAGE,
  });
}
