// Paleta categórica validada (orden fijo, nunca ciclar) — ver skill dataviz.
// La app no tiene modo oscuro (tailwind.config.js sin darkMode), por eso solo se usan los tonos claros.
export const CATEGORICAL = [
    '#2a78d6', // 1 blue
    '#eb6834', // 2 orange
    '#1baf7a', // 3 aqua
    '#eda100', // 4 yellow
    '#e87ba4', // 5 magenta
    '#008300', // 6 green
    '#4a3aa7', // 7 violet
    '#e34948', // 8 red
];

// Rampa secuencial azul (magnitud, un solo hue, claro -> oscuro).
export const SEQUENTIAL_BLUE = ['#cde2fb', '#9ec5f4', '#5598e7', '#2a78d6', '#1c5cab', '#0d366b'];

export const INK = {
    primary: '#0b0b0b',
    secondary: '#52514e',
    muted: '#898781',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    successText: '#006300',
};

export const STATUS = {
    good: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
};
