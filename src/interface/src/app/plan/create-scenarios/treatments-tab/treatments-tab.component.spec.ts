import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentsTabComponent } from './treatments-tab.component';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentsService } from '@services/treatments.service';
import { MockProvider } from 'ng-mocks';
import { MatLegacySnackBarModule } from '@angular/material/legacy-snack-bar';
import { of } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

describe('TreatmentsTabComponent', () => {
  let component: TreatmentsTabComponent;
  let fixture: ComponentFixture<TreatmentsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, MatLegacySnackBarModule, MatIconModule],
      declarations: [TreatmentsTabComponent],
      providers: [
        MockProvider(TreatmentsService, {
          listTreatmentPlans: () => of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
