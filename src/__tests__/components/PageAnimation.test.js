import pageVariants from '@/app/components/PageAnimation';

describe('pageVariants animation config', () => {
    it('should have initial, animate, and exit states', () => {
        expect(pageVariants).toHaveProperty('initial');
        expect(pageVariants).toHaveProperty('animate');
        expect(pageVariants).toHaveProperty('exit');
    });

    it('should have correct initial state', () => {
        expect(pageVariants.initial).toEqual({ opacity: 0, y: 20 });
    });

    it('should have correct animate state', () => {
        expect(pageVariants.animate).toMatchObject({
            opacity: 1,
            y: 0,
            transition: expect.objectContaining({ duration: 0.3, ease: 'easeOut' })
        });
    });

    it('should have correct exit state', () => {
        expect(pageVariants.exit).toMatchObject({
            opacity: 0,
            y: -20,
            transition: expect.objectContaining({ duration: 0.2, ease: 'easeIn' })
        });
    });
}); 