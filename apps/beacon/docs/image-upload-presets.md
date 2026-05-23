# Beacon image upload presets

This document describes the preset system used by Beacon image upload and export flows.

## Scope and non-goals

- Beacon presets control upload/export constraints (size, format, max encoded bytes).
- Webflow styling and final layout remain owned by Webflow.
- Natural/inferred source dimensions are advisory only and are not part of resolver precedence.

## Target key model

Preset rows are keyed by a canonical `targetKey`:

- `site-default`
- `bare-image-element`
- `bare-image-instance`
- `component-image`
- `component-image-instance`

Keys are serialized through `serializePresetTargetKey()` to enforce deterministic storage and lookups.

## Precedence (highest to lowest)

For resolved upload targets:

1. Tagged dimensions (`data-beacon-export-width/height`) for width/height only.
2. Instance preset.
3. Component or element preset (based on target type).
4. Site default preset.
5. Manual session values (no resolver constraints).

When tagged dimensions are active, format and max encoded file-size are still inherited from the best lower-priority preset match, if present.

## Duplicate target rule

- Only one preset row may exist per canonical `targetKey`.
- Duplicate checks run in both settings normalization and resolver-facing CRUD validation paths.
- Duplicate writes return `DUPLICATE_PRESET_TARGET`.

## Component, instance, and CMS-bound behavior

- Component image uploads may resolve by instance key, then component key, then site default.
- Bare image uploads may resolve by instance key, then element key, then site default.
- Ambiguous CMS bindings resolve to a blocker (`ambiguous-cms-binding`) and no constraints.

## Permission matrix

- Editor experience:
  - Team preset mutation blocked (`TEAM_PRESETS_LOCKED_EDITOR_MODE`).
  - Personal limited patching still allowed (theme).
- Designer/manager with team-setting permission:
  - Team preset mutation allowed.
- Product admin:
  - May target explicit `organizationId` for team settings.
- Non-admin with `organizationId` override:
  - Request rejected.

## Source validation policy

Before preview/crop/encode/upload, source files are validated for type and readability in the image editor flow. Invalid sources do not advance to mutation/upload paths.

## Max encoded file-size enforcement

- Preset `maxFileSizeBytes` is enforced against estimated encoded bytes when enforcement is enabled.
- On violation, placement is blocked with `EXPORT_PRESET_FILE_LIMIT_EXCEEDED`.

## Advisory natural dimensions

- Natural-size advisories compare source natural dimensions against resolver/session export dimensions.
- Advisories are informational and optional; they do not change resolver output.

## Upload preset picker behavior

- Picker includes resolved active preset, available scoped presets, and manual override.
- Picker selection applies session constraints only; it does not mutate stored presets.
- In read-only team contexts, picker remains visible with restricted mutation controls elsewhere.

## Storage

- Presets are stored in `imagePresetStorage` (`siteDefault` + `byTargetKey`).
- Canonical helpers live in `@codalyn/webflow-kit`: `listBeaconPresetStorageEntries`, `formatBeaconPresetDisplayName`, `inferPresetCrudScopeFromTargetKey`.

## Management surfaces

- **Beacon image editor (Configure)**: CRUD for scoped presets (element, component, instance) and tagging.
- **Tower `/beacon`**: site-default preset CRUD; scoped presets read-only.
- **Beacon Settings → Export**: read-only list of stored scoped presets.
