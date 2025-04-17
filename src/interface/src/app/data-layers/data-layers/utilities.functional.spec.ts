import { TestBed } from '@angular/core/testing';
import { StyleJson } from '@types';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { generateColorFunction } from '../utilities';

describe('Color Function Test For RAMP type', () => {
  let colorFunction: any;
  const rampStyle: StyleJson = {
    map_type: 'RAMP',
    no_data: {
      values: [0.003],
      color: '#CCCCCC',
      opacity: 0.0,
      label: '0',
    },
    entries: [
      {
        value: 0.008,
        color: '#F5CC00',
        opacity: 1.0,
        label: null,
      },
      {
        value: 0.013,
        color: '#F5A300',
        opacity: 1.0,
        label: null,
      },
      {
        value: 0.019,
        color: '#F57A00',
        opacity: 1.0,
        label: null,
      },
      {
        value: 0.026,
        color: '#F55200',
        opacity: 1.0,
        label: null,
      },
      {
        value: 0.036,
        color: '#F52900',
        opacity: 1.0,
        label: null,
      },
      {
        value: 0.057,
        color: '#F50000',
        opacity: 1.0,
        label: '0.06',
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    colorFunction = generateColorFunction(rampStyle);
  });

  it('should create a color function', () => {
    expect(colorFunction).toBeTruthy();
  });

  it('should set pixel color to no_data color for values in no_data', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.003], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([0, 0, 0, 0])); // #CCCCCC with 0 opacity
  });

  it('should set pixel color to no_data color for values less than no_data', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.002], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([245, 204, 0, 255]));
  });

  it('should set pixel color for the first entry value', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.008], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([245, 204, 0, 255])); // #F5CC00 with full opacity
  });

  it('should set pixel color for the last entry value', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.057], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([245, 0, 0, 255])); // #F50000 with full opacity
  });

  it('should interpolate color for a value between two entries', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.015], rgba); // Between 0.008 and 0.019
    // Expected color is an interpolation between #F5CC00 and #F57A00
    const expectedRed = 245; // Red component remains the same
    const expectedGreenMin = 122;
    const expectedGreenMax = 204;
    const expectedBlue = 0;
    const expectedAlpha = 255; // Full opacity
    expect(rgba[0]).toBe(expectedRed);
    expect(rgba[1]).toBeGreaterThan(expectedGreenMin);
    expect(rgba[1]).toBeLessThan(expectedGreenMax);
    expect(rgba[2]).toBe(expectedBlue);
    expect(rgba[3]).toBe(expectedAlpha);
  });

  it('should set pixel color to transparent for unknown values', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.001], rgba); // Below the first entry
    expect(rgba[1]).toBeGreaterThan(140);
    expect(rgba[1]).toBeLessThan(220);

    expect(rgba[0]).toBe(245); // Red component
    expect(rgba[3]).toBe(255); // Full opacity
  });

  it('should set pixel color for a value that is exactly equal to an entry', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.019], rgba); // Exact match
    expect(rgba[0]).toBe(245); // Red component
    expect(rgba[3]).toBe(255); // Full opacity
  });
});

describe('Color Function Test For INTERVALS type', () => {
  let colorFunction: any;
  const intervalsStyle: StyleJson = {
    map_type: 'INTERVALS',
    no_data: {
      values: [0.12],
      color: '#000000',
      opacity: 0.0,
      label: '0-0.12',
    },
    entries: [
      {
        value: 0.25,
        color: '#C2CFF2', // RGBA (194, 207, 242, 255)
        opacity: 1.0,
        label: '0.12-0.25',
      },
      {
        value: 0.35,
        color: '#6187F2', // RGBA (97, 135, 242, 255)
        opacity: 1.0,
        label: '0.25-0.35',
      },
      {
        value: 0.45,
        color: '#801921', // RGBA (128, 25, 33, 255)
        opacity: 1.0,
        label: '0.35-0.45',
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    colorFunction = generateColorFunction(intervalsStyle);
  });

  it('should create a color function', () => {
    expect(colorFunction).toBeTruthy();
  });

  it('should set pixel color to no_data color for values in no_data', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.12], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([0, 0, 0, 0]));
  });

  it('should set pixel color to no_data color for values less than the first value', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.01], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([194, 207, 242, 255]));
  });

  it('should set pixel color for the first entry value', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.25], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([194, 207, 242, 255]));
  });

  it('should set pixel color for the last entry value', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.45], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([128, 25, 33, 255]));
  });

  it('color between two entries should match the correct value', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.31], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([97, 135, 242, 255]));
  });
});

