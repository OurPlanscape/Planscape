import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreatmentPlanAboutTabComponent } from './treatment-plan-about-tab.component';
import { TreatmentsState } from '../treatments.state';
import { MockProviders } from 'ng-mocks';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TreatmentPlanAboutTabComponent', () => {
  let component: TreatmentPlanAboutTabComponent;
  let fixture: ComponentFixture<TreatmentPlanAboutTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TreatmentPlanAboutTabComponent],
      providers: [MockProviders(TreatmentsState)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentPlanAboutTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
