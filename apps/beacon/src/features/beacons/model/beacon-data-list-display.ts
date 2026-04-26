/** User-facing label for a beacon `dataList` (strips the `beacon-` prefix when present). */
export function displayLabelForDataList(dataList: string): string {
  if (dataList.startsWith("beacon-")) {
    return dataList.slice("beacon-".length);
  }
  return dataList;
}
