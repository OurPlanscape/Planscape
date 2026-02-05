import { KeyPipe } from './key.pipe';

describe('KeyPipe', () => {
  let pipe: KeyPipe;

  beforeEach(() => {
    pipe = new KeyPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should extract keys from an array of objects', () => {
    const input = [
      { key: 'value1', otherProperty: 'data1' },
      { key: 'value2', otherProperty: 'data2' },
      { key: 'value3', otherProperty: 'data3' },
    ];
    const output = ['value1', 'value2', 'value3'];
    expect(pipe.transform(input)).toEqual(output);
  });

  it('should handle an empty array', () => {
    const input: { key: any }[] = [];
    const output: any[] = [];
    expect(pipe.transform(input)).toEqual(output);
  });

  it('should handle different types of keys', () => {
    const input = [
      { key: 123, otherProperty: 'data1' },
      { key: true, otherProperty: 'data2' },
      { key: 'value3', otherProperty: 'data3' },
    ];
    const output = [123, true, 'value3'];
    expect(pipe.transform(input)).toEqual(output);
  });

  it('should handle objects with additional properties', () => {
    const input = [
      { key: 'value1', otherProperty: 'data1', anotherProperty: 'extra1' },
      { key: 'value2', otherProperty: 'data2', anotherProperty: 'extra2' },
    ];
    const output = ['value1', 'value2'];
    expect(pipe.transform(input)).toEqual(output);
  });
});
