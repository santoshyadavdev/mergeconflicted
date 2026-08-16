import { Component, computed, input } from '@angular/core';
import { ReviewerPersonality, GitHubUserProfile } from '../../models/reviewer.model';

@Component({
  selector: 'app-personality-card',
  template: `
    <!-- Hero Card -->
    <div class="text-center p-8 bg-gradient-to-br from-gray-900 to-indigo-950 rounded-2xl mb-6">
      <div class="text-6xl mb-2" aria-hidden="true">{{ personality().emoji }}</div>
      <h1 class="text-3xl font-bold text-white mb-1">{{ personality().archetype }}</h1>
      <p class="text-gray-400 italic">"{{ personality().tagline }}"</p>
      <div class="flex items-center justify-center gap-2 mt-4">
        <img
          [src]="profile().avatarUrl"
          [alt]="'Avatar of ' + profile().login"
          class="w-8 h-8 rounded-full border-2 border-green-400"
          width="32"
          height="32"
        />
        <span class="text-gray-400">{{ '@' + profile().login }}</span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-3 gap-3 mb-6">
      @for (stat of statsDisplay(); track stat.label) {
        <div class="text-center p-4 bg-gray-800 rounded-xl">
          <div class="text-2xl font-bold text-white">{{ stat.value }}</div>
          <div class="text-xs text-gray-400 mt-1">{{ stat.label }}</div>
        </div>
      }
    </div>

    <!-- Strengths & Fun Facts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
      <div class="p-5 bg-green-950/40 border border-green-900/50 rounded-xl">
        <h3 class="font-semibold text-sm mb-3 text-green-400">💪 Strengths</h3>
        <ul class="space-y-1 text-sm text-gray-300">
          @for (s of personality().strengths; track s) {
            <li>• {{ s }}</li>
          }
        </ul>
      </div>
      <div class="p-5 bg-amber-950/40 border border-amber-900/50 rounded-xl">
        <h3 class="font-semibold text-sm mb-3 text-amber-400">🎲 Fun Facts</h3>
        <ul class="space-y-1 text-sm text-gray-300">
          @for (f of personality().funFacts; track f) {
            <li>• {{ f }}</li>
          }
        </ul>
      </div>
    </div>

    <!-- Review Style -->
    <div class="p-5 bg-gray-800 rounded-xl mb-6">
      <h3 class="font-semibold text-sm mb-2 text-purple-400">🎯 Review Style</h3>
      <p class="text-sm text-gray-300">{{ personality().reviewStyle }}</p>
    </div>

    <!-- Description -->
    <div class="p-5 bg-gray-800 rounded-xl">
      <h3 class="font-semibold text-sm mb-2 text-blue-400">📝 About This Reviewer</h3>
      <p class="text-sm text-gray-300">{{ personality().description }}</p>
    </div>
  `,
})
export class PersonalityCard {
  readonly personality = input.required<ReviewerPersonality>();
  readonly profile = input.required<GitHubUserProfile>();

  protected readonly statsDisplay = computed(() => [
    { value: String(this.personality().stats.reviewsAnalyzed), label: 'Reviews' },
    { value: this.personality().stats.approvalRate, label: 'Approval Rate' },
    { value: String(this.personality().stats.avgCommentLength), label: 'Avg Comment Len' },
  ]);
}
