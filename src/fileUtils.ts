// fileUtils.ts

import * as fs from 'fs';
import * as path from 'pathe';
import { startColor, stopColor } from './ansiUtils';

export function pathNormalize(pathName: string): string {
    return path.normalize(
        path.sep === '/'
            ? pathName.replace(/\\/g, '/')
            : pathName.replace(/\//g, '\\\\')
    );
}

export function ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

export function readFileContent(filePath: string): string {
    try {
        return fs.readFileSync(filePath, 'utf8');
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
                `Failed to read file ${filePath} - ${errorMessage}`
        );
        return '';
    }
}
