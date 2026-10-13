import { RenderMode, ServerRoute } from '@angular/ssr';

// The admin panel depends on a token in localStorage, so every page renders in the browser.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
