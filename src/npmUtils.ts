// npmUtils.ts

import { getScopelessName, removeBuildMetadataFromVersion } from './utils';

export function npmTarballURL(
    pkgName: string,
    pkgVersion: string,
    registryURL?: string
): string {
    let registry: string;
    if (registryURL) {
        registry = registryURL.endsWith('/') ? registryURL : registryURL + '/';
    } else {
        registry = 'https://registry.npmjs.org/';
    }

    const scopelessName = getScopelessName(pkgName);
    return `${registry}${pkgName}/-/${scopelessName}-${removeBuildMetadataFromVersion(
        pkgVersion
    )}.tgz`;
}
