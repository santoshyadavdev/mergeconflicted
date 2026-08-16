import { TestBed } from '@angular/core/testing';
import { LoadingSteps } from './loading-steps';

describe('LoadingSteps', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSteps],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LoadingSteps);
    fixture.componentRef.setInput('username', 'octocat');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the username being analyzed', async () => {
    const fixture = TestBed.createComponent(LoadingSteps);
    fixture.componentRef.setInput('username', 'octocat');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('@octocat');
  });

  it('should render three loading steps', async () => {
    const fixture = TestBed.createComponent(LoadingSteps);
    fixture.componentRef.setInput('username', 'octocat');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const steps = el.querySelectorAll('[data-testid="loading-step"]');
    expect(steps.length).toBe(3);
  });
});
