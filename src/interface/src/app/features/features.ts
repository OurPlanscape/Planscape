export function parseFeatureFlags(featureFlags: string | undefined | null) {
  const flagString = featureFlags || '';

  const keys = flagString
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  const entries: any = {};
  keys.forEach((key) => {
    entries[key] = true;
  });
  return entries;
}
