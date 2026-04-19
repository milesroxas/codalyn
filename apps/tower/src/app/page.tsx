import Link from "next/link";
import { Button } from "@/shared/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tower</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Webflow Data API proxy for Beacon, image pipeline (WebP default, AVIF optional), auth, and storage.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/api/health">Health</Link>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://developers.webflow.com/data/reference/rest-introduction" rel="noreferrer" target="_blank">
            Webflow Data API docs
          </a>
        </Button>
      </div>
    </main>
  );
}