describe('Color Function Test For VALUES type', () => {
  let colorFunction: any;
  const valuesStyles: StyleJson = {
    map_type: 'VALUES',
    no_data: {
      values: [],
      color: '',
      opacity: 0,
      label: '',
    },
    entries: [
      {
        value: 0.0,
        color: '#30123b', // RGBA [48, 18, 59, 255]
        opacity: 1.0,
        label: 'Zero or nearly none (< 10%)',
      },
      {
        value: 1.0,
        color: '#475dbe', // RGBA [71, 93, 190, 255]
        opacity: 1.0,
        label: 'Low (10-50%)',
      },
      {
        value: 2.0,
        color: '#49c0bf', // RGBA 73, 192, 191
        opacity: 1.0,
        label: 'Somewhat low (50-85%)',
      },
      {
        value: 3.0,
        color: '#8af85f', // RGBA [138, 248, 95]
        opacity: 1.0,
        label: 'Proportionate (85-115%)',
      },
      {
        value: 4.0,
        color: '#d3e835', // RGBA [211, 232, 53]
        opacity: 1.0,
        label: 'Somewhat high (115-150%)',
      },
      {
        value: 5.0,
        color: '#f6ae2e', // RGBA (246, 174, 46)
        opacity: 1.0,
        label: 'High (150-200%)',
      },
      {
        value: 6.0,
        color: '#ed6c1b', // RGBA [237, 108, 27, 255]
        opacity: 1.0,
        label: 'Very high (200-300%)',
      },
      {
        value: 7.0,
        color: '#c02c06', // RGBA [192, 44, 6, 255]
        opacity: 1.0,
        label: 'Extremely high (> 300%)',
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    colorFunction = generateColorFunction(valuesStyles);
  });

  it('should create a color function', () => {
    expect(colorFunction).toBeTruthy();
  });

  it('should set pixel color to no_data color for values in no_data', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([500], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([0, 0, 0, 0]));
  });

  it('should set pixel color to no_data color for values less than zero ', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([-1.0], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([0, 0, 0, 0]));
  });

  it('should set pixel color to no_data color for values not in the values ', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([12345], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([0, 0, 0, 0]));
  });

  it('should set pixel color for the first entry value', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.0], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([48, 18, 59, 255]));
  });

  it('should set pixel color for the last entry value', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([7.0], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([192, 44, 6, 255]));
  });

  it('colors not defined should result in a no-data color', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.015], rgba); // Between 0.008 and 0.019
    expect(rgba).toEqual(new Uint8ClampedArray([0, 0, 0, 0]));
  });
});

describe('Color Function Test For INTERVALS type', () => {
  let colorFunction: any;
  const intervalsStyle: StyleJson = {
    map_type: 'INTERVALS',
    no_data: {
      values: [0.003],
      color: '#CCCCCC',
      opacity: 0.0,
      label: '0',
    },
    entries: [
      {
        value: 0.008,
        color: '#F5CC00',
        opacity: 1.0,
        label: null,
      },
      {
        value: 0.013,
        color: '#F5A300',
        opacity: 1.0,
        label: null,
      },
      {
        value: 0.019,
        color: '#F57A00',
        opacity: 1.0,
        label: null,
      },
      {
        value: 0.026,
        color: '#F55200',
        opacity: 1.0,
        label: null,
      },
      {
        value: 0.036,
        color: '#F52900',
        opacity: 1.0,
        label: null,
      },
      {
        value: 0.057,
        color: '#F50000',
        opacity: 1.0,
        label: '0.06',
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    colorFunction = generateColorFunction(intervalsStyle);
  });

  it('should create a color function', () => {
    expect(colorFunction).toBeTruthy();
  });

  it('should set pixel color to no_data color for values in no_data', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.003], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([0, 0, 0, 0]));
  });

  it('should set pixel color for the first entry value', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.008], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([245, 204, 0, 255]));
  });

  it('should set pixel color for the last entry value', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.057], rgba);
    expect(rgba).toEqual(new Uint8ClampedArray([245, 0, 0, 255]));
  });

  it('should set pixel color to transparent for unknown values', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.001], rgba); // Below the first entry
    expect(rgba[1]).toBeGreaterThan(140);
    expect(rgba[1]).toBeLessThan(220);
    expect(rgba[0]).toBe(245); // Red component
    expect(rgba[3]).toBe(255); // Full opacity
  });

  it('should set pixel color for a value that is exactly equal to an entry', () => {
    const rgba = new Uint8ClampedArray(4);
    colorFunction([0.019], rgba); // Exact match
    expect(rgba[0]).toBe(245); // Red component
    expect(rgba[3]).toBe(255); // Full opacity
  });
});
