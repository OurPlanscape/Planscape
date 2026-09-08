import { AbbreviatedNumberPipe } from './abbreviated-number.pipe';

describe('AbbreviatedNumberPipe', () => {
  const pipe = new AbbreviatedNumberPipe();

  it('rounds values under a million to whole numbers', () => {
    expect(pipe.transform(750897.7)).toBe('750,898');
    expect(pipe.transform(1942.9)).toBe('1,943');
    expect(pipe.transform(0)).toBe('0');
  });

  it('abbreviates values of a million or more', () => {
    expect(pipe.transform(1500000)).toBe('1.5 Million');
    expect(pipe.transform(2000000)).toBe('2 Million');
    expect(pipe.transform(21000000)).toBe('21 Million');
    expect(pipe.transform(21500000)).toBe('21.5 Million');
    expect(pipe.transform(1234567)).toBe('1.2 Million');
  });

  it('returns an empty string for missing values', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
