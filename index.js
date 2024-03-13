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

echo(startColor('whiteBright') + 'CustomPatch' + stopColor() + ' version ' + startColor('greenBright') + version + stopColor() + '\n');
if(!fs.existsSync(path.join(curDir, '/node_modules')))
{
  echo(startColor('redBright') + 'ERROR: ' + stopColor() + 'Missing ' + startColor('whiteBright') + '"node_modules"' + stopColor() + ' folder');
  process.exit(1);
}

process.argv.shift(); // remove Node/NPX
process.argv.shift(); // remove this script

const len = process.argv.length;
const patchFiles = [];
const asyncResults = [];

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
  fs.readdirSync(patchDir).map(item =>
  {
    if(item.substr(-6) !== '.patch') return;
    const pkg = item.replace('.patch','').split('#');
    const packageName = pkg[0].replace(/\+/g, path.sep);
    const dest = path.join(curDir, 'node_modules', packageName);
    if(!fs.existsSync(dest))
    {
      echo(startColor('yellowBright') + 'WARNING: ' + stopColor() + 'Package ' + startColor('whiteBright') + packageName + stopColor() + ' is not installed - skipping this patch');
      return;
    }
    patchFiles.push({
      pkgName: pkg[0],
      version: pkg[1],
    });
  });
  echo('Found ' + startColor('cyanBright') + patchFiles.length + stopColor() + ' patches');
  patchFiles.forEach(({ pkgName, version}) =>
  {
    readPatch(pkgName, version);
  });

  // wait until all chunks of all patches have been processed
  setTimeout(waitForResults, 20);
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

// build a tarball URL for the given package version
function npmTarballURL(pkgName, pkgVersion, registryURL)
{
  let registry;
  if (registryURL)
  {
    registry = registryURL.endsWith('/') ? registryURL : registryURL + '/';
  }
  else
  {
    registry = 'https://registry.npmjs.org/';
  }

  const scopelessName = getScopelessName(pkgName);
  return `${registry}${pkgName}/-/${scopelessName}-${removeBuildMetadataFromVersion(pkgVersion)}.tgz`;
}

function removeBuildMetadataFromVersion (version)
{
  const plusPos = version.indexOf('+');
  if (plusPos === -1) return version;
  return version.substring(0, plusPos);
}

function getScopelessName (name)
{
  if (name[0] !== '@') return name;
  return name.split('/')[1];
}

