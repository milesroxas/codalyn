import Link from "next/link";
import { resolveCmsStreamVideo } from "@/features/marketing/cms/lib/resolve-cms-media";
import type { Page } from "@/payload-types";
import { Button } from "@/shared/ui/button";
import { CmsMedia } from "./cms-media";
import { CmsStreamVideo } from "./cms-stream-video";

type CmsPageHeroProps = {
  hero: Page["hero"];
};

/**
 * Page hero rendered from the Pages `hero` group, per the Paper
 * "Page Hero / Centered" design: centered heading, light muted subheading,
 * media slot below. `variant` picks the layout; extend the switch as new
 * variants ship. Returns null when the variant is `none` or there is no
 * heading to show.
 */
function CmsPageHero({ hero }: CmsPageHeroProps) {
  // Rows written before the variant field existed carry NULL at runtime
  // despite the required type — normalize to the default before branching.
  const variant = hero.variant ?? "center";
  if (variant === "none" || !hero.heading) {
    return null;
  }

  switch (variant) {
    case "center":
      return (
        <section data-slot="cms-page-hero" className="flex flex-col items-center gap-20 py-16">
          <div className="flex flex-col items-center gap-4 text-center">
            {hero.eyebrow ? (
              <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{hero.eyebrow}</p>
            ) : null}
            <h1 className="text-4xl leading-none font-semibold tracking-tight text-balance md:text-5xl">
              {hero.heading}
            </h1>
            {hero.subheading ? (
              <p className="max-w-[670px] text-xl leading-snug font-light text-muted-foreground md:text-[32px] md:leading-10">
                {hero.subheading}
              </p>
            ) : null}
            {hero.actions?.length ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {hero.actions.map((action) => (
                  <Button
                    key={action.id ?? `${action.label}-${action.href}`}
                    asChild
                    size="lg"
                    variant={action.appearance === "secondary" ? "outline" : "default"}
                  >
                    <Link href={action.href}>{action.label}</Link>
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          {/* Stream video takes precedence over the upload media slot when both are set. */}
          {resolveCmsStreamVideo(hero.video) ? (
            <CmsStreamVideo
              video={hero.video}
              // Rows written before the field existed carry NULL — normalize to the default.
              playback={hero.videoPlayback ?? "clickToPlay"}
              className="max-w-[954px]"
            />
          ) : (
            <CmsMedia media={hero.image} priority className="max-w-[954px]" />
          )}
        </section>
      );
  }
}

export { CmsPageHero };
