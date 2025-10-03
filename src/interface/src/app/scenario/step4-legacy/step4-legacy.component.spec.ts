import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxMaskModule } from 'ngx-mask';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Step4LegacyComponent } from './step4-legacy.component';
import { FeaturesModule } from 'src/app/features/features.module';

describe('Step4LegacyComponent', () => {
  let component: Step4LegacyComponent;
  let fixture: ComponentFixture<Step4LegacyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        BrowserAnimationsModule,
        NgxMaskModule.forRoot(),
        Step4LegacyComponent,
        FeaturesModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Step4LegacyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid max_budget if value is less than 0', () => {
    const control = component.form.get('max_budget');
    control?.setValue(-1);
    expect(control?.valid).toBeFalse();
  });

  it('should have invalid max_area if value is less than 0', () => {
    const control = component.form.get('max_area');
    control?.setValue(-1);
    expect(control?.valid).toBeFalse();
  });

  it('should have invalid max_area if less than 20% of planning area', fakeAsync(() => {
    component.maxAreaValue = 1000;
    const control = component.form.get('max_area');
    control?.setValue(100);
    fixture.detectChanges();
    tick();
    expect(control?.valid).toBeFalse();
  }));

  it('should have invalid max_area if more than 80% of planning area', fakeAsync(() => {
    component.maxAreaValue = 1000;
    const control = component.form.get('max_area');
    control?.setValue(900);
    fixture.detectChanges();
    tick();
    expect(control?.valid).toBeFalse();
  }));

  it('should show an error if the form is touched but fields are empty', fakeAsync(() => {
    component.maxAreaValue = 1000;
    const control = component.form.get('max_area');
    control?.setValue(900);
    fixture.detectChanges();
    tick();
    control?.setValue(null);
    fixture.detectChanges();
    tick();
    expect(component.form.valid).toBeFalse();
  }));
});
