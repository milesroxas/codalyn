import { headers } from "next/headers";
import type * as React from "react";

import { auth } from "@/server/auth";
import { Card, CardContent } from "@/shared/ui/card";
import { MarkdownContent } from "@/shared/ui/markdown-content";
import {
  TowerPageHeader,
  TowerPageMain,
  towerAuthenticatedLegalInsetClassName,
  towerLoggedOutMainClassName,
} from "@/shared/ui/tower-page-shell";
import { TowerPublicFooter } from "@/shared/ui/tower-public-footer";

type LegalDocumentLayoutProps = {
  title: string;
  description: string;
  lastUpdated: string;
  content: string;
  footer?: React.ReactNode;
};

async function LegalDocumentLayout({ title, description, lastUpdated, content, footer }: LegalDocumentLayoutProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  const insetClassName = session?.user ? towerAuthenticatedLegalInsetClassName() : towerLoggedOutMainClassName();

  return (
    <div className={insetClassName}>
      <TowerPageMain width="narrow">
        <TowerPageHeader title={title} description={description} meta={<span>Last updated: {lastUpdated}</span>} />
        <Card>
          <CardContent>
            <MarkdownContent content={content} />
          </CardContent>
        </Card>
        {footer ? <footer className="mt-8 flex flex-wrap items-center gap-3">{footer}</footer> : null}
      </TowerPageMain>
      <TowerPublicFooter />
    </div>
  );
}

export { LegalDocumentLayout };
