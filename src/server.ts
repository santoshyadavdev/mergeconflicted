import { AngularAppEngine } from '@angular/ssr';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const angularApp = new AngularAppEngine();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/data') {
      return new Response(
        JSON.stringify({ message: 'This is the root endpoint. You can define your API endpoints here.' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    const angularResponse = await angularApp.handle(request);
    if (angularResponse) {
      return angularResponse;
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
