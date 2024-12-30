import fs from 'node:fs';
import path from 'node:path';

import { echo, startColor, stopColor } from './ansiUtils';

/**
 *
 * @param pathName {String}
 * @returns {string}
 */
export function pathNormalize(pathName)
{
  return path.normalize(
    path.sep === '/'
      ? pathName.replace(/\\/g, '/')
      : pathName.replace(/\//g, '\\\\')
  );
}

/**
 *
 * @param dirPath {String}
 */
export function ensureDirectoryExists(dirPath)
{
  if (!fs.existsSync(dirPath))
  {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 *
 * @param filePath {String}
 * @returns {string}
 */
export function readFileContent(filePath)
{
  try
  {
    return fs.readFileSync(filePath, 'utf8');
  }
  catch (err)
  {
    let errorMessage;
    if (err instanceof Error)
    {
      errorMessage = err.message;
    }
    else
    {
      errorMessage = String(err);
    }
    echo(
      startColor('redBright'),
      'ERROR: ',
      stopColor(),
      `Failed to read file ${filePath} - ${errorMessage}`
    );
    return '';
  }
}

/**
 * Generates valid filename for the patch from the given package name and version
 * @param pkgName {String}
 * @param version {String}
 * @returns {string}
 */
export function makePatchName(pkgName, version)
{
  return pkgName.replace(/[\\\/]/g, '+') + '#' + version + '.patch';
}

/**
 * Splits the given patch filename into package name and version
 * @param filename {String}
 * @returns {{pkgName: String, version: String}}
 */
export function parsePatchName(filename)
{
  const pkg = filename.replace('.patch','').split('#');
  return {
    pkgName: pkg[0].replace(/\+/g, path.sep),
    version: pkg[1],
  };
}
