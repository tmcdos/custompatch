// ansiUtils.ts

export const ansiColors = [
    'black',
    'red',
    'green',
    'yellow',
    'blue',
    'magenta',
    'cyan',
    'white'
];

export function startColor(
    colorName: string,
    background: boolean = false
): string {
    let idx = ansiColors.indexOf(colorName);
    if (idx !== -1) return ansi(idx + (background ? 40 : 30));
    idx = ansiColors.indexOf(colorName.replace('Bright', ''));
    if (idx !== -1) return ansi(idx + (background ? 100 : 90));
    return ansi(background ? 100 : 90); // grey
}

export function stopColor(background: boolean = false): string {
    return ansi(background ? 49 : 39);
}

function ansi(code: number): string {
    return '\u001B[' + code + 'm';
}
