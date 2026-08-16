import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-steps',
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div class="text-6xl animate-pulse" aria-hidden="true">🧠</div>
      <h2 class="text-2xl font-semibold">
        Analyzing <span class="text-purple-400">{{ '@' + username() }}</span>'s reviews...
      </h2>
      <p class="text-gray-400">Our AI is reading through your review history</p>
      <div class="flex flex-col gap-3 mt-4" role="status" aria-label="Analysis progress">
        @for (step of steps; track step.label) {
          <div class="flex items-center gap-3" data-testid="loading-step">
            <span [class]="step.done ? 'text-green-400' : 'text-yellow-400 animate-spin'">
              {{ step.done ? '✓' : '⟳' }}
            </span>
            <span [class]="step.done ? 'text-gray-400' : 'text-white'">
              {{ step.label }}
            </span>
          </div>
        }
      </div>
    </div>
  `,
})
export class LoadingSteps {
  readonly username = input.required<string>();

  protected readonly steps = [
    { label: 'Fetching GitHub activity', done: true },
    { label: 'Analyzing review patterns', done: true },
    { label: 'Generating personality...', done: false },
  ];
}
