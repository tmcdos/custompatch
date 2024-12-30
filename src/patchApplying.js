import { echo, startColor, stopColor } from './ansiUtils';
import { hasPatches, getConfig, isVersionSuitable } from './utils';
import { parsePatchName, makePatchName, pathNormalize, readFileContent } from './fileUtils';
import { curDir, patchDir } from './variables';
import fs from 'node:fs';
import path from 'node:path';
import { applyPatch, parsePatch, reversePatch } from 'diff';

/**
 * fetch original NPM package, then read the patch file and try to apply or reverse chunks
 * @param pkgName {String}
 * @param version {String}
 * @param patchCounter {Number} Sequential number of the current patch when multiple (begins from one)
 * @param reversing {Boolean}
 */
function readPatch(pkgName, version, patchCounter, reversing)
{
  const packageName = pkgName.replace(/\+/g, path.sep);
  const cfg = getConfig(packageName);
  if(cfg)
  {
    echo('\n ',
      patchCounter,
      ') ',
      reversing ? 'Reversing' : 'Applying',
      ' patch for ',
      startColor('magentaBright'),
      pkgName,
      stopColor(),
      ' ',
      startColor('greenBright'),
      version,
      stopColor(),
      ' onto ',
      startColor('whiteBright'),
      cfg.version,
      stopColor()
    );
    if (!isVersionSuitable(version, cfg.version))
    {
      echo(
        startColor('yellowBright'),
        'WARNING: ',
        stopColor(),
        'The patch is for v',
        startColor('greenBright'),
        version,
        stopColor(),
        ' but you have installed ',
        startColor('redBright'),
        cfg.version,
        stopColor()
      );
    }
    else
    {
      if (version !== cfg.version)
      {
        echo(
          startColor('yellowBright'),
          'WARNING: ',
          stopColor(),
          'The patch for ',
          startColor('greenBright'),
          version,
          stopColor(),
          ' may not ',
          reversing ? 'reverse' : 'apply',
          ' cleanly to the installed ',
          startColor('redBright'),
          cfg.version,
          stopColor()
        );
      }

      const patchFile = makePatchName(pkgName, version);
      const patch = fs.readFileSync(path.join(patchDir, patchFile), 'utf8');

      const chunks = parsePatch(patch);
      chunks.forEach((chunk, subIndex) =>
      {
        // Ensure that we have a valid file name
        const filePath = chunk.newFileName ?? chunk.oldFileName;
        if (!filePath)
        {
          echo(
            startColor('redBright'),
            'ERROR: ',
            stopColor(),
            'A chunk has no file names for package ',
            startColor('greenBright'),
            pkgName,
            stopColor()
          );
          chunk.success = false;
        }
        else
        {
          const normalizedPath = pathNormalize(filePath);
          const fileName = path.join(curDir, 'node_modules', normalizedPath);
          const fileContent = readFileContent(fileName);

          if (reversing)
          {
            echo(
              '\n(',
              patchCounter,
              '.',
              (1 + subIndex),
              ') ',
              'Reversing chunk ',
              startColor('greenBright'),
              filePath,
              stopColor()
            );
            // Reverse the patch
            const reversedPatchText = reversePatch(chunk);
            const reversePatchedContent = applyPatch(fileContent, reversedPatchText);

            if (reversePatchedContent === false)
            {
              // Failed to reverse the patch
              // Attempt to apply the original patch to check if it's already reversed
              const patchedContent = applyPatch(fileContent, chunk);

              if (patchedContent !== false)
              {
                // Patch is already reversed
                echo(
                  startColor('yellowBright'),
                  'WARNING: ',
                  stopColor(),
                  'Patch already reversed',
                );
                chunk.success = true;
              }
              else
              {
                // Patch failed for other reasons
                echo(
                  startColor('yellowBright'),
                  'WARNING: ',
                  stopColor(),
                  'Failed to reverse patch for ',
                  startColor('redBright'),
                  filePath,
                  stopColor()
                );
                chunk.success = false;
              }
            }
            else
            {
              try
              {
                fs.writeFileSync(fileName, reversePatchedContent, 'utf8');
              }
              catch (err)
              {
                echo(
                  startColor('redBright'),
                  'ERROR: ',
                  stopColor(),
                  'Could not write the new content for chunk ',
                  startColor('greenBright'),
                  fileName,
                  stopColor(),
                  ' = ',
                  startColor('redBright'),
                  err.message || err,
                );
                chunk.success = false;
              }
            }
          }
          else
          {
            echo(
              '\n(',
              patchCounter,
              '.',
              (1 + subIndex),
              ') ',
              'Applying chunk ',
              startColor('greenBright'),
              filePath,
              stopColor()
            );
            // Apply the patch
            const patchedContent = applyPatch(fileContent, chunk);

            if (patchedContent === false)
            {
              // Failed to apply patch normally
              // Try applying the reversed patch to check if already applied
              const reversedPatchText = reversePatch(chunk);
              const reversePatchedContent = applyPatch(fileContent, reversedPatchText);

              if (reversePatchedContent !== false)
              {
                // The patch was already applied
                echo(
                  startColor('yellowBright'),
                  'WARNING: ',
                  stopColor(),
                  'Patch already applied',
                );
                chunk.success = true;
              }
              else
              {
                // Patch failed for other reasons
                if (!fs.existsSync(fileName))
                {
                  const folder = path.dirname(fileName);
                  if (!fs.existsSync(folder))
                  {
                    echo(
                      startColor('yellowBright'),
                      'WARNING: Folder ',
                      stopColor(),
                      startColor('redBright'),
                      path.dirname(fileName),
                      stopColor(),
                      startColor('yellowBright'),
                      ' does not exist - the patch is probably for older version',
                      stopColor(),
                    );
                    chunk.success = false;
                  }
                }
                else
                {
                  echo(
                    startColor('yellowBright'),
                    'WARNING: ',
                    stopColor(),
                    'Chunk failed - ',
                    startColor('redBright'),
                    cfg.version !== version ? ' either already applied or for different version' : 'probably already applied',
                    stopColor()
                  );
                  chunk.success = false;
                }
              }
            }
            else
            {
              try
              {
                fs.writeFileSync(fileName, patchedContent, 'utf8');
              }
              catch (err)
              {
                echo(
                  'Could not write the new content for chunk ',
                  startColor('greenBright'),
                  fileName,
                  stopColor(),
                  ' = ',
                  startColor('redBright'),
                  err.message || err,
                  stopColor()
                );
                chunk.success = false;
              }
            }
          }
        }
      });
      const allChunks = chunks.every(chunk => chunk.success);
      const noneChunks = chunks.every(chunk => !chunk.success);
      echo(
        '\nPatch for ',
        startColor('magentaBright'),
        pkgName,
        stopColor(),
        ' was ',
        startColor(allChunks ? 'cyanBright' : noneChunks ? 'redBright' : 'yellow'),
        (allChunks ? 'successfully' : noneChunks ? 'not' : 'partially'),
        stopColor(),
        reversing ? ' reversed' : ' applied'
      );
    }
  }
}

/**
 * Apply all found patches or only those for the specified packages. Reversing requires specifying the package names.
 * @param packageNames {Array<String>}
 * @param reversing {Boolean}
 */
export function applyPatches(packageNames = [], reversing = false)
{
  if (hasPatches())
  {
    // apply patches
    const patchFiles = [];
    fs.readdirSync(patchDir).map(item =>
    {
      if(!item.endsWith('.patch')) return;
      const pkg = parsePatchName(item);
      if (packageNames.length > 0 ? packageNames.includes(pkg.pkgName) : true)
      {
        const dest = path.join(curDir, 'node_modules', pkg.pkgName);
        if(!fs.existsSync(dest))
        {
          echo(
            startColor('yellowBright'),
            'WARNING: ',
            stopColor(),
            'Package ',
            startColor('whiteBright'),
            pkg.pkgName,
            stopColor(),
            ' is not installed - skipping this patch'
          );
          return;
        }
        patchFiles.push(pkg);
      }
    });
    echo(
      'Found ',
      startColor('cyanBright'),
      patchFiles.length,
      stopColor(),
      ' patches'
    );
    if (packageNames.length > 0 && patchFiles.length !== packageNames.length)
    {
      packageNames.filter(name => !patchFiles.find(file => file.pkgName !== name)).forEach(name =>
      {
        echo(
          'No patch was found for ',
          startColor('cyanBright'),
          name,
          stopColor(),
        );
      });
    }
    patchFiles.forEach((item, index) =>
    {
      readPatch(item.pkgName, item.version, index + 1, reversing);
    });
  }
}
