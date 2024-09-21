// utils.ts

export function removeBuildMetadataFromVersion(version: string): string {
    const plusPos = version.indexOf('+');
    if (plusPos === -1) return version;
    return version.substring(0, plusPos);
}

export function getScopelessName(name: string): string {
    if (name[0] !== '@') return name;
    return name.split('/')[1];
}
