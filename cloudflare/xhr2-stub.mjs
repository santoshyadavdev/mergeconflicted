// Angular's server HttpClient falls back to `xhr2`, which is Node-only. The app uses
// `provideHttpClient(withFetch())`, so this stub only exists to satisfy the bundler.
export default class XMLHttpRequest {
  constructor() {
    throw new Error('xhr2 is not available on Cloudflare Workers. Use provideHttpClient(withFetch()).');
  }
}
