import { permanentRedirect } from "next/navigation";

import { TOWER_DOCS_PATH } from "@/shared/lib/navigation/tower-marketing-paths";

/** /help is an alias for the documentation page. */
export default function HelpPage() {
  permanentRedirect(TOWER_DOCS_PATH);
}
