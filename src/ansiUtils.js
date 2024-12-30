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

/**
 *
 * @param colorName {String}
 * @param background {Boolean}
 * @returns {string}
 */
export function startColor(colorName, background = false)
{
  /**
   * @type {number}
   */
  let idx = ansiColors.indexOf(colorName);
  if (idx !== -1)
  {
    return ansi(idx + (background ? 40 : 30));
  }
  idx = ansiColors.indexOf(colorName.replace('Bright', ''));
  if (idx !== -1)
  {
    return ansi(idx + (background ? 100 : 90));
  }
  return ansi(background ? 100 : 90); // grey
}

/**
 *
 * @param background {Boolean}
 * @returns {string}
 */
export function stopColor(background = false)
{
  return ansi(background ? 49 : 39);
}

/**
 *
 * @param code {Number}
 * @returns {string}
 */
function ansi(code)
{
  return '\u001B[' + code + 'm';
}

/**
 * Dumps the given one or more strings to the console by concatenating them first
 * @param {...String} variableArguments
 */
export function echo(...variableArguments)
{
  console.log.call(null, variableArguments.join(''));
}
