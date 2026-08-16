import { TestBed } from '@angular/core/testing';
import { PersonalityCard } from './personality-card';
import { ReviewerPersonality, GitHubUserProfile } from '../../models/reviewer.model';

const mockPersonality: ReviewerPersonality = {
  archetype: 'The Nitpicker',
  emoji: '🔍',
  tagline: 'No detail escapes my review',
  description: 'You examine every line with surgical precision.',
  strengths: ['Thorough analysis', 'Catches edge cases', 'Consistent standards'],
  funFacts: ['Reviews most on Tuesdays', 'Favorite word: "nit"'],
  reviewStyle: 'Meticulous and detail-oriented',
  stats: {
    reviewsAnalyzed: 142,
    approvalRate: '34%',
    avgCommentLength: 280,
    mostActiveDay: 'Tuesday',
  },
};

const mockProfile: GitHubUserProfile = {
  login: 'octocat',
  name: 'The Octocat',
  avatarUrl: 'https://github.com/octocat.png',
  bio: 'GitHub mascot',
  publicRepos: 8,
};

describe('PersonalityCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonalityCard],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the archetype name', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('The Nitpicker');
  });

  it('should display the emoji', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('🔍');
  });

  it('should display the tagline', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No detail escapes my review');
  });

  it('should display the username', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('@octocat');
  });

  it('should display stats', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('142');
    expect(el.textContent).toContain('34%');
  });

  it('should display strengths', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Thorough analysis');
  });

  it('should display fun facts', async () => {
    const fixture = TestBed.createComponent(PersonalityCard);
    fixture.componentRef.setInput('personality', mockPersonality);
    fixture.componentRef.setInput('profile', mockProfile);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Reviews most on Tuesdays');
  });
});
