const complex = (re = 0, im = 0) => ({ re, im });
const add = (a, b) => complex(a.re + b.re, a.im + b.im);
const subtract = (a, b) => complex(a.re - b.re, a.im - b.im);
const scale = (z, factor) => complex(z.re * factor, z.im * factor);
const absSquared = z => z.re * z.re + z.im * z.im;
const probabilities = state => state.map(absSquared);
const normSquared = state => probabilities(state).reduce((sum, p) => sum + p, 0);

export function prepare(input) {
  const q = Array.from({ length: 4 }, () => complex());
  switch (input) {
    case "00": q[0].re = 1; break;
    case "01": q[1].re = 1; break;
    case "10": q[2].re = 1; break;
    case "11": q[3].re = 1; break;
    case "plus": q[0].re = q[2].re = Math.SQRT1_2; break;
    case "uniform": q.forEach(z => { z.re = 0.5; }); break;
    default: throw new RangeError(`Unknown input: ${input}`);
  }

  return q;
}

// Eq. (7.15): |00>_L=|0>, |01>_L=|2>, |10/11>_L=(|4>±|1>)/√2.
export function encode(q) {
  return [
    { ...q[0] },
    scale(subtract(q[2], q[3]), Math.SQRT1_2),
    { ...q[1] },
    complex(),
    scale(add(q[2], q[3]), Math.SQRT1_2),
  ];
}

export function decode(state) {
  state.forEach((z, n) => {
    if (![0, 1, 2, 4].includes(n) && Math.hypot(z.re, z.im) > 1e-10) {
      throw new RangeError(`State leaks outside logical subspace at |${n}>`);
    }
  });

  const at = n => state[n] ?? complex();
  return [
    { ...at(0) },
    { ...at(2) },
    scale(add(at(4), at(1)), Math.SQRT1_2),
    scale(subtract(at(4), at(1)), Math.SQRT1_2),
  ];
}

// Eq. (7.13): c_n(τ)=c_n(0) exp(−inτ). Omit the global zero-point phase.
export function freeEvolutionPhase(state, tau) {
  return state.map((z, n) => {
    const c = Math.cos(n * tau), s = Math.sin(n * tau);
    return complex(z.re * c + z.im * s, z.im * c - z.re * s);
  });
}

// Ideal logical reference only; the physical evolution uses the formula above.
export function cnot(q) {
  return [q[0], q[1], q[3], q[2]].map(z => ({ ...z }));
}

export function fidelity(actual, ideal) {
  let re = 0, im = 0;
  actual.forEach((z, i) => {
    re += ideal[i].re * z.re + ideal[i].im * z.im;
    im += ideal[i].re * z.im - ideal[i].im * z.re;
  });

  const norm = normSquared(actual) * normSquared(ideal);
  return norm === 0 ? 0 : Math.min(1, (re * re + im * im) / norm);
}

// E_n/(ℏω)=n+1/2, including zero-point energy (eq. 7.5).
export function expectedEnergy(state) {
  const norm = normSquared(state);
  return norm === 0 ? NaN : state.reduce((sum, z, n) => sum + (n + 0.5) * absSquared(z), 0) / norm;
}

// Normalized Hermite functions in ξ=√(mω/ℏ)x, using a stable recurrence.
export function wavefunction(state, xi) {
  if (state.length === 0) return complex();
  let p0 = Math.PI ** -0.25 * Math.exp(-xi * xi / 2);
  let psi = scale(state[0], p0);

  if (state.length === 1) return psi;
  let p1 = Math.SQRT2 * xi * p0;
  psi = add(psi, scale(state[1], p1));

  for (let n = 1; n < state.length - 1; n++) {
    const p2 = Math.sqrt(2 / (n + 1)) * xi * p1 - Math.sqrt(n / (n + 1)) * p0;
    psi = add(psi, scale(state[n + 1], p2));
    p0 = p1;
    p1 = p2;
  }

  return psi;
}

export function simulate(input = "plus", tau = 0) {
  if (!Number.isFinite(tau) || tau < 0 || tau > 2 * Math.PI) {
    throw new RangeError("τ must be between 0 and 2π");
  }

  const initial = prepare(input);
  const levels = freeEvolutionPhase(encode(initial), tau);
  const logical = decode(levels);
  const ideal = cnot(initial);
  const wave = Array.from({ length: 321 }, (_, i) => {
    const x = -6 + 12 * i / 320;
    const psi = wavefunction(levels, x);
    return { x, density: absSquared(psi), ...psi };
  });

  return {
    input, tau, logical, ideal, levels,
    logicalProb: probabilities(logical),
    levelProb: probabilities(levels),
    fidelity: fidelity(logical, ideal),
    energy: expectedEnergy(levels),
    wave,
  };
}
