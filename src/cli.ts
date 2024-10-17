#!/usr/bin/env node

// cli.ts

import * as fs from 'fs';
import * as path from 'pathe';
import * as os from 'os';
import { program } from 'commander';
import pacote from 'pacote';

import { startColor, stopColor } from './ansiUtils';
import ownPkg from '../package.json';
import { PatchFile } from './types';
import { getConfig, comparePackages, readPatch } from './patchUtils';
import { npmTarballURL } from './npmUtils';
import { programOptions, curDir, patchDir } from './variables';

const patchFiles: PatchFile[] = [];

// Added array to track missing packages
const missingPackages: string[] = [];

function addPatchFileIfExists(pkgName: string, version: string): void {
    const packageName = pkgName.replace(/\+/g, path.sep);
    const dest = path.join(curDir, 'node_modules', packageName);

    if (!fs.existsSync(dest)) {
        console.log(
            startColor('yellowBright') +
                'WARNING: ' +
                stopColor() +
                `Package "${packageName}" is not installed - skipping this patch`
        );
        return;
    }

    patchFiles.push({ pkgName, version });
}

(async () => {
    if (!programOptions.version) {
        console.log(
            startColor('whiteBright') +
                'CustomPatch' +
                stopColor() +
                ' version ' +
                startColor('greenBright') +
                ownPkg.version +
                stopColor() +
                '\n'
        );
    }

    if (!fs.existsSync(path.join(curDir, 'node_modules'))) {
        console.log(
            startColor('redBright') +
                'ERROR: ' +
                stopColor() +
                'Missing "node_modules" folder'
        );
        process.exit(1);
    }

    // Enforce that -p and -r are not used together
    if (programOptions.patch && programOptions.reverse) {
        console.log(
            startColor('redBright') +
                'ERROR: ' +
                stopColor() +
                'Cannot use -p/--patch and -r/--reverse together.'
        );
        process.exit(1);
    }

    if (programOptions.patch || programOptions.reverse) {
        // We are applying or reversing patches
        const action = programOptions.reverse ? 'reverse' : 'apply';
        const packageNames = program.args; // Packages specified

        if (!fs.existsSync(patchDir)) {
            console.log(
                startColor('yellowBright') +
                    'WARNING: ' +
                    stopColor() +
                    'Missing "patches" folder - nothing to do'
            );
            process.exit(2);
        }

        // Build list of patches to apply/reverse
        const allPatchFiles = fs
            .readdirSync(patchDir)
            .filter((item: string) => item.endsWith('.patch'));

        let selectedPatchFiles: string[] = [];

        if (packageNames.length > 0) {
            // Filter patches for specified packages
            selectedPatchFiles = allPatchFiles.filter((patchFile) => {
                const pkg = patchFile.replace('.patch', '').split('#');
                const packageName = pkg[0].replace(/\+/g, path.sep);
                return packageNames.includes(packageName);
            });

            // Track missing packages
            packageNames.forEach((pkg) => {
                const found = selectedPatchFiles.some((patchFile) => {
                    const pkgInFile = patchFile
                        .replace('.patch', '')
                        .split('#')[0];
                    return pkgInFile === pkg.replace(/\//g, '+');
                });
                if (!found) {
                    missingPackages.push(pkg);
                }
            });

            if (selectedPatchFiles.length === 0 && missingPackages.length > 0) {
                missingPackages.forEach((pkg) => {
                    console.log(
                        startColor('yellowBright') +
                            'WARNING: ' +
                            stopColor() +
                            `No patches found for package "${pkg}".`
                    );
                });
                process.exit(0);
            }
        } else {
            // No package names specified, use all patches
            selectedPatchFiles = allPatchFiles;
        }

        // Prepare list of patches to apply/reverse
        selectedPatchFiles.forEach((patchFile) => {
            const pkg = patchFile.replace('.patch', '').split('#');
            addPatchFileIfExists(pkg[0], pkg[1]);
        });

        // Output specific missing package warnings
        if (missingPackages.length > 0) {
            missingPackages.forEach((pkg) => {
                console.log(
                    startColor('yellowBright') +
                        'WARNING: ' +
                        stopColor() +
                        `No patches found for package "${pkg}".`
                );
            });
        }

        console.log(
            `${action === 'apply' ? 'Applying' : 'Reversing'} ` +
                startColor('cyanBright') +
                patchFiles.length +
                stopColor() +
                ` patch${patchFiles.length !== 1 ? 'es' : ''}`
        );

        for (const { pkgName, version } of patchFiles) {
            try {
                await readPatch(pkgName, version, programOptions.reverse);
            } catch (err) {
                let errorMessage: string;
                if (err instanceof Error) {
                    errorMessage = err.message;
                } else {
                    errorMessage = String(err);
                }
                console.log(
                    startColor('redBright') +
                        'ERROR: ' +
                        stopColor() +
                        `Failed to ${action} patch for ${pkgName} - ${errorMessage}`
                );
            }
        }
    } else if (program.args.length > 0) {
        // Create patch for each of the provided package names
        for (const pkgName of program.args) {
            await makePatch(pkgName);
        }
    } else {
        // Default behavior: apply all patches
        if (!fs.existsSync(patchDir)) {
            console.log(
                startColor('yellowBright') +
                    'WARNING: ' +
                    stopColor() +
                    'Missing "patches" folder - nothing to do'
            );
            process.exit(2);
        }
        // Apply patches
        fs.readdirSync(patchDir).forEach((item: string) => {
            if (!item.endsWith('.patch')) return;
            const pkg = item.replace('.patch', '').split('#');
            addPatchFileIfExists(pkg[0], pkg[1]);
        });
        console.log(
            'Found ' +
                startColor('cyanBright') +
                patchFiles.length +
                stopColor() +
                ' ' +
                (patchFiles.length === 1 ? 'patch' : 'patches')
        );

        for (const { pkgName, version } of patchFiles) {
            try {
                await readPatch(pkgName, version);
            } catch (err) {
                let errorMessage: string;
                if (err instanceof Error) {
                    errorMessage = err.message;
                } else {
                    errorMessage = String(err);
                }
                console.log(
                    startColor('redBright') +
                        'ERROR: ' +
                        stopColor() +
                        `Failed to apply patch for ${pkgName} - ${errorMessage}`
                );
            }
        }
    }
})().catch((err) => {
    let errorMessage: string;
    if (err instanceof Error) {
        errorMessage = err.message;
    } else {
        errorMessage = String(err);
    }
    console.log(
        startColor('redBright') +
            'ERROR: ' +
            stopColor() +
            `Unhandled error: ${errorMessage}`
    );
    process.exit(1);
});

async function makePatch(pkgName: string): Promise<void> {
    console.log(
        'Creating patch for: ' +
            startColor('magentaBright') +
            pkgName +
            stopColor()
    );
    const cfg = getConfig(pkgName);
    if (cfg) {
        await fetchPackage(
            pkgName,
            npmTarballURL(pkgName, cfg.version),
            cfg.version
        );
    } else {
        console.log(
            startColor('redBright') +
                'ERROR: ' +
                stopColor() +
                'Could not find the URL for tarball'
        );
    }
}

// Download the tarball
async function fetchPackage(
    pkgName: string,
    url: string,
    version: string
): Promise<void> {
    console.log(
        'Fetching tarball of ' +
            startColor('whiteBright') +
            pkgName +
            stopColor() +
            ' from ' +
            startColor('green') +
            url +
            stopColor()
    );
    const dest = path.join(os.tmpdir(), pkgName);
    try {
        await pacote.extract(url, dest);
        await comparePackages(pkgName, version);
    } catch (err) {
        let errorMessage: string;

        if (err instanceof Error) {
            errorMessage = err.message;
        } else {
            errorMessage = String(err);
        }

        console.log(startColor('redBright') + errorMessage + stopColor());
        return;
    }

    try {
        await fs.promises.rm(dest, { recursive: true, force: true });
    } catch (err) {
        let errorMessage: string;

        if (err instanceof Error) {
            errorMessage = err.message;
        } else {
            errorMessage = String(err);
        }

        console.log(
            startColor('redBright') +
                'ERROR: ' +
                stopColor() +
                `Could not clean up the TEMP folder - ${errorMessage}`
        );
    }
}
