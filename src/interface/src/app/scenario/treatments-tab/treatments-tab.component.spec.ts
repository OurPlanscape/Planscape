import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentsTabComponent } from '@app/scenario/treatments-tab/treatments-tab.component';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentsService } from '@services/treatments.service';
import { MockProvider, MockProviders } from 'ng-mocks';
import { of } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('TreatmentsTabComponent', () => {
  let component: TreatmentsTabComponent;
  let fixture: ComponentFixture<TreatmentsTabComponent>;

  beforeEach(async () => {
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
