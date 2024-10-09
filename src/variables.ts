// variables.ts

import { program } from 'commander';
import * as path from 'path';
import * as os from 'os';
import ownPkg from '../package.json';

export const curDir: string = process.cwd();
export const tmpDir: string = os.tmpdir();
export const patchDir: string = path.join(curDir, 'patches');

program
    .name('custompatch')
    .usage('[options] [packageName ...]')
    .version(ownPkg.version)
    .description(
        'Tool for patching buggy NPM packages instead of forking them.\n' +
            'When invoked without arguments - apply all patches from the "patches" folder.\n' +
            'If one or more package names are specified - create a patch for the given NPM package ' +
            '(already patched by you in your "node_modules" folder) and save it inside "patches" folder.'
    )
    .option(
        '-a, --all',
        'Include "package.json" files in the patch, by default these are ignored'
    )
    .option('-r, --reverse', 'Reverse the patch(es) instead of applying them')
    .option(
        '-p, --patch',
        'Apply the patch(es) to the specified package(s) instead of all patches'
    );

program.parse();

export const programOptions = program.opts();
