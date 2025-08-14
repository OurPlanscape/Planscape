import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxMaskModule } from 'ngx-mask';
import { TreatmentTargetStepComponent } from './treatment-target-step.component';

describe('TreatmentTargetStepComponent', () => {
  let component: TreatmentTargetStepComponent;
  let fixture: ComponentFixture<TreatmentTargetStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        NgxMaskModule.forRoot(),
        TreatmentTargetStepComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentTargetStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
