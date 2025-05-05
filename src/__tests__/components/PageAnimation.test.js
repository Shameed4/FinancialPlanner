import pageVariants from '@/app/components/PageAnimation';

describe('PageAnimation', () => {
    it('has all required animation states', () => {
        expect(pageVariants).toHaveProperty('initial');
        expect(pageVariants).toHaveProperty('animate');
        expect(pageVariants).toHaveProperty('exit');
    });

    it('has correct initial state configuration', () => {
        expect(pageVariants.initial).toEqual({
            opacity: 0,
            y: 20
        });
    });

    it('has correct animate state configuration', () => {
        expect(pageVariants.animate).toEqual({
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: "easeOut"
            }
        });
    });

    it('has correct exit state configuration', () => {
        expect(pageVariants.exit).toEqual({
            opacity: 0,
            y: -20,
            transition: {
                duration: 0.2,
                ease: "easeIn"
            }
        });
    });

    it('has appropriate transition durations', () => {
        expect(pageVariants.animate.transition.duration).toBeLessThan(1); // Animation should be quick
        expect(pageVariants.exit.transition.duration).toBeLessThan(1); // Exit should be quick
        expect(pageVariants.animate.transition.duration).toBeGreaterThan(pageVariants.exit.transition.duration); // Enter should be slightly slower than exit
    });

    it('uses appropriate easing functions', () => {
        expect(pageVariants.animate.transition.ease).toBe("easeOut"); // Smooth entry
        expect(pageVariants.exit.transition.ease).toBe("easeIn"); // Quick exit
    });

    it('has consistent opacity values', () => {
        expect(pageVariants.initial.opacity).toBe(0); // Start hidden
        expect(pageVariants.animate.opacity).toBe(1); // Fully visible
        expect(pageVariants.exit.opacity).toBe(0); // End hidden
    });

    it('has appropriate vertical movement', () => {
        expect(pageVariants.initial.y).toBeGreaterThan(0); // Start below
        expect(pageVariants.animate.y).toBe(0); // Move to natural position
        expect(pageVariants.exit.y).toBeLessThan(0); // Exit upwards
    });
}); 