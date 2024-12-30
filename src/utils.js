import fs from 'node:fs';
import path from 'node:path';

import { echo, startColor, stopColor } from './ansiUtils';
import { curDir, patchDir } from './variables';

/**
 *
 * @param version {String}
 * @returns {string}
 */
export function removeBuildMetadataFromVersion(version)
{
  const plusPos = version.indexOf('+');
  if (plusPos === -1)
  {
    return version;
  }
  return version.substring(0, plusPos);
}

/**
 *
 * @param name {String}
 * @returns {string}
 */
export function getScopelessName(name)
{
  if (name[0] !== '@')
  {
    return name;
  }
  return name.split('/')[1];
}

export function hasPatches()
{
  if (!fs.existsSync(patchDir))
  {
    echo(
      startColor('yellowBright'),
      'WARNING: ',
      stopColor(),
      'Missing ',
      startColor('whiteBright'),
      'patches',
      stopColor(),
      ' folder - nothing to do'
    );
    process.exit(2);
  }
  return true;
}

/**
 * returns FALSE on error, Package.JSON on success
 * @param pkgName {String}
 * @returns {Object|boolean}
 */
export function getConfig(pkgName)
{
  const folder = path.join(curDir, 'node_modules', pkgName);
  const cfgName = path.join(folder, 'package.json');

  if(!fs.existsSync(folder))
  {
    echo(
      startColor('redBright'),
      'ERROR: ',
      stopColor(),
      'Missing folder "',
      startColor('whiteBright'),
      './node_modules/',
      stopColor(),
      startColor('greenBright'),
      pkgName,
      stopColor(),
      '"'
    );
    return false;
  }
  try
  {
    fs.accessSync(cfgName, fs.constants.R_OK);
  }
  catch (e)
  {
    echo(
      startColor('redBright'),
      'ERROR: ',
      stopColor(),
      'Can not read ',
      startColor('whiteBright'),
      '"package.json"',
      stopColor(),
      ' for ',
      startColor('greenBright'),
      pkgName,
      stopColor(),
    );
    return false;
  }
  const pkgConfig = fs.readFileSync(cfgName,'utf8');

  let cfg = {};
  try
  {
    cfg = JSON.parse(pkgConfig);
  }
  catch(e)
  {
    echo(
      startColor('redBright'),
      'ERROR: ',
      stopColor(),
      'Could not parse ',
      startColor('whiteBright'),
      '"package.json"',
      stopColor(),
      ' - ',
      startColor('redBright'),
      e.message,
      stopColor()
    );
    return false;
  }
  return cfg;
}

/**
 * return FALSE if packageSemVer is lower than patchSemVer
 * @param patchSemVer {String}
 * @param packageSemVer {String}
 * @returns {boolean}
 */
export function isVersionSuitable(patchSemVer, packageSemVer)
{
  const oldVer = patchSemVer.split('.');
  const newVer = packageSemVer.split('.');
  if (+oldVer[0] < +newVer[0]) return true;
  if (+oldVer[0] > +newVer[0]) return false;
  if (+oldVer[1] < +newVer[1]) return true;
  if (+oldVer[1] > +newVer[1]) return false;
  return +oldVer[2] <= +newVer[2];
}
