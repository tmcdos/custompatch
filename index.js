#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const os = require('os');
const diff = require('diff');
const version = require('./package.json').version;
const npmFolder = path.join(npmDir(),'node_modules','npm','node_modules');

let pacote, rimraf;
try
{
  pacote = require('pacote');
}
catch(e)
{
  pacote = require(path.join(npmFolder,'pacote'));
}
try
{
  rimraf = require('rimraf');
}
catch(e)
{
  rimraf = require(path.join(npmFolder,'rimraf'));
}

// ANSI styles
const ansiColors = ['black','red','green','yellow','blue','magenta','cyan','white'];

function startColor(colorName, background)
{
  let idx = ansiColors.indexOf(colorName);
  if(idx !== -1) return ansi(idx + (background ? 40 : 30));
  idx = ansiColors.indexOf(colorName.replace('Bright',''));
  if(idx !== -1) return ansi(idx + (background ? 100 : 90));
  return ansi(background ? 100 : 90); // grey
}

function stopColor(background)
{
  return ansi(background ? 49 : 39);
}

function ansi(code)
{
  return '\u001B[' + code + 'm';
}

function echo()
{
  console.log.apply(null,arguments);
}

const curDir = process.cwd();
const tmpDir = os.tmpdir();
const patchDir = path.join(curDir, 'patches');

echo(startColor('whiteBright') + 'CustomPatch' + stopColor() + ' version ' + startColor('greenBright') + version + stopColor());
if(!fs.existsSync(path.join(curDir, '/node_modules')))
{
  echo(startColor('redBright') + 'ERROR: ' + stopColor() + 'Missing ' + startColor('whiteBright') + '"node_modules"' + stopColor() + ' folder');
  process.exit(1);
}

process.argv.shift(); // remove Node/NPX
process.argv.shift(); // remove this script

const len = process.argv.length;
if(len > 0)
{
  // create patches
  if(!fs.existsSync(patchDir)) fs.mkdirSync(patchDir);
  for(let i = 0; i < len; i++)
  {
    makePatch(process.argv[i]);
  }
}
else
{
  if(!fs.existsSync(patchDir))
  {
    echo(startColor('yellowBright') + 'WARNING: ' + stopColor() + 'Missing ' + startColor('whiteBright') + 'patches' + stopColor() + ' folder - nothing to do');
    process.exit(2);
  }
  // apply patches
  const patches = fs.readdirSync(patchDir);
  patches.forEach(item =>
  {
    if(item.substr(-6) !== '.patch') return;
    const pkg = item.replace('.patch','').split('@');
    const dest = path.join(curDir, 'node_modules', pkg[0]);
    if(!fs.existsSync(dest))
    {
      echo(startColor('yellowBright') + 'WARNING: ' + stopColor() + 'Package ' + startColor('whiteBright') + pkg[0] + stopColor() + ' is not installed - skipping this patch');
      return;
    }
    readPatch(pkg[0], pkg[1]);
  });
}

// find the NPM folder because PACOTE package is relative to this folder (not a global package)
function npmDir()
{
  if(process.platform.indexOf('win') === 0)
  {
    return process.env.APPDATA ? path.join(process.env.APPDATA, 'npm') : path.dirname(process.execPath);
  }
  else
  {
    // /usr/local/bin/node --> prefix=/usr/local
    let prefix = path.dirname(path.dirname(process.execPath));

    // destdir is respected only on Unix
    if (process.env.DESTDIR) prefix = path.join(process.env.DESTDIR, prefix);
    return prefix;
  }
}

// returns FALSE on error, Package.JSON on success
function getConfig(pkgName)
{
  const folder = path.join(curDir, 'node_modules', pkgName);
  const cfgName = path.join(folder, 'package.json');

  if(!fs.existsSync(folder))
  {
    echo(startColor('redBright') + 'ERROR: ' + stopColor() + 'Missing folder "' + startColor('whiteBright') + './node_modules/' + stopColor() + startColor('greenBright') + pkgName + stopColor() + '"');
    return false;
  }
  try
  {
    fs.accessSync(cfgName, fs.constants.R_OK);
  }
  catch (e)
  {
    echo(startColor('redBright') + 'ERROR: ' + stopColor() + 'Can not read ' + startColor('whiteBright') + '"package.json"' + stopColor());
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
    echo(startColor('redBright') + 'ERROR: ' + stopColor() + 'Could not parse ' + startColor('whiteBright') + '"package.json"' + stopColor() + ' - ' + startColor('redBright') + e.message + stopColor());
    return false;
  }
  return cfg;
}

// build a patch for the given package
function makePatch(pkgName)
{
  echo('Creating patch for: ' + startColor('magentaBright') + pkgName + stopColor());
  const cfg = getConfig(pkgName);
  if(cfg && cfg._resolved !== '') fetchPackage(pkgName, cfg._resolved, cfg.version, comparePackages);
  else
  {
    echo(startColor('redBright') + 'ERROR: ' + stopColor() + 'Could not find the ' + startColor('whiteBright') + 'URL' + stopColor() + ' for ' + startColor('greenBright') + 'tarball' + stopColor());
  }
}

