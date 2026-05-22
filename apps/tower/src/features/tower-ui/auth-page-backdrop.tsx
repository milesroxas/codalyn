export function AuthPageBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_45%_at_0%_0%,oklch(0.94_0.02_264),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_100%,oklch(0.96_0.01_200),transparent_50%)] dark:bg-[radial-gradient(ellipse_70%_45%_at_0%_0%,oklch(0.22_0.04_264),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_100%,oklch(0.2_0.02_200),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-72 w-[120%] -translate-x-1/2 rounded-[100%] bg-gradient-to-r from-primary/[0.07] via-transparent to-foreground/[0.05] blur-2xl dark:from-primary/[0.15]"
      />
    </>
  );
}
