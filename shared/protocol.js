// Increase this when an API, command or snapshot change breaks older clients.
export const PROTOCOL_VERSION=3;
// Client/server compatibility version, not a build or release counter.
// Bump only when combat rules, shared data or other server-facing behavior would
// become inconsistent with existing clients. UI, art, launcher, deployment and
// documentation-only changes keep this version; builds/packages never bump it.
export const GAME_VERSION='0.6.0';
// Server and desktop releases share one version; publish both together.
export const SERVER_VERSION='0.6.1';
// Desktop release version must match SERVER_VERSION.
export const CLIENT_VERSION='0.6.1';
// Diagnostic ruleset label; changing this alone does not require a client update.
export const RULESET_REVISION='ally-approach-skill-inspection-20261030';
export const UPDATE_REQUIRED_CODE='CLIENT_UPDATE_REQUIRED';
