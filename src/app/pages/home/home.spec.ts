import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { HomePage } from './home';

describe('HomePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([{ path: 'reviewer/:username', component: HomePage }])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HomePage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have a username input field', async () => {
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input[data-testid="username-input"]');
    expect(input).toBeTruthy();
  });

  it('should have a discover button', async () => {
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button[data-testid="discover-btn"]');
    expect(button).toBeTruthy();
  });

  it('should navigate to reviewer page on submit', async () => {
    const fixture = TestBed.createComponent(HomePage);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input[data-testid="username-input"]') as HTMLInputElement;
    input.value = 'octocat';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const button = el.querySelector('button[data-testid="discover-btn"]') as HTMLButtonElement;
    button.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/reviewer', 'octocat']);
  });

  it('should not navigate when username is empty', async () => {
    const fixture = TestBed.createComponent(HomePage);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button[data-testid="discover-btn"]') as HTMLButtonElement;
    button.click();

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
