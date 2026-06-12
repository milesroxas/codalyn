import { headers } from "next/headers";
import type * as React from "react";

import { auth } from "@/server/auth";
import { Card, CardContent } from "@/shared/ui/card";
import { MarkdownContent } from "@/shared/ui/markdown-content";
import {
  TowerMarketingPublicPageBody,
  towerMarketingPublicPageFooterRegionClassName,
} from "@/shared/ui/tower-marketing-public-page-body";
import {
  TowerPageHeader,
  TowerPageMain,
  towerAuthenticatedLegalPageShellClassName,
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
  const authenticated = Boolean(session?.user);

  const documentBody = (
    <TowerPageMain width="narrow" className="min-h-0 flex-1">
      <TowerPageHeader title={title} description={description} meta={<span>Last updated: {lastUpdated}</span>} />
      <Card>
        <CardContent>
          <MarkdownContent content={content} />
        </CardContent>
      </Card>
      {footer ? <footer className="mt-8 flex flex-wrap items-center gap-3">{footer}</footer> : null}
    </TowerPageMain>
  );

  if (authenticated) {
    return (
      <div className={towerAuthenticatedLegalPageShellClassName()}>
        <div className="flex min-h-0 flex-1 flex-col">{documentBody}</div>
        <div className={towerMarketingPublicPageFooterRegionClassName()}>
          <TowerPublicFooter variant="default" />
        </div>
      </div>
    );
  }

  return <TowerMarketingPublicPageBody footerVariant="marketing">{documentBody}</TowerMarketingPublicPageBody>;
}

export { LegalDocumentLayout };
