import { parseFeatureFlags } from './features';

describe('parseFeatureFlags', () => {
  it('returns an empty object when given an empty string', () => {
    expect(parseFeatureFlags('')).toEqual({});
  });

  it('returns an empty object when given undefined or null-like values', () => {
    expect(parseFeatureFlags(undefined)).toEqual({});
    expect(parseFeatureFlags(null)).toEqual({});
  });

  it('parses a single flag correctly', () => {
    const result = parseFeatureFlags('SINGLE_FLAG');
    expect(result).toEqual({ SINGLE_FLAG: true });
  });

  it('parses multiple comma-separated flags with no whitespace', () => {
    const result = parseFeatureFlags('FLAG_A,FLAG_B,FLAG_C');
    expect(result).toEqual({
      FLAG_A: true,
      FLAG_B: true,
      FLAG_C: true,
    });
  });

  it('trims whitespace around each key and ignores empty segments', () => {
    const raw = '  FOO  ,  BAR , , BAZ  ,  ';
    expect(parseFeatureFlags(raw)).toEqual({
      FOO: true,
      BAR: true,
      BAZ: true,
    });
  });

  it('treats different cases as separate flags', () => {
    const raw = 'lowercase,LOWERCASE';
    expect(parseFeatureFlags(raw)).toEqual({
      lowercase: true,
      LOWERCASE: true,
    });
  });

  it('ignores entries that are only commas or whitespace', () => {
    expect(parseFeatureFlags(', , ,')).toEqual({});
  });
});
