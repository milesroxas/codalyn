"use client";

import {
  IMAGE_EXPORT_FORMAT_OPTIONS,
  type ImageExportFormat,
  isImageExportFormat,
  isMaxSizeUnit,
  MAX_SIZE_UNIT_OPTIONS,
  type MaxSizeUnit,
} from "@codalyn/webflow-kit";
import { FormField, FormFieldGrid, FormFieldRow } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

function BeaconPresetSelectField(props: {
  id: string;
  label: string;
  disabled?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  triggerWidth?: "full" | "compact";
  span?: "default" | "full";
}) {
  const { id, label, disabled, value, onValueChange, options, triggerWidth = "full", span = "full" } = props;

  return (
    <FormField span={span}>
      <Label htmlFor={id} size="sm">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} width={triggerWidth}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

export function BeaconPresetOutputDimensionFields(props: {
  baseId: string;
  disabled?: boolean;
  width: string;
  height: string;
  onWidthChange: (value: string) => void;
  onHeightChange: (value: string) => void;
}) {
  const { baseId, disabled, width, height, onWidthChange, onHeightChange } = props;
  const widthId = `${baseId}-site-default-w`;
  const heightId = `${baseId}-site-default-h`;

  return (
    <>
      <FormField>
        <Label htmlFor={widthId} size="sm">
          Width
        </Label>
        <Input
          id={widthId}
          value={width}
          disabled={disabled}
          numeric
          inputMode="numeric"
          onChange={(event) => onWidthChange(event.target.value)}
        />
      </FormField>
      <FormField>
        <Label htmlFor={heightId} size="sm">
          Height
        </Label>
        <Input
          id={heightId}
          value={height}
          disabled={disabled}
          numeric
          inputMode="numeric"
          onChange={(event) => onHeightChange(event.target.value)}
        />
      </FormField>
    </>
  );
}

export function BeaconPresetExportFormatField(props: {
  baseId: string;
  disabled?: boolean;
  value: ImageExportFormat;
  onChange: (value: ImageExportFormat) => void;
}) {
  const { baseId, disabled, value, onChange } = props;

  return (
    <BeaconPresetSelectField
      id={`${baseId}-site-default-format`}
      label="Format"
      disabled={disabled}
      value={value}
      onValueChange={(nextValue) => {
        if (isImageExportFormat(nextValue)) {
          onChange(nextValue);
        }
      }}
      options={IMAGE_EXPORT_FORMAT_OPTIONS}
    />
  );
}

export function BeaconPresetMaxEncodedSizeField(props: {
  baseId: string;
  disabled?: boolean;
  maxStr: string;
  maxUnit: MaxSizeUnit;
  onMaxStrChange: (value: string) => void;
  onMaxUnitChange: (value: MaxSizeUnit) => void;
}) {
  const { baseId, disabled, maxStr, maxUnit, onMaxStrChange, onMaxUnitChange } = props;
  const maxSizeId = `${baseId}-site-default-max-size`;

  return (
    <FormField span="full">
      <Label htmlFor={maxSizeId} size="sm">
        Max encoded size
      </Label>
      <FormFieldRow>
        <Input
          id={maxSizeId}
          value={maxStr}
          disabled={disabled}
          numeric
          inputMode="decimal"
          onChange={(event) => onMaxStrChange(event.target.value)}
        />
        <Select
          value={maxUnit}
          disabled={disabled}
          onValueChange={(nextValue) => {
            if (isMaxSizeUnit(nextValue)) {
              onMaxUnitChange(nextValue);
            }
          }}
        >
          <SelectTrigger width="compact" aria-label="Max encoded size unit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {MAX_SIZE_UNIT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormFieldRow>
    </FormField>
  );
}

export function BeaconSiteDefaultPresetFields(props: {
  baseId: string;
  disabled?: boolean;
  width: string;
  height: string;
  exportFormat: ImageExportFormat;
  maxStr: string;
  maxUnit: MaxSizeUnit;
  onWidthChange: (value: string) => void;
  onHeightChange: (value: string) => void;
  onExportFormatChange: (value: ImageExportFormat) => void;
  onMaxStrChange: (value: string) => void;
  onMaxUnitChange: (value: MaxSizeUnit) => void;
}) {
  const {
    baseId,
    disabled,
    width,
    height,
    exportFormat,
    maxStr,
    maxUnit,
    onWidthChange,
    onHeightChange,
    onExportFormatChange,
    onMaxStrChange,
    onMaxUnitChange,
  } = props;

  return (
    <FormFieldGrid>
      <BeaconPresetOutputDimensionFields
        baseId={baseId}
        disabled={disabled}
        width={width}
        height={height}
        onWidthChange={onWidthChange}
        onHeightChange={onHeightChange}
      />
      <BeaconPresetExportFormatField
        baseId={baseId}
        disabled={disabled}
        value={exportFormat}
        onChange={onExportFormatChange}
      />
      <BeaconPresetMaxEncodedSizeField
        baseId={baseId}
        disabled={disabled}
        maxStr={maxStr}
        maxUnit={maxUnit}
        onMaxStrChange={onMaxStrChange}
        onMaxUnitChange={onMaxUnitChange}
      />
    </FormFieldGrid>
  );
}
