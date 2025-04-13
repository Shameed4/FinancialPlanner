export function deepCopy(obj) {
  if (obj === undefined) return undefined;

  // Handle potential undefined values inside objects or arrays
  const replacer = (key, value) => {
    return value === undefined ? null : value;
  };

  return JSON.parse(JSON.stringify(obj, replacer));
}

export function sampleNormal(expectedReturn, volatility) {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return expectedReturn + z * volatility;
}

export function sampleUniform(a, b) {
  return a + (b - a) * Math.random();
}