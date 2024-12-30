#!/usr/bin/env node

import { version } from '../package.json';
import { program } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { applyPatches } from './patchApplying';
import { createPatches } from './patchCreation';
import { programOptions, curDir } from './variables';
import { echo, startColor, stopColor } from './ansiUtils';

// If the user asked just for the version - do not print a colored version of ours; Commander will print it black-and-white.
if (!programOptions.version)
{
  echo(
    startColor('whiteBright'),
    'CustomPatch',
    stopColor(),
    ' version ',
    startColor('greenBright'),
    version,
    stopColor(),
    '\n'
  );
}

// If there is no node_modules inside the project folder - quit
if (!fs.existsSync(path.join(curDir, 'node_modules')))
{
  echo(
    startColor('redBright'),
    'ERROR: ',
    stopColor(),
    'Missing ',
    startColor('whiteBright'),
    '"node_modules"',
    stopColor(),
    ' folder'
  );
  process.exit(1);
}

// Enforce that -p and -r are not used together
if (programOptions.patch && programOptions.reverse)
{
  echo(
    startColor('redBright'),
    'ERROR: ',
    stopColor(),
    'Cannot use -p/--patch and -r/--reverse together.'
  );
  process.exit(1);
}

if (programOptions.patch)
{
  // we want to apply patches to one or more specific packages
  applyPatches(program.args);
}
else if (programOptions.reverse)
{
  // we want to reverse the patches of one or more specific packages (or all patches, if no package name is provided)
  applyPatches(program.args, true);
}
else if (program.args.length > 0)
{
  // we want to create patches for the given package names
  createPatches(program.args);
}
else
{
  // we want to apply all available patches to their corresponding packages
  applyPatches();
}
