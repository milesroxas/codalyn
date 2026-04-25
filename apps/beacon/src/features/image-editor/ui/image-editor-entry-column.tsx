import { Image as ImageIcon, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type ImageEditorEntryColumnProps = {
  onChooseAddImage: () => void;
  onChooseConfiguration: () => void;
};

export function ImageEditorEntryColumn(props: ImageEditorEntryColumnProps) {
  const { onChooseAddImage, onChooseConfiguration } = props;

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      <button
        type="button"
        className="text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={onChooseAddImage}
      >
        <Card
          size="sm"
          className="h-full border-border/80 transition-colors hover:border-primary/40 hover:bg-accent/30"
        >
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
              <CardTitle className="text-sm font-medium">Add image</CardTitle>
            </div>
            <CardDescription className="text-xs leading-relaxed">
              Pick a page surface, add a file, then crop and place.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-[11px] leading-snug">
              Export size follows the target (max long edge 2560px).
            </p>
          </CardContent>
        </Card>
      </button>
      <button
        type="button"
        className="text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={onChooseConfiguration}
      >
        <Card
          size="sm"
          className="h-full border-border/80 transition-colors hover:border-primary/40 hover:bg-accent/30"
        >
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
              <CardTitle className="text-sm font-medium">Configuration</CardTitle>
            </div>
            <CardDescription className="text-xs leading-relaxed">
              Presets and surface tags for export size.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-[11px] leading-snug">
              For workspace setup; editors use Add image.
            </p>
          </CardContent>
        </Card>
      </button>
    </div>
  );
}
