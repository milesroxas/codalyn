/** Filename without extension; empty string if only a dot. */
export function fileStemWithoutExtension(fileName: string): string {
  if (!fileName.includes(".")) {
    return fileName;
  }
  return fileName.slice(0, fileName.lastIndexOf(".")) || fileName;
}
