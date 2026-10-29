// A single stroke family keeps navigation and utility controls consistent.
const paths={
 enhance:'<path d="M12 7C9 5 5 5 2 6v14c3-1 7-1 10 1 3-2 7-2 10-1V6c-3-1-7-1-10 1Zm0 0v14M5 10h3m-3 4h3m8-4h3m-3 4h3M12 1v3m-5-2 1 2m9-2-1 2"/>',
 battle:'<path d="m4 3 7 7-2 2-7-7V3h2Zm16 0-7 7 2 2 7-7V3h-2ZM8 14l-5 5m0-4 6 6m7-7 5 5m0-4-6 6"/>',
 hero:'<path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/>',
 reports:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h4"/>',
 ranking:'<path d="M8 3h8v5a4 4 0 0 1-8 0V3Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v5m-4 4h8m-6-4h4v4"/>',
 locate:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
 crest:'<path d="M5 3h3v4h3V3h3v4h3V3h2v7l-3 2v6l3 3H5l3-3v-6l-3-2V3Zm3 14h8M5 10h14"/>',
 stamina:'<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
 shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/><path d="m8 12 3 3 5-6"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
};
export function uiIcon(name){return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]||paths.crest}</svg>`;}
