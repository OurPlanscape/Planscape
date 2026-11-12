import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentsTabComponent } from './treatments-tab.component';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentsService } from '@services/treatments.service';
import { MockProvider, MockProviders } from 'ng-mocks';
import { of, Subject } from 'rxjs';
import {
  TREATMENT_PLAN_LIST_EVENTS,
  TreatmentPlan,
  WorkspaceEvent,
} from '@types';
import { WebSocketService } from '@services';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('TreatmentsTabComponent', () => {
  let component: TreatmentsTabComponent;
  let fixture: ComponentFixture<TreatmentsTabComponent>;
  let updates$: Subject<WorkspaceEvent | null>;
  let scenarioUpdates$: jasmine.Spy;
  let listTreatmentPlans: jasmine.Spy;
  let plans: TreatmentPlan[];

  /** One event on the channel of this scenario. */
  function somethingChanged() {
    updates$.next({ type: 'impacts.treatment_plan.status_changed' });
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

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        MatSnackBarModule,
        MatIconModule,
        TreatmentsTabComponent,
      ],
      declarations: [],
      providers: [
        MockProviders(MatDialog),
        MockProvider(TreatmentsService, { listTreatmentPlans }),
        MockProvider(WebSocketService, { scenarioUpdates$ }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentsTabComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('scenarioId', 7);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reads the treatment plans once to start with', () => {
    expect(listTreatmentPlans).toHaveBeenCalledOnceWith(7);
  });

  it('listens on the channel of its scenario', () => {
    expect(scenarioUpdates$).toHaveBeenCalledWith(
      7,
      TREATMENT_PLAN_LIST_EVENTS
    );
  });

  it('reads them again when one of them reports a change', () => {
    plans = [{ id: 1, name: 'A plan' } as TreatmentPlan];

    somethingChanged();

    expect(listTreatmentPlans).toHaveBeenCalledTimes(2);
    expect(component.treatments).toEqual(plans);
    expect(component.state).toBe('loaded');
  });

  it('stops listening once it goes away', () => {
    fixture.destroy();

    somethingChanged();

    expect(listTreatmentPlans).toHaveBeenCalledTimes(1);
  });
});
