import { echo, startColor, stopColor } from './ansiUtils';
import { curDir, patchDir, tmpDir, programOptions } from './variables';
import { fetchPackage } from './npmUtils';
import { getConfig } from './utils';
import { ensureDirectoryExists } from './fileUtils';
import fs from 'node:fs';
import path from 'node:path';
import diff from 'diff';

/**
 *
 * @param packageNames {Array<String>}
 */
export function createPatches(packageNames)
{
  // create patch for each of the provided package names
  packageNames.forEach(makePatch);
}

/**
 * replace directory separators in package names like "@vue/cli" or "@babel/register"
 * @param fn {String}
 * @returns {String}
 */
function goodFileName(fn)
{
  const pattern = new RegExp('/', 'g');
  return fn.replace(pattern, '+');
}

function makePatchName(pkgName, version)
{
  return goodFileName(pkgName) + '#' + version + '.patch';
}

/**
 * @constant
 * @type {import('@types/node').WriteStream} WriteStream
 */

/**
 * compare a modified file from the local package to its original counterpart - if they are different, create a patch and append it to the patch stream
 * @param pkgName {String}
 * @param pathname {String}
 * @param patch {WriteStream}
 */
function createPatch(pkgName, pathname, patch)
{
  if(pathname === 'package.json' && !programOptions.all) return; // skip "package.json" - comparison is not reliable because NPM reorders keys and also appends many system keys (whose names begin with underscore)
  const newFile = path.join(curDir, 'node_modules', pkgName, pathname);
  const oldFile = path.join(tmpDir, pkgName, pathname);
  const oldStr = fs.existsSync(oldFile) ? fs.readFileSync(oldFile, 'utf8') : '';
  const newStr = fs.readFileSync(newFile, 'utf8');
  if(oldStr !== newStr) patch.write(diff.createTwoFilesPatch(oldFile.replace(tmpDir,''), newFile.replace(path.join(curDir, 'node_modules'),''), oldStr, newStr));
}

/**
 * recursively enumerate all files in the locally installed package
 * @param pkgName {String}
 * @param src {String}
 * @param patch {WriteStream}
 */
function scanFiles(pkgName, src, patch)
{
  const files = fs.readdirSync(path.join(curDir, 'node_modules', pkgName, src));
  files.forEach(item =>
  {
    if (item === 'node_modules') return;
    const pathname = path.join(src, item);
    const stat = fs.lstatSync(path.join(curDir, 'node_modules', pkgName, pathname));
    if(stat.isDirectory()) scanFiles(pkgName, pathname, patch);
    else createPatch(pkgName, pathname, patch);
  });
}

/**
 * compare all files from the locally modified package with their original content
 * @param pkgName {String}
 * @param version {String}
 */
function comparePackages(pkgName, version)
{
  const patchFile = makePatchName(pkgName, version);
  // Ensure the patches directory exists
  ensureDirectoryExists(patchDir);
  const stream = fs.createWriteStream(path.join(patchDir, patchFile));
  stream.on('error', (err) =>
  {
    echo(
      startColor('redBright'),
      'ERROR: ',
      stopColor(),
      'Could not write patch file ',
      startColor('cyanBright'),
      patchFile,
      stopColor(),
      ' = ',
      startColor('redBright'),
      err.message || err,
      stopColor()
    );
  });
  stream.cork();
  scanFiles(pkgName, '', stream);
  stream.uncork();

  // Handle 'drain' event if necessary
  if (!stream.write(''))
  {
    stream.once('drain', () => stream.end());
  }
  else
  {
    stream.end();
  }
  echo(
    'Successfully created ',
    startColor('greenBright'),
    patchFile,
    stopColor()
  );
}

/**
 * build a patch for the given package
 * @param pkgName {String}
 */
function makePatch(pkgName)
{
  echo(
    'Creating patch for: ',
    startColor('magentaBright'),
    pkgName,
    stopColor()
  );
  const cfg = getConfig(pkgName);
  if(cfg)
  {
    fetchPackage(pkgName, cfg.version, comparePackages);
  }
  else
  {
    echo(
      startColor('redBright'),
      'ERROR: ',
      stopColor(),
      'Could not find the ',
      startColor('whiteBright'),
      'URL',
      stopColor(),
      ' for ',
      startColor('greenBright'),
      'tarball',
      stopColor()
    );
  }
}
