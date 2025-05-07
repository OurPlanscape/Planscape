export function getFileExtensionFromFile(file: string) {
  const extensionMatch = file.match(/\.\w+$/);
  return extensionMatch ? extensionMatch[0] : '';
}

export function getSafeFileName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_') // spaces to underscores
    .replace(/[^\w\-]/g, '_'); //  special characters to underscores
}
