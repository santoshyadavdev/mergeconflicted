import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
  },
  {
    path: 'reviewer/:username',
    loadComponent: () => import('./pages/reviewer/reviewer').then((m) => m.ReviewerPage),
  },
];
