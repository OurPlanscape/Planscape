import { Injectable } from '@angular/core';
import { TreatmentQuestionConfig } from '@types';
import { map, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GoalOverlayService {
  constructor() {}

  private selectedQuestionSubject =
    new Subject<TreatmentQuestionConfig | null>();

  selectedQuestion$ = this.selectedQuestionSubject.asObservable();
  showOverlay$ = this.selectedQuestion$.pipe(map((q) => !!q));

  setQuestion(question: TreatmentQuestionConfig) {
    this.selectedQuestionSubject.next(question);
  }

  close() {
    this.selectedQuestionSubject.next(null);
  }
}
