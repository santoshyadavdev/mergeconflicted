import { Component, computed, inject, input, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-share-buttons',
  template: `
    <div class="flex flex-wrap gap-3 justify-center">
      <button
        data-testid="copy-link"
        (click)="copyLink()"
        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        [attr.aria-label]="'Copy link to ' + username() + ' reviewer profile'"
      >
        {{ copied() ? '✓ Copied!' : '🔗 Copy Link' }}
      </button>
      <a
        data-testid="share-x"
        [href]="xShareUrl()"
        target="_blank"
        rel="noopener noreferrer"
        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors no-underline text-white"
        aria-label="Share on X"
      >
        𝕏 Share
      </a>
      <a
        data-testid="share-linkedin"
        [href]="linkedInShareUrl()"
        target="_blank"
        rel="noopener noreferrer"
        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors no-underline text-white"
        aria-label="Share on LinkedIn"
      >
        in Share
      </a>
    </div>
  `,
})
export class ShareButtons {
  readonly username = input.required<string>();
  readonly archetype = input.required<string>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  protected readonly copied = signal(false);

  protected readonly profileUrl = computed(() => {
    const origin = isPlatformBrowser(this.platformId)
      ? this.document.location.origin
      : 'https://mergeconflicted.dev';
    return `${origin}/reviewer/${this.username()}`;
  });

  protected readonly xShareUrl = computed(() => {
    const text = `I'm "${this.archetype()}" on MergeConflicted! Discover your code reviewer personality:`;
    return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(this.profileUrl())}`;
  });

  protected readonly linkedInShareUrl = computed(() => {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.profileUrl())}`;
  });

  protected copyLink(): void {
    if (isPlatformBrowser(this.platformId)) {
      navigator.clipboard.writeText(this.profileUrl()).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }
}
