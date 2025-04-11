import { Injectable } from '@angular/core';
import { ScenarioGoal, TreatmentQuestionConfig } from '@types';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GoalOverlayService {
  constructor() {}

  private selectedQuestionSubject =
    new Subject<TreatmentQuestionConfig | null>();

  selectedQuestion$: Observable<TreatmentQuestionConfig | null> =
    this.selectedQuestionSubject.asObservable();

  private _selectedStateWideGoal$ = new BehaviorSubject<ScenarioGoal | null>(
    null
  );
  selectedStateWideGoal$ = this._selectedStateWideGoal$.asObservable();

  setQuestion(question: TreatmentQuestionConfig) {
    this.selectedQuestionSubject.next(question);
  }

  setStateWideGoal(goal: ScenarioGoal) {
    this._selectedStateWideGoal$.next(goal);
  }

  close() {
    this.selectedQuestionSubject.next(null);
    this._selectedStateWideGoal$.next(null);
  }
}
