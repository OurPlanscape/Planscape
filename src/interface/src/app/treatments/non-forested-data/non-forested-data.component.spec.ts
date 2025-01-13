import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NonForestedDataComponent } from './non-forested-data.component';
import { MockProvider, MockProviders } from 'ng-mocks';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { TreatmentsState } from '../treatments.state';
import { TreatmentsService } from '@services/treatments.service';
import { of } from 'rxjs';

describe('NonForestedDataComponent', () => {
  let component: NonForestedDataComponent;
  let fixture: ComponentFixture<NonForestedDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NonForestedDataComponent],
      providers: [
        MockProvider(DirectImpactsStateService, {
          activeStand$: of(null),
        }),
        MockProviders(TreatmentsState, TreatmentsService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NonForestedDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
