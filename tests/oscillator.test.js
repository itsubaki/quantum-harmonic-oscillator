import test from "node:test";
import assert from "node:assert/strict";
import {
  prepare, encode, decode, freeEvolutionPhase, cnot,
  fidelity, expectedEnergy, wavefunction, simulate,
} from "../public/oscillator.js";

const inputs = ["00", "01", "10", "11", "plus", "uniform"];
const sum = values => values.reduce((total, value) => total + value, 0);
const near = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
};
const sameState = (actual, expected) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((z, i) => {
    near(z.re, expected[i].re);
    near(z.im, expected[i].im);
  });
};

for (const input of inputs) {
  test(`${input}: τ=π gives the ideal CNOT amplitudes`, () => {
    const result = simulate(input, Math.PI);
    sameState(result.logical, cnot(prepare(input)));
    near(result.fidelity, 1);
    assert.equal(result.levels.length, 5);
    assert.equal(result.wave.length, 321);
  });

  test(`${input}: evolution conserves probability and energy, and is 2π-periodic`, () => {
    const initial = simulate(input, 0);
    for (const tau of [0, 0.1, Math.PI / 2, 2.4, Math.PI, 5.1, 2 * Math.PI]) {
      const result = simulate(input, tau);
      near(sum(result.logicalProb), 1);
      near(sum(result.levelProb), 1);
      near(result.energy, initial.energy);
      result.levelProb.forEach((p, i) => near(p, initial.levelProb[i]));
      assert.ok(result.fidelity >= 0 && result.fidelity <= 1);
      assert.ok(result.wave.every(p => Object.values(p).every(Number.isFinite)));
    }
    sameState(simulate(input, 2 * Math.PI).logical, prepare(input));
  });
}

test("basis-state truth table: 00→00, 01→01, 10→11, 11→10", () => {
  [0, 1, 3, 2].forEach((output, input) => {
    const result = simulate(inputs[input], Math.PI);
    result.logicalProb.forEach((p, i) => near(p, i === output ? 1 : 0));
  });
});

test("superposition has the expected intermediate complex phase and fidelity", () => {
  const result = simulate("plus", Math.PI / 2);
  const r = Math.SQRT1_2 / 2;
  sameState(result.logical, [
    { re: Math.SQRT1_2, im: 0 }, { re: 0, im: 0 },
    { re: r, im: -r }, { re: r, im: r },
  ]);
  near(result.energy, 1.75);
  near(result.fidelity, 0.625);
  near(simulate("plus", 0).fidelity, 0.25);
  sameState(simulate("plus", Math.PI).logical, [
    { re: Math.SQRT1_2, im: 0 }, { re: 0, im: 0 },
    { re: 0, im: 0 }, { re: Math.SQRT1_2, im: 0 },
  ]);
});

test("encoding and CNOT support arbitrary complex superpositions without mutating input", () => {
  const q = [{ re: 0.5, im: 0 }, { re: 0, im: 0.5 }, { re: -0.5, im: 0 }, { re: 0, im: -0.5 }];
  const original = structuredClone(q);
  sameState(decode(encode(q)), q);
  sameState(decode(freeEvolutionPhase(encode(q), Math.PI)), cnot(q));
  assert.deepEqual(q, original);
  near(fidelity(q, q), 1);
  near(fidelity(q.map(z => ({ re: -z.im, im: z.re })), q), 1);
});

test("Hermite wavefunctions are normalized for each displayed eigenstate", () => {
  for (let n = 0; n < 5; n++) {
    const state = Array.from({ length: n + 1 }, (_, i) => ({ re: i === n ? 1 : 0, im: 0 }));
    near(expectedEnergy(state), n + 0.5);
    let integral = 0;
    const dx = 0.01;
    for (let i = 0; i <= 1600; i++) {
      const psi = wavefunction(state, -8 + i * dx);
      const weight = i === 0 || i === 1600 ? 0.5 : 1;
      integral += weight * (psi.re ** 2 + psi.im ** 2) * dx;
    }
    near(integral, 1, 1e-10);
  }
  near(wavefunction([{ re: 1, im: 0 }], 0).re, Math.PI ** -0.25);
});

test("displayed wave samples integrate to unit probability", () => {
  for (const input of inputs) {
    for (const tau of [0, 0.7, Math.PI]) {
      const { wave } = simulate(input, tau);
      let integral = 0;
      for (let i = 1; i < wave.length; i++) {
        integral += (wave[i - 1].density + wave[i].density) / 2 * (wave[i].x - wave[i - 1].x);
      }
      near(integral, 1, 1e-8);
    }
  }
});

test("invalid input, invalid time, and states outside the code subspace are rejected", () => {
  assert.throws(() => simulate("invalid", 0), RangeError);
  for (const tau of [NaN, Infinity, -Infinity, -0.1, 2 * Math.PI + 0.01, "1"]) {
    assert.throws(() => simulate("plus", tau), RangeError);
  }
  for (const n of [3, 5]) {
    const state = Array.from({ length: n + 1 }, (_, i) => ({ re: i === n ? 1 : 0, im: 0 }));
    assert.throws(() => decode(state), /outside logical subspace/);
  }
});