// download the tarball
function fetchPackage(pkgName, url, version, callback)
{
  echo('Fetching tarball of ' + startColor('whiteBright') + pkgName + stopColor() + ' from ' + startColor('green') + url + stopColor());
  const dest = path.join(tmpDir, pkgName);
  pacote.extract(url, dest).then(function ()
  {
    callback(pkgName, version);
    rimraf(dest, function (err)
    {
      if(err) echo(startColor('redBright') + 'ERROR: ' + stopColor() + 'Could not clean up the TEMP folder');
    });
  }).catch(function (err)
  {
    echo(startColor('redBright') + err.message + stopColor());
  });
}

// compare all files from the locally modified package with their original content
function comparePackages(pkgName, version)
{
  const stream = fs.createWriteStream(path.join(patchDir, pkgName + '@' + version + '.patch'));
  stream.cork();
  scanFiles(pkgName, '', stream);
  stream.end();
  echo('Successfully created ' + startColor('greenBright') + pkgName + '@' + version + '.patch' + stopColor());
}

// recursively enumerate all files in the locally installed package
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

// compare a modified file from the local package to its original counterpart - if they are different, create a patch and append it to the patch stream
function createPatch(pkgName, pathname, patch)
{
  const newFile = path.join(curDir, 'node_modules', pkgName, pathname);
  const oldFile = path.join(tmpDir, pkgName, pathname);
  let oldStr = fs.existsSync(oldFile) ? fs.readFileSync(oldFile, 'utf8') : '';
  let newStr = fs.readFileSync(newFile, 'utf8');
  if(pathname === 'package.json') return; // skip "package.json" - comparison is not reliable because NPM reorders keys and also appends many system keys (whose names begin with underscore)
  /*
  {
    let oldJson = {}, newJson = {};
    try
    {
      oldJson = JSON.parse(oldStr);
      newJson = JSON.parse(newStr);
    }
    catch(e)
    {
      echo(startColor('redBright') + 'ERROR: ' + stopColor() + 'Could not parse ' + startColor('green') + 'package.json' + stopColor() + ' = ' + startColor('redBright') + e.message + stopColor());
      return;
    }
    // remove all keys which start with underscore
    let key;
    for(key in oldJson)
      if(key[0] === '_') delete oldJson[key];
    for(key in newJson)
      if(key[0] === '_') delete newJson[key];
    // sort the keys
    let oldSorted = {}, newSorted = {};
    Object.keys(oldJson).sort().forEach(function(key)
    {
      oldSorted[key] = oldJson[key];
    });
    Object.keys(newJson).sort().forEach(function(key)
    {
      newSorted[key] = newJson[key];
    });
    oldStr = JSON.stringify(oldSorted, null, 2);
    newStr = JSON.stringify(newSorted, null, 2);
  }
  */
  if(oldStr !== newStr) patch.write(diff.createTwoFilesPatch(oldFile.replace(tmpDir,''), newFile.replace(path.join(curDir, 'node_modules'),''), oldStr, newStr));
}

// fetch original NPM package, then read the patch file and try to apply hunks
function readPatch(pkgName, version)
{
  echo('Applying patch for: ' + startColor('magentaBright') + pkgName + stopColor());
  const cfg = getConfig(pkgName);
  if(cfg)
  {
    if(cfg.version !== version) echo(startColor('yellowBright') + 'WARNING: ' + stopColor() + 'The patch for ' + startColor('greenBright') + version + stopColor()
      + ' may not apply cleanly to the installed ' + startColor('redBright') + cfg.version + stopColor());
    const patch = fs.readFileSync(path.join(patchDir, pkgName + '@' + version + '.patch'),'utf8');
    diff.applyPatches(patch,
      {
        loadFile: loadFile,
        patched: onPatch,
        complete: onComplete.bind(null, pkgName + '@' + version + '.patch')
      });
  }
}

function loadFile(info, callback)
{
  /*
  info =
  {
    index: '\vue2-dragula\dist\vue-dragula.js',
    oldFileName: '\vue2-dragula\dist\vue-dragula.js',
    oldHeader: '',
    newFileName: '\vue2-dragula\dist\vue-dragula.js',
    newHeader: '',
    hunks: [object1, object2, ...]
  }
   */
  // read the original file
  fs.readFile(path.join(curDir, 'node_modules', pathNormalize(info.index)), 'utf8', function (err, data)
  {
    callback(err, data);
  });
}

function onPatch(info, content, callback)
{
  // replace original file with the patched content
  if(content !== false) fs.writeFile(path.join(curDir, 'node_modules', pathNormalize(info.index)), content, 'utf8', function (err)
  {
    callback(err);
  });
  else
  {
    echo(startColor('yellowBright') + 'WARNING: ' + stopColor() + 'The patch for ' + startColor('greenBright') + pathNormalize(info.index) + stopColor() + ' was not applied - '
      + startColor('redBright') + ' either already applied or for different version' + stopColor());
    callback();
  }
}

function onComplete(patchName, err)
{
  if(err) echo(startColor('redBright') + 'ERROR: ' + stopColor() + 'The patch ' + startColor('greenBright') + patchName + stopColor() + ' produced an error = ' + startColor('redBright') + err + stopColor());
  else echo('Successfully applied ' + startColor('greenBright') + patchName + stopColor());
}


function pathNormalize(pathName)
{
  return path.normalize(path.sep === '/' ? pathName.replace(/\\/g, '/') : pathName.replace(/\//g,'\\\\'));
}
