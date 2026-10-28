// Trusted release publisher key. Private signing material is never shipped.
export const UPDATE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAznCmOeV4I5Z0noJSHpD0bCGYpFkJl03tUVGiE892y9E=\n-----END PUBLIC KEY-----\n";
export const canonicalRelease=release=>JSON.stringify(Object.fromEntries(Object.keys(release).sort().map(key=>[key,release[key]])));
export function validateRelease(release,version,arch){
 if(!release||release.version!==version||typeof release.gameVersion!=='string'||!release.gameVersion||release.platform!=='win32'||release.arch!==arch||!Number.isInteger(release.protocolVersion)||!/^[a-f0-9]{64}$/.test(release.sha256)||!Number.isSafeInteger(release.size)||release.size<1||release.size>1073741824||!/^[A-Za-z0-9._-]+\.zip$/.test(release.file)||!/^[A-Za-z0-9._-]+$/.test(release.folder)||['.','..'].includes(release.folder))throw Error('更新版本信息不正确');
 return release;
}
