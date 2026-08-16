import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReviewAnalysisResponse } from '../models/reviewer.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  getReviewerPersonality(
    username: string,
    forceRefresh = false,
  ): Observable<ReviewAnalysisResponse> {
    const params = forceRefresh ? '?refresh=true' : '';
    return this.http.get<ReviewAnalysisResponse>(
      `/api/review/${encodeURIComponent(username)}${params}`,
    );
  }
}
