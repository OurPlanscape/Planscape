import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentOverviewComponent } from './treatment-overview.component';
import { MockProvider } from 'ng-mocks';
import { TreatmentsService } from '@services/treatments.service';
import { RouterTestingModule } from '@angular/router/testing';

describe('TreatmentOverviewComponent', () => {
  let component: TreatmentOverviewComponent;
  let fixture: ComponentFixture<TreatmentOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentOverviewComponent, RouterTestingModule],
      providers: [MockProvider(TreatmentsService)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