// build a patch for the given package
function makePatch(pkgName)
{
  echo('Creating patch for: ' + startColor('magentaBright') + pkgName + stopColor());
  const cfg = getConfig(pkgName);
  if(cfg)
  {
    fetchPackage(pkgName, npmTarballURL(pkgName, cfg.version), cfg.version, comparePackages);
  }
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

// replace directory separators in package names like "@vue/cli" or "@babel/register"
function goodFileName(fn)
{
  const pattern = new RegExp('/', 'g');
  return fn.replace(pattern, '+');
}

function makePatchName(pkgName, version)
{
  return goodFileName(pkgName) + '#' + version + '.patch';
}

// compare all files from the locally modified package with their original content
function comparePackages(pkgName, version)
{
  const patchFile = makePatchName(pkgName, version);
  const stream = fs.createWriteStream(path.join(patchDir, patchFile));
  stream.cork();
  scanFiles(pkgName, '', stream);
  stream.end();
  echo('Successfully created ' + startColor('greenBright') + patchFile + stopColor());
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
  const packageName = pkgName.replace(/\+/g, path.sep);
  const cfg = getConfig(packageName);
  if(cfg)
  {
    const patchFile = pkgName + '#' + version + '.patch';
    const patch = fs.readFileSync(path.join(patchDir, patchFile),'utf8');

    const chunks = [];
    diff.applyPatches(patch,
      {
        loadFile: loadFile,
        patched: (info, content, callback) =>
        {
          chunks.push({
            packageName: pkgName,
            packageVersion: cfg.version,
            patchVersion: version,
            chunkInfo: info,
            newContent: content,
          });
          callback();
        },
        complete: (err) =>
        {
          asyncResults.push(chunks);
        },
      });
  }
  else
  {
    asyncResults.push([]);
  }
}

// return FALSE if packageSemVer is lower than patchSemVer
function isVersionSuitable(patchSemVer, packageSemVer)
{
  const oldVer = patchSemVer.split('.');
  const newVer = packageSemVer.split('.');
  if (+oldVer[0] < +newVer[0]) return true;
  if (+oldVer[0] > +newVer[0]) return false;
  if (+oldVer[1] < +newVer[1]) return true;
  if (+oldVer[1] > +newVer[1]) return false;
  return +oldVer[2] <= +newVer[2];
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
  const oldName = path.join(curDir, 'node_modules', pathNormalize(info.index));
  if(!fs.existsSync(oldName)) fs.writeFileSync(oldName, '');
  // read the original file
  fs.readFile(oldName, 'utf8', callback);
}

function pathNormalize(pathName)
{
  return path.normalize(path.sep === '/' ? pathName.replace(/\\/g, '/') : pathName.replace(/\//g,'\\\\'));
}

function waitForResults()
{
  if (asyncResults.length < patchFiles.length) setTimeout(waitForResults, 20);
  else
  {
    const tree = {};
    asyncResults.flat().forEach(item =>
    {
      if (!item) return;
      if (!tree[item.packageName])
      {
        tree[item.packageName] = {
          packageName: item.packageName,
          packageVersion: item.packageVersion,
          patchVersion: item.patchVersion,
          chunks: [],
        };
      }
      tree[item.packageName].chunks.push({
        chunkInfo: item.chunkInfo,
        newContent: item.newContent,
      });
    });
    Object.values(tree).forEach((pkg, index) =>
    {
      echo('\n ' + (1 + index) + ') Applying patch for ' + startColor('magentaBright') + pkg.packageName + stopColor() + ' ' + startColor('greenBright') + pkg.patchVersion + stopColor());
      if (!isVersionSuitable(pkg.patchVersion, pkg.packageVersion))
      {
        echo(startColor('yellowBright') + 'WARNING: ' + stopColor() + 'The patch for ' + startColor('magentaBright') + pkg.packageName + stopColor()
          + ' is for v' + startColor('greenBright') + pkg.patchVersion + stopColor()
          + ' but you have installed ' + startColor('redBright') + pkg.packageVersion + stopColor());
        return;
      }
      if(pkg.packageVersion !== pkg.patchVersion)
      {
        echo(startColor('yellowBright') + 'WARNING: ' + stopColor() + 'The patch for ' + startColor('magentaBright') + pkg.packageName + stopColor()
          + startColor('greenBright') + ' v' + pkg.patchVersion + stopColor()
          + ' may not apply cleanly to the installed ' + startColor('redBright') + pkg.packageVersion + stopColor());
      }
      pkg.chunks.forEach(chunk =>
      {
        echo('\nPatching chunk ' + startColor('greenBright') + pathNormalize(chunk.chunkInfo.index) + stopColor());
        chunk.success = true;
        // replace original file with the patched content
        if(chunk.newContent !== false)
        {
          fs.writeFile(path.join(curDir, 'node_modules', pathNormalize(chunk.chunkInfo.index)), chunk.newContent, 'utf8', function (err)
          {
            echo('Could not write the new content = ' + startColor('redBright') + err + stopColor());
            chunk.success = false;
          });
        }
        else
        {
          chunk.success = false;
          echo(startColor('yellowBright') + 'WARNING: ' + stopColor() + 'Chunk failed - ' + startColor('redBright') + ' either already applied or for different version' + stopColor());
        }
      });
      const allChunks = pkg.chunks.every(chunk => chunk.success);
      const noneChunks = pkg.chunks.every(chunk => !chunk.success);
      echo('\nPatch for ' + startColor('magentaBright') + pkg.packageName + stopColor() + ' was '
        + startColor(allChunks ? 'cyanBright' : noneChunks ? 'redBright' : 'yellow')
        + (allChunks ? 'successfully' : noneChunks ? 'not' : 'partially') + stopColor() + ' applied');
    });
  }
}
