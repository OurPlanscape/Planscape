
import { TestBed } from '@angular/core/testing';
import { makeColorFunction } from '../utilities';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { testValues } from '../../../fixtures/samplevalues';
import { StyleJson } from '@types';
// import memoizerific from 'memoizerific';


describe('Color Function Test For RAMP sPerformance', () => {
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

        colorFunction = makeColorFunction(rampStyle);
    });

    it('processes several values in a reasonable time', () => {
        const rgba = new Uint8ClampedArray(4);
        const times = [];
        let startTime = 0;
        for (let a = 0; a < 100; a++) {
            startTime = performance.now();
            for (let i in testValues) {
                colorFunction([i], rgba);
            }
            const endTime = performance.now();
            expect(startTime).toBeLessThan(endTime);
            const diff = endTime - startTime;
            times.push(diff);
        }
        const sum = times.reduce((a, b) => a + b, 0);
        const average = sum / times.length;
        console.log('Average performance for unmemoized function:\n', average);
    });

    // it('processes several values with memoized time at 100 Cache Eviction', () => {
    //     const rgba = new Uint8ClampedArray(4);
    //     const times = [];
    //     let startTime = 0;
    //     let colorFunc = memoizerific(100)(colorFunction);

    //     for (let a = 0; a < 100; a++) {
    //         startTime = performance.now();
    //         for (let i in testValues) {
    //             colorFunc([i], rgba);
    //         }
    //         const endTime = performance.now();
    //         expect(startTime).toBeLessThan(endTime);
    //         const diff = endTime - startTime;
    //         times.push(diff);
    //     }
    //     const sum = times.reduce((a, b) => a + b, 0);
    //     const average = sum / times.length;
    //     console.log('Average Memoized performance w 100 CR:\n', average);
    // });

    // it('processes several values with memoized time at 1000 Cache Eviction', () => {
    //     const rgba = new Uint8ClampedArray(4);
    //     const times = [];
    //     let startTime = 0;
    //     let colorFunc = memoizerific(1000)(colorFunction);

    //     for (let a = 0; a < 100; a++) {
    //         startTime = performance.now();
    //         for (let i in testValues) {
    //             colorFunc([i], rgba);
    //         }
    //         const endTime = performance.now();
    //         expect(startTime).toBeLessThan(endTime);
    //         const diff = endTime - startTime;
    //         times.push(diff);
    //     }
    //     const sum = times.reduce((a, b) => a + b, 0);
    //     const average = sum / times.length;
    //     console.log('Average Memoized performance w 1000 CR:\n', average);
    // });

    // it('processes several values with memoized time at 3000 Cache Eviction', () => {
    //     const rgba = new Uint8ClampedArray(4);
    //     const times = [];
    //     let startTime = 0;
    //     let colorFunc = memoizerific(3000)(colorFunction);

    //     for (let a = 0; a < 100; a++) {
    //         startTime = performance.now();
    //         for (let i in testValues) {
    //             colorFunc([i], rgba);
    //         }
    //         const endTime = performance.now();
    //         expect(startTime).toBeLessThan(endTime);
    //         const diff = endTime - startTime;
    //         times.push(diff);
    //     }
    //     const sum = times.reduce((a, b) => a + b, 0);
    //     const average = sum / times.length;
    //     console.log('Average Memoized performance w 3000 CR:\n', average);
    // });
});


// Average recorded times w/ and w/o memoization:

/*
1. No memoization:
35.86699999570847
34.44000000119209
36.51399999856949
35.17399999737739
35.6489999961853
35.49600000023842
  
2. Memoiation at 100 cache eviction:
93.43099999785423
90.7049999988079
92.02199999570847
94.01700000166893
91.97299999833108
  
3. Memoiation at 1000 cache eviction:
69.26399999856949
63.07099999904633
62.32000000119209
61.98700000047684
92.92800000190735
  
4. Memoiation at 3000 cache eviction:
64.00400000095368
61.29199999928474
60.855999999046325
60.02099999785423

*/
