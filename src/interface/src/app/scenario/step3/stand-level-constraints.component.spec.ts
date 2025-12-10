import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StandLevelConstraintsComponent } from './stand-level-constraints.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxMaskModule } from 'ngx-mask';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '../new-scenario.state';
import { BehaviorSubject } from 'rxjs';

describe('StandLevelConstraintsComponent', () => {
  let component: StandLevelConstraintsComponent;
  let fixture: ComponentFixture<StandLevelConstraintsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        StandLevelConstraintsComponent,
        BrowserAnimationsModule,
        ReactiveFormsModule,
        NgxMaskModule.forRoot(),
      ],
      providers: [
        MockProvider(NewScenarioState),
        MockProvider(NewScenarioState, {
          scenarioConfig$: new BehaviorSubject({}),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StandLevelConstraintsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid max_slope if value is less than 0', () => {
    const control = component.form.get('max_slope');
    control?.setValue(-1);
    expect(control?.valid).toBeFalse();
    expect(control?.hasError('min')).toBeTrue();
  });

  it('should have invalid max_slope if value is greater than 100', () => {
    const control = component.form.get('max_slope');
    control?.setValue(101);
    expect(control?.valid).toBeFalse();
    expect(control?.hasError('max')).toBeTrue();
  });

  it('should have valid max_slope if value is within range', () => {
    const control = component.form.get('max_slope');
    control?.setValue(50);
    expect(control?.valid).toBeTrue();
  });

  it('should have invalid min_distance_from_road if value is less than 0', () => {
    const control = component.form.get('min_distance_from_road');
    control?.setValue(-10);
    expect(control?.valid).toBeFalse();
    expect(control?.hasError('min')).toBeTrue();
  });

  it('should have invalid min_distance_from_road if value is greater than 100000', () => {
    const control = component.form.get('min_distance_from_road');
    control?.setValue(100001);
    expect(control?.valid).toBeFalse();
    expect(control?.hasError('max')).toBeTrue();
  });

  it('should have valid min_distance_from_road if value is within range', () => {
    const control = component.form.get('min_distance_from_road');
    control?.setValue(500);
    expect(control?.valid).toBeTrue();
  });

  it('should have form invalid if one of the fields is invalid', () => {
    component.form.get('max_slope')?.setValue(50);
    component.form.get('min_distance_from_road')?.setValue(100001);
    expect(component.form.valid).toBeFalse();
  });

  it('should have form valid if both fields are valid', () => {
    component.form.get('max_slope')?.setValue(10);
    component.form.get('min_distance_from_road')?.setValue(1000);
    expect(component.form.valid).toBeTrue();
  });
});
