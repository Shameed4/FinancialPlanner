import { deepCopy, sampleNormal, sampleUniform } from '@/app/api/algorithm/GlobalFunctions';

describe('GlobalFunctions', () => {
    describe('deepCopy', () => {
        it('should handle undefined input', () => {
            expect(deepCopy(undefined)).toBeUndefined();
        });

        it('should create a deep copy of a simple object', () => {
            const original = { a: 1, b: 'test', c: true };
            const copy = deepCopy(original);
            expect(copy).toEqual(original);
            expect(copy).not.toBe(original);
        });

        it('should create a deep copy of a nested object', () => {
            const original = {
                a: 1,
                b: { c: 2, d: { e: 3 } },
                f: [1, { g: 4 }]
            };
            const copy = deepCopy(original);
            expect(copy).toEqual(original);
            expect(copy.b).not.toBe(original.b);
            expect(copy.b.d).not.toBe(original.b.d);
            expect(copy.f).not.toBe(original.f);
        });

        it('should handle undefined values in objects', () => {
            const original = {
                a: undefined,
                b: { c: undefined },
                d: [undefined]
            };
            const copy = deepCopy(original);
            expect(copy.a).toBeNull();
            expect(copy.b.c).toBeNull();
            expect(copy.d[0]).toBeNull();
        });

        it('should handle arrays with nested objects', () => {
            const original = [
                { a: 1 },
                [2, 3],
                { b: { c: 4 } }
            ];
            const copy = deepCopy(original);
            expect(copy).toEqual(original);
            expect(copy[0]).not.toBe(original[0]);
            expect(copy[1]).not.toBe(original[1]);
            expect(copy[2].b).not.toBe(original[2].b);
        });
    });

    describe('sampleNormal', () => {
        it('should generate values with approximately correct mean and standard deviation', () => {
            const expectedReturn = 5;
            const volatility = 2;
            const samples = Array.from({ length: 10000 }, () => sampleNormal(expectedReturn, volatility));

            const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
            const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
            const stdDev = Math.sqrt(variance);

            // Allow for some statistical variation
            expect(mean).toBeCloseTo(expectedReturn, 1);
            expect(stdDev).toBeCloseTo(volatility, 1);
        });

        it('should generate different values on each call', () => {
            const values = new Set();
            for (let i = 0; i < 100; i++) {
                values.add(sampleNormal(0, 1));
            }
            expect(values.size).toBeGreaterThan(90); // Almost all values should be unique
        });

        it('should scale output based on input parameters', () => {
            const samples1 = Array.from({ length: 1000 }, () => sampleNormal(0, 1));
            const samples2 = Array.from({ length: 1000 }, () => sampleNormal(0, 2));

            const stdDev1 = Math.sqrt(samples1.reduce((sum, val) => sum + val * val, 0) / samples1.length);
            const stdDev2 = Math.sqrt(samples2.reduce((sum, val) => sum + val * val, 0) / samples2.length);

            expect(stdDev2 / stdDev1).toBeCloseTo(2, 0);
        });
    });

    describe('sampleUniform', () => {
        it('should generate values within the specified range', () => {
            const min = 5;
            const max = 10;
            for (let i = 0; i < 1000; i++) {
                const value = sampleUniform(min, max);
                expect(value).toBeGreaterThanOrEqual(min);
                expect(value).toBeLessThanOrEqual(max);
            }
        });

        it('should generate values with approximately uniform distribution', () => {
            const min = 0;
            const max = 10;
            const buckets = Array(10).fill(0);
            const samples = 10000;

            for (let i = 0; i < samples; i++) {
                const value = sampleUniform(min, max);
                const bucketIndex = Math.floor(value);
                buckets[bucketIndex]++;
            }

            // Each bucket should have approximately the same number of values
            const expectedPerBucket = samples / buckets.length;
            const tolerance = expectedPerBucket * 0.2; // Allow 20% deviation

            buckets.forEach(count => {
                expect(count).toBeGreaterThan(expectedPerBucket - tolerance);
                expect(count).toBeLessThan(expectedPerBucket + tolerance);
            });
        });

        it('should handle min equal to max', () => {
            const value = sampleUniform(5, 5);
            expect(value).toBe(5);
        });

        it('should generate different values on each call', () => {
            const values = new Set();
            for (let i = 0; i < 100; i++) {
                values.add(sampleUniform(0, 1));
            }
            expect(values.size).toBeGreaterThan(90); // Almost all values should be unique
        });
    });
}); 