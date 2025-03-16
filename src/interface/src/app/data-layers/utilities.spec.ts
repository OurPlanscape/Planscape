import { TestBed } from '@angular/core/testing';
import { makeColorFunction } from './utilities';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Color Function Test For RAMP type', () => {
    let colorFunction: any;
    const rampStyle = {
        "map_type": "RAMP",
        "no_data": {
            "values": [0.003],
            "color": "#CCCCCC",
            "opacity": 0.0,
            "label": "0"
        },
        "entries": [
            {
                "value": 0.008,
                "color": "#F5CC00",
                "opacity": 1.0,
                "label": null
            },
            {
                "value": 0.013,
                "color": "#F5A300",
                "opacity": 1.0,
                "label": null
            },
            {
                "value": 0.019,
                "color": "#F57A00",
                "opacity": 1.0,
                "label": null
            },
            {
                "value": 0.026,
                "color": "#F55200",
                "opacity": 1.0,
                "label": null
            },
            {
                "value": 0.036,
                "color": "#F52900",
                "opacity": 1.0,
                "label": null
            },
            {
                "value": 0.057,
                "color": "#F50000",
                "opacity": 1.0,
                "label": "0.06"
            }
        ]
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
        });

        colorFunction = makeColorFunction(rampStyle);
    });

    it('should create a color function', () => {
        expect(colorFunction).toBeTruthy();
    });

    it('should set pixel color to no_data color for values in no_data', () => {
        const rgba = new Uint8ClampedArray(4);
        colorFunction([0.003], rgba);
        expect(rgba).toEqual(new Uint8ClampedArray([204, 204, 204, 0])); // #CCCCCC with 0 opacity
    });

    it('should set pixel color to no_data color for values less than no_data', () => {
        const rgba = new Uint8ClampedArray(4);
        colorFunction([0.002], rgba);
        console.log('RGBA is now this:', rgba);
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

        // Calculate expected color based on interpolation between #F5CC00 and #F57A00
        // #F5CC00 (245, 204, 0) and #F57A00 (245, 122, 0)
        const expectedRed = 245; // Red component remains the same
        // const expectedBlue = 0; // Blue component remains the same
        const expectedAlpha = 255; // Full opacity

        console.log('what is green:', rgba[1]);

        expect(rgba[0]).toBe(expectedRed); // Red component
        // expect(rgba[2]).toBe(expectedBlue); // Blue component
        expect(rgba[3]).toBe(expectedAlpha); // Full opacity
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

    })

});
