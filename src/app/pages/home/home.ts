import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-dvh px-4">
      <div class="text-center max-w-lg">
        <div class="text-6xl mb-6" aria-hidden="true">🔍</div>
        <h1 class="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          What kind of reviewer are you?
        </h1>
        <p class="text-gray-400 mb-8 text-lg">
          Enter a GitHub username to discover your code review personality
        </p>
        <form (ngSubmit)="onSubmit()" class="flex gap-3 max-w-md mx-auto">
          <label for="username-input" class="sr-only">GitHub username</label>
          <input
            id="username-input"
            data-testid="username-input"
            type="text"
            [(ngModel)]="username"
            name="username"
            placeholder="github-username"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            class="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            data-testid="discover-btn"
            type="submit"
            class="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Discover
          </button>
        </form>
        @if (validationError()) {
          <p class="text-red-400 text-sm mt-3" role="alert">{{ validationError() }}</p>
        }
        <p class="text-gray-600 text-sm mt-4">We analyze public review activity only</p>
      </div>
    </div>
  `,
})
export class HomePage {
  private readonly router = inject(Router);
  protected readonly username = signal('');
  protected readonly validationError = signal('');

  private static readonly GITHUB_USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;

  protected onSubmit(): void {
    const trimmed = this.username().trim();
    if (!trimmed) {
      this.validationError.set('Please enter a GitHub username');
      return;
    }
    if (trimmed.length > 39 || !HomePage.GITHUB_USERNAME_PATTERN.test(trimmed)) {
      this.validationError.set('Invalid GitHub username — only letters, digits, and hyphens allowed');
      return;
    }
    this.validationError.set('');
    this.router.navigate(['/reviewer', trimmed]);
  }
}
