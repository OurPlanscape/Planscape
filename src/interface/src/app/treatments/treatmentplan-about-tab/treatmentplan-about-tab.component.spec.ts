import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreatmentplanAboutTabComponent } from './treatmentplan-about-tab.component';
import { TreatmentsState } from '../treatments.state';
import { MockProviders } from 'ng-mocks';

describe('TreatmentplanAboutTabComponent', () => {
  let component: TreatmentplanAboutTabComponent;
  let fixture: ComponentFixture<TreatmentplanAboutTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentplanAboutTabComponent],
      providers: [MockProviders(TreatmentsState)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentplanAboutTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
