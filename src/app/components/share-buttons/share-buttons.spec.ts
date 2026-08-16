import { TestBed } from '@angular/core/testing';
import { ShareButtons } from './share-buttons';

describe('ShareButtons', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareButtons],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ShareButtons);
    fixture.componentRef.setInput('username', 'octocat');
    fixture.componentRef.setInput('archetype', 'The Nitpicker');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render copy link button', async () => {
    const fixture = TestBed.createComponent(ShareButtons);
    fixture.componentRef.setInput('username', 'octocat');
    fixture.componentRef.setInput('archetype', 'The Nitpicker');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const copyBtn = el.querySelector('[data-testid="copy-link"]');
    expect(copyBtn).toBeTruthy();
  });

  it('should render X share link', async () => {
    const fixture = TestBed.createComponent(ShareButtons);
    fixture.componentRef.setInput('username', 'octocat');
    fixture.componentRef.setInput('archetype', 'The Nitpicker');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const xLink = el.querySelector('[data-testid="share-x"]') as HTMLAnchorElement;
    expect(xLink).toBeTruthy();
    expect(xLink.href).toContain('x.com/intent');
  });

  it('should render LinkedIn share link', async () => {
    const fixture = TestBed.createComponent(ShareButtons);
    fixture.componentRef.setInput('username', 'octocat');
    fixture.componentRef.setInput('archetype', 'The Nitpicker');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const liLink = el.querySelector('[data-testid="share-linkedin"]') as HTMLAnchorElement;
    expect(liLink).toBeTruthy();
    expect(liLink.href).toContain('linkedin.com');
  });
});
