import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllTreatableStandsToggleComponent } from './all-treatable-stands-toggle.component';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { of } from 'rxjs';

describe('AllTreatableStandsToggleComponent', () => {
  let component: AllTreatableStandsToggleComponent;
  let fixture: ComponentFixture<AllTreatableStandsToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllTreatableStandsToggleComponent],
      providers: [
        MockProvider(NewScenarioState, {
          displayAllTreatableStands$: of(false),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AllTreatableStandsToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
