import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TreatmentPlansListComponent } from './treatment-plans-list.component';
import { ActivatedRoute } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { of, Subject } from 'rxjs';
import { AuthService, WebSocketService } from '@app/services';
import { MOCK_PLAN } from '@services/mocks';
import { TreatmentsService } from '@app/services/treatments.service';
import {
  TREATMENT_PLAN_LIST_EVENTS,
  TreatmentPlan,
  WorkspaceEvent,
} from '@app/types';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

describe('TreatmentPlansListComponent', () => {
  let component: TreatmentPlansListComponent;
  let fixture: ComponentFixture<TreatmentPlansListComponent>;
  let updates$: Subject<WorkspaceEvent | null>;
  let scenarioUpdates$: jasmine.Spy;
  let listTreatmentPlans: jasmine.Spy;
  let plans: TreatmentPlan[];
  let shown: (TreatmentPlan[] | null)[];

  /** One event on the channel of this scenario. */
  function somethingChanged() {
    updates$.next({ type: 'impacts.treatment_plan.created' });
  }

  beforeEach(async () => {
    updates$ = new Subject<WorkspaceEvent | null>();
    scenarioUpdates$ = jasmine
      .createSpy('scenarioUpdates$')
      .and.returnValue(updates$);
    plans = [];
    listTreatmentPlans = jasmine
      .createSpy('listTreatmentPlans')
      .and.callFake(() => of(plans));
    shown = [];

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
        TreatmentPlansListComponent,
      ],
      providers: [
        MockProvider(AuthService),
        MockProvider(TreatmentsService, { listTreatmentPlans }),
        MockProvider(WebSocketService, { scenarioUpdates$ }),
        { provide: ActivatedRoute, useValue: { firstChild: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentPlansListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('scenarioId', 7);
    fixture.componentRef.setInput('planningArea', MOCK_PLAN);
    fixture.detectChanges();
  });

  /** The list the template renders, collected as it changes. */
  function watchTreatments() {
    component.treatments$.subscribe((list) => shown.push(list));
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reads the treatment plans once to start with', () => {
    watchTreatments();

    expect(listTreatmentPlans).toHaveBeenCalledOnceWith(7, '-created_at');
    // the template subscribed first, so shareReplay hands us what it holds
    expect(shown).toEqual([[]]);
  });

  it('listens on the channel of its scenario', () => {
    watchTreatments();

    expect(scenarioUpdates$).toHaveBeenCalledWith(
      7,
      TREATMENT_PLAN_LIST_EVENTS
    );
  });

  it('reads them again when one of them reports a change', () => {
    watchTreatments();
    plans = [{ id: 1, name: 'A plan' } as TreatmentPlan];

    somethingChanged();

    expect(listTreatmentPlans).toHaveBeenCalledTimes(2);
    expect(shown[shown.length - 1]).toEqual(plans);
  });

  it('listens again, in the new order, when the sorting changes', () => {
    watchTreatments();

    component.handleSortChange();

    expect(listTreatmentPlans).toHaveBeenCalledWith(7, 'created_at');
    expect(scenarioUpdates$).toHaveBeenCalledTimes(2);
  });
});
