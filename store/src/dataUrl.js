// The shoe lists (public/brands/*/*.json) are data that changes between deploys. Browsers may hold an old copy for days, so every build
// asks for them under a new address (?v=<build id>): a phone with an old saved copy fetches the current one the next time it loads the site.
export const dataUrl = (url) => `${url}?v=${typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'}`
