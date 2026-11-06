# Quantum harmonic oscillator simulator for quantum computation

A demo built with HTML, CSS, and JavaScript that implements CNOT through the free time evolution of a quantum harmonic oscillator.
It uses the encoding and time evolution described in Nielsen & Chuang, *Quantum Computation and Quantum Information*, §7.3.

```text
|00⟩_L = |0⟩
|01⟩_L = |2⟩
|10⟩_L = (|4⟩+|1⟩)/√2
|11⟩_L = (|4⟩−|1⟩)/√2
```

$$
c_n(\tau) = c_n(0)\exp(-in\tau), \qquad \tau = \omega t
$$

At τ = π, the result matches the logical CNOT output. Mean energy includes the zero-point energy, while time evolution omits the global phase exp(−iτ/2).
Fidelity measures agreement with the ideal CNOT output for the selected input; it is not a general gate fidelity.
Loss, environmental effects, and physical state-preparation or measurement hardware are not modeled.
