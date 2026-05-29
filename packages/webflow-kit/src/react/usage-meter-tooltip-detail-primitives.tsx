import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";

export const usageMeterTooltipDetailVariants = cva(
  "flex w-full min-w-0 flex-col gap-3 text-left text-xs leading-relaxed text-inherit"
);

export const usageMeterTooltipSummaryVariants = cva("opacity-90");

export const usageMeterTooltipTitleVariants = cva("font-semibold leading-snug");

export const usageMeterTooltipSectionVariants = cva("flex flex-col gap-2");

export const usageMeterTooltipHeadingVariants = cva(
  "text-[0.6875rem] font-semibold uppercase tracking-[0.08em] opacity-55"
);

export const usageMeterTooltipListVariants = cva("flex list-none flex-col gap-3 p-0");

export const usageMeterTooltipProductGroupVariants = cva("flex flex-col items-start gap-1.5");

export const usageMeterTooltipProductGroupDetailListVariants = cva("flex list-none flex-col gap-1 p-0");

export const usageMeterTooltipProductGroupDetailVariants = cva("flex gap-1.5 leading-snug opacity-80");

export const usageMeterTooltipProductGroupDetailBulletVariants = cva("select-none opacity-60");

export const usageMeterTooltipProductGroupDetailTextVariants = cva("min-w-0 flex-1");

export const usageMeterTooltipListItemVariants = cva("flex items-center gap-2");

export const usageMeterTooltipListItemDetailVariants = cva("min-w-0 flex-1 leading-snug opacity-80");

export const usageMeterTooltipFootnoteVariants = cva(
  "flex flex-col gap-2 border-t border-current/15 pt-2.5 text-[0.6875rem] leading-relaxed opacity-60"
);

export function UsageMeterTooltipDetailFrame(props: ComponentProps<"div">) {
  return <div data-slot="usage-meter-tooltip-detail" className={usageMeterTooltipDetailVariants()} {...props} />;
}

export function UsageMeterTooltipTitle(props: ComponentProps<"p">) {
  return <p data-slot="tooltip-detail-title" className={usageMeterTooltipTitleVariants()} {...props} />;
}

export function UsageMeterTooltipSummary(props: ComponentProps<"p">) {
  return <p data-slot="tooltip-detail-summary" className={usageMeterTooltipSummaryVariants()} {...props} />;
}

export function UsageMeterTooltipSection(props: ComponentProps<"div">) {
  return <div data-slot="tooltip-detail-section" className={usageMeterTooltipSectionVariants()} {...props} />;
}

export function UsageMeterTooltipHeading(props: ComponentProps<"p">) {
  return <p data-slot="tooltip-detail-heading" className={usageMeterTooltipHeadingVariants()} {...props} />;
}

export function UsageMeterTooltipList(props: ComponentProps<"ul">) {
  return <ul data-slot="tooltip-detail-list" className={usageMeterTooltipListVariants()} {...props} />;
}

export function UsageMeterTooltipProductGroup(props: ComponentProps<"li">) {
  return <li data-slot="tooltip-detail-product-group" className={usageMeterTooltipProductGroupVariants()} {...props} />;
}

export function UsageMeterTooltipProductGroupDetailList(props: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="tooltip-detail-product-group-details"
      className={usageMeterTooltipProductGroupDetailListVariants()}
      {...props}
    />
  );
}

export function UsageMeterTooltipProductGroupDetail(props: ComponentProps<"li">) {
  const { children, ...rest } = props;
  return (
    <li
      data-slot="tooltip-detail-product-group-detail"
      className={usageMeterTooltipProductGroupDetailVariants()}
      {...rest}
    >
      <span aria-hidden className={usageMeterTooltipProductGroupDetailBulletVariants()}>
        •
      </span>
      <span className={usageMeterTooltipProductGroupDetailTextVariants()}>{children}</span>
    </li>
  );
}

export function UsageMeterTooltipListItem(props: ComponentProps<"li">) {
  return <li data-slot="tooltip-detail-list-item" className={usageMeterTooltipListItemVariants()} {...props} />;
}

export function UsageMeterTooltipListItemDetail(props: ComponentProps<"span">) {
  return (
    <span
      data-slot="tooltip-detail-list-item-detail"
      className={usageMeterTooltipListItemDetailVariants()}
      {...props}
    />
  );
}

export function UsageMeterTooltipFootnote(props: ComponentProps<"div">) {
  return <div data-slot="tooltip-detail-footnote" className={usageMeterTooltipFootnoteVariants()} {...props} />;
}

export function UsageMeterTooltipNote(props: ComponentProps<"p">) {
  return <p data-slot="tooltip-detail-note" {...props} />;
}
