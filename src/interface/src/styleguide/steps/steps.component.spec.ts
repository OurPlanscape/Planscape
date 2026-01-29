import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { StepsComponent } from './steps.component';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { Component, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { of, throwError } from 'rxjs';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { MockProvider } from 'ng-mocks';

@Component({
  selector: 'app-test-host',
  template: `
    <sg-steps [save]="saveFn">
      <cdk-step>Step 1</cdk-step>
      <cdk-step [stepControl]="form">Step 2</cdk-step>
      <cdk-step>Step 3</cdk-step>
    </sg-steps>
  `,
  standalone: true,
  imports: [StepsComponent, CdkStepperModule, ReactiveFormsModule],
})
class TestHostComponent {
  @ViewChild(StepsComponent) stepsComponent!: StepsComponent<any>;
  form = new FormGroup({
    name: new FormControl('', Validators.required),
  });
  saveFn?: (data: any) => any;
}

describe('StepsComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          viewedDataLayer$: of(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    tick();
    host = fixture.componentInstance;
  }));

  function setStep(index: number) {
    host.stepsComponent.selectedIndex = index;
    fixture.detectChanges();
    tick();
  }

  it('should go to next step if stepControl is not present', fakeAsync(() => {
    setStep(0);
    expect(host.stepsComponent.selectedIndex).toBe(0);
    host.stepsComponent.goNext();
    tick();
    expect(host.stepsComponent.selectedIndex).toBe(1);
  }));

  it('should go to next step if control is valid and no saveFn is defined', fakeAsync(() => {
    host.form.get('name')?.setValue('valid');
    setStep(1);
    host.stepsComponent.goNext();
    tick();
    expect(host.stepsComponent.selectedIndex).toBe(2);
  }));

  it('should call saveFn and go to next step on success', fakeAsync(() => {
    const saveSpy = jasmine.createSpy().and.returnValue(of(true));
    host.saveFn = saveSpy;
    host.form.get('name')?.setValue('saved');
    fixture.detectChanges();
    setStep(1);
    host.stepsComponent.goNext();
    tick();
    expect(saveSpy).toHaveBeenCalledWith({ name: 'saved' });
    expect(host.stepsComponent.selectedIndex).toBe(2);
    expect(host.stepsComponent.savingStep).toBeFalse();
  }));

  it('should set error on control if saveFn fails', fakeAsync(() => {
    const error = new Error('fail');
    host.saveFn = jasmine.createSpy().and.returnValue(throwError(() => error));
    host.form.get('name')?.setValue('try');
    fixture.detectChanges();
    setStep(1);
    host.stepsComponent.goNext();
    tick();
    expect(host.form.errors).toEqual({ invalid: 'fail' });
    expect(host.stepsComponent.selectedIndex).toBe(1);
    expect(host.stepsComponent.savingStep).toBeFalse();
  }));

  it('should mark control as dirty if invalid', fakeAsync(() => {
    setStep(1); // move to step with a form

    const stepControl = host.stepsComponent.selected?.stepControl;
    expect(stepControl).toBeDefined();

    if (stepControl) {
      stepControl.setValue({ name: '' }); // ✅ correct structure
      stepControl.markAsPristine();
      stepControl.updateValueAndValidity();

      expect(stepControl.valid).toBeFalse();
      expect(stepControl.touched).toBeFalse();

      host.stepsComponent.goNext();
      tick();

      expect(stepControl.touched).toBeTrue();
      expect(host.stepsComponent.selectedIndex).toBe(1);
    } else {
      fail('Expected stepControl to be a FormGroup');
    }
  }));

  it('should go back to previous step', fakeAsync(() => {
    setStep(1);
    host.stepsComponent.goBack();
    tick();
    expect(host.stepsComponent.selectedIndex).toBe(0);
  }));
});
