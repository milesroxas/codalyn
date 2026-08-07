-- Replace hardcoded usage-limit numbers in Tower CMS pricing content with
-- {{limits.*}} tokens (resolved at render from operator platform settings).
-- Idempotent: only touches rows still carrying the old hardcoded strings.
set search_path to payload;

begin;

-- Pricing plan cards: the combined limits feature line per tier.
update pages_blocks_pricing_plans_plans_features set text =
  '{{limits.free.webflowUpdates}} Webflow updates, {{limits.free.cmsWrites}} CMS writes, {{limits.free.imageCredits}} image credits / month'
  where text = '2,500 Webflow updates, 500 CMS writes, 25 image credits / month';
update pages_blocks_pricing_plans_plans_features set text =
  '{{limits.pro.webflowUpdates}} Webflow updates, {{limits.pro.cmsWrites}} CMS writes, {{limits.pro.imageCredits}} image credits / month'
  where text = '25,000 Webflow updates, 5,000 CMS writes, 500 image credits / month';
update pages_blocks_pricing_plans_plans_features set text =
  '{{limits.studio.webflowUpdates}} Webflow updates, {{limits.studio.cmsWrites}} CMS writes, {{limits.studio.imageCredits}} image credits / month'
  where text = '60,000 Webflow updates, 12,000 CMS writes, 1,500 image credits / month';

-- Compare table cells: per-metric rows.
update pages_blocks_compare_table_rows_cells set value = '{{limits.free.webflowUpdates}}'   where value = '2,500';
update pages_blocks_compare_table_rows_cells set value = '{{limits.pro.webflowUpdates}}'    where value = '25,000' and _parent_id in (select id from pages_blocks_compare_table_rows where label = 'Webflow updates / month');
update pages_blocks_compare_table_rows_cells set value = '{{limits.studio.webflowUpdates}}' where value = '60,000';
update pages_blocks_compare_table_rows_cells set value = '{{limits.team.webflowUpdates}} per seat, pooled' where value = '120,000 per seat, pooled';

update pages_blocks_compare_table_rows_cells set value = '{{limits.free.cmsWrites}}'   where value = '500'   and _parent_id in (select id from pages_blocks_compare_table_rows where label = 'CMS writes / month');
update pages_blocks_compare_table_rows_cells set value = '{{limits.pro.cmsWrites}}'    where value = '5,000' and _parent_id in (select id from pages_blocks_compare_table_rows where label = 'CMS writes / month');
update pages_blocks_compare_table_rows_cells set value = '{{limits.studio.cmsWrites}}' where value = '12,000';
update pages_blocks_compare_table_rows_cells set value = '{{limits.team.cmsWrites}} per seat, pooled' where value = '25,000 per seat, pooled';

update pages_blocks_compare_table_rows_cells set value = '{{limits.free.imageCredits}}'   where value = '25'    and _parent_id in (select id from pages_blocks_compare_table_rows where label = 'Image credits / month');
update pages_blocks_compare_table_rows_cells set value = '{{limits.pro.imageCredits}}'    where value = '500'   and _parent_id in (select id from pages_blocks_compare_table_rows where label = 'Image credits / month');
update pages_blocks_compare_table_rows_cells set value = '{{limits.studio.imageCredits}}' where value = '1,500';
update pages_blocks_compare_table_rows_cells set value = '{{limits.team.imageCredits}} per seat, pooled' where value = '3,000 per seat, pooled';

-- Draft/version copies (if drafts exist) so a later publish doesn't restore stale numbers.
update _pages_v_blocks_pricing_plans_plans_features set text =
  '{{limits.free.webflowUpdates}} Webflow updates, {{limits.free.cmsWrites}} CMS writes, {{limits.free.imageCredits}} image credits / month'
  where text = '2,500 Webflow updates, 500 CMS writes, 25 image credits / month';
update _pages_v_blocks_pricing_plans_plans_features set text =
  '{{limits.pro.webflowUpdates}} Webflow updates, {{limits.pro.cmsWrites}} CMS writes, {{limits.pro.imageCredits}} image credits / month'
  where text = '25,000 Webflow updates, 5,000 CMS writes, 500 image credits / month';
update _pages_v_blocks_pricing_plans_plans_features set text =
  '{{limits.studio.webflowUpdates}} Webflow updates, {{limits.studio.cmsWrites}} CMS writes, {{limits.studio.imageCredits}} image credits / month'
  where text = '60,000 Webflow updates, 12,000 CMS writes, 1,500 image credits / month';

update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.free.webflowUpdates}}'   where value = '2,500';
update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.pro.webflowUpdates}}'    where value = '25,000' and _parent_id in (select id from _pages_v_blocks_compare_table_rows where label = 'Webflow updates / month');
update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.studio.webflowUpdates}}' where value = '60,000';
update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.team.webflowUpdates}} per seat, pooled' where value = '120,000 per seat, pooled';
update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.free.cmsWrites}}'   where value = '500'   and _parent_id in (select id from _pages_v_blocks_compare_table_rows where label = 'CMS writes / month');
update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.pro.cmsWrites}}'    where value = '5,000' and _parent_id in (select id from _pages_v_blocks_compare_table_rows where label = 'CMS writes / month');
update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.studio.cmsWrites}}' where value = '12,000';
update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.team.cmsWrites}} per seat, pooled' where value = '25,000 per seat, pooled';
update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.free.imageCredits}}'   where value = '25'    and _parent_id in (select id from _pages_v_blocks_compare_table_rows where label = 'Image credits / month');
update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.pro.imageCredits}}'    where value = '500'   and _parent_id in (select id from _pages_v_blocks_compare_table_rows where label = 'Image credits / month');
update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.studio.imageCredits}}' where value = '1,500';
update _pages_v_blocks_compare_table_rows_cells set value = '{{limits.team.imageCredits}} per seat, pooled' where value = '3,000 per seat, pooled';

commit;
