import pacote from 'pacote';
import fs from 'node:fs';
import path from 'node:path';

import { echo, startColor, stopColor } from './ansiUtils';
import { getScopelessName, removeBuildMetadataFromVersion } from './utils';
import { tmpDir } from './variables';

/**
 * Generate the download URL for the given package name
 * @param pkgName {String}
 * @param pkgVersion {String}
 * @returns {String}
 */
export function npmTarballURL(pkgName, pkgVersion)
{
  const scopelessName = getScopelessName(pkgName);
  return `https://registry.npmjs.org/${pkgName}/-/${scopelessName}-${removeBuildMetadataFromVersion(pkgVersion)}.tgz`;
}

/**
 * Download the TAR-ball of the given NPM package
 * @param pkgName {String}
 * @param pkgVersion {String}
 * @param callback {Function}
 */
export function fetchPackage(pkgName, pkgVersion, callback)
{
  const url = npmTarballURL(pkgName, pkgVersion);
  const dest = path.join(tmpDir, pkgName);
  echo(
    'Fetching tarball of ',
    startColor('whiteBright'),
    pkgName,
    stopColor(),
    ' from ',
    startColor('green'),
    url,
    stopColor()
  );
  pacote.extract(url, dest).then(() =>
  {
    callback(pkgName, pkgVersion);
    fs.rm(dest, { recursive: true, force: true }, (err) =>
    {
      if (err)
      {
        echo(
          startColor('redBright'),
          'ERROR: ',
          stopColor(),
          'Could not clean up the TEMP folder'
        );
      }
    });
  }).catch((err) =>
  {
    echo(
      startColor('redBright'),
      err.message,
      stopColor()
    );
  });
}
