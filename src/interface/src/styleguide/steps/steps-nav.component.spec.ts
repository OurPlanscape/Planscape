import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { Component, ViewChild } from '@angular/core';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { StepsNavComponent } from './steps-nav.component';
import { StepsComponent } from './steps.component';

@Component({
  selector: 'app-test-host',
  template: `
    <sg-steps [linear]="linear">
      <cdk-step
        [label]="'First Step'"
        [editable]="editableSteps[0]"
        [completed]="completedSteps[0]">
        <p>Step 1 content</p>
        <sg-steps-nav [allowNavigation]="allowNavigation"></sg-steps-nav>
      </cdk-step>
      <cdk-step
        [label]="'Second Step'"
        [editable]="editableSteps[1]"
        [completed]="completedSteps[1]">
        <p>Step 2 content</p>
        <sg-steps-nav [allowNavigation]="allowNavigation"></sg-steps-nav>
      </cdk-step>
      <cdk-step
        [label]="'Third Step'"
        [optional]="true"
        [editable]="editableSteps[2]"
        [completed]="completedSteps[2]">
        <p>Step 3 content</p>
        <sg-steps-nav [allowNavigation]="allowNavigation"></sg-steps-nav>
      </cdk-step>
      <cdk-step
        [label]="'Fourth Step'"
        [editable]="editableSteps[3]"
        [completed]="completedSteps[3]">
        <p>Step 4 content</p>
        <sg-steps-nav [allowNavigation]="allowNavigation"></sg-steps-nav>
      </cdk-step>
    </sg-steps>
  `,
  standalone: true,
  imports: [StepsComponent, StepsNavComponent, CdkStepperModule],
})
class TestHostComponent {
  @ViewChild(StepsComponent) stepper!: StepsComponent<any>;
  linear = false;
  allowNavigation = true;
  editableSteps = [true, true, true, true];
  completedSteps = [false, false, false, false];
}

describe('StepsNavComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let navElement: HTMLElement;

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    tick();
    host = fixture.componentInstance;
    navElement = fixture.nativeElement;
  }));

  it('should create', () => {
    expect(host.stepper).toBeTruthy();
  });

  it('should display all steps from parent stepper', fakeAsync(() => {
    const stepItems = navElement.querySelectorAll('.step-item');
    expect(stepItems.length).toBe(4);
  }));

  it('should mark first step as current initially', fakeAsync(() => {
    const firstStep = navElement.querySelector('.step-item');
    expect(firstStep?.classList.contains('current')).toBeTrue();
  }));

  it('should display step labels correctly', fakeAsync(() => {
    const stepLabels = navElement.querySelectorAll('.step-label');
    expect(stepLabels[0].textContent?.trim()).toBe('First Step');
    expect(stepLabels[1].textContent?.trim()).toBe('Second Step');
    expect(stepLabels[2].textContent?.trim()).toBe('Third Step');
    expect(stepLabels[3].textContent?.trim()).toBe('Fourth Step');
  }));

  it('should display step numbers correctly', fakeAsync(() => {
    const stepNumbers = navElement.querySelectorAll('.step-number');
    expect(stepNumbers[0].textContent?.trim()).toBe('1');
    expect(stepNumbers[1].textContent?.trim()).toBe('2');
    expect(stepNumbers[2].textContent?.trim()).toBe('3');
    expect(stepNumbers[3].textContent?.trim()).toBe('4');
  }));

  it('should show checkmark for completed steps that are not current', fakeAsync(() => {
    host.completedSteps[0] = true;
    host.stepper.selectedIndex = 1;
    fixture.detectChanges();
    tick();

    const firstStep = navElement.querySelector('.step-item');
    const checkmark = firstStep?.querySelector('mat-icon.checkmark');
    const stepNumber = firstStep?.querySelector('.step-number');

    expect(checkmark).toBeTruthy();
    expect(checkmark?.textContent?.trim()).toBe('check');
    expect(stepNumber).toBeFalsy();
  }));

  it('should show step number for current step even if completed', fakeAsync(() => {
    host.completedSteps[0] = true;
    host.stepper.selectedIndex = 0;
    fixture.detectChanges();
    tick();

    const firstStep = navElement.querySelector('.step-item');
    const checkmark = firstStep?.querySelector('mat-icon.checkmark');
    const stepNumber = firstStep?.querySelector('.step-number');

    expect(checkmark).toBeFalsy();
    expect(stepNumber).toBeTruthy();
    expect(stepNumber?.textContent?.trim()).toBe('1');
  }));

  it('should navigate to clicked step when allowNavigation is true', fakeAsync(() => {
    host.completedSteps[0] = true;
    fixture.detectChanges();
    tick();

    const secondStep = navElement.querySelectorAll(
      '.step-item'
    )[1] as HTMLElement;
    secondStep.click();
    fixture.detectChanges();
    tick();

    expect(host.stepper.selectedIndex).toBe(1);
  }));

  it('should not navigate when allowNavigation is false', fakeAsync(() => {
    host.allowNavigation = false;
    host.completedSteps[0] = true;
    fixture.detectChanges();
    tick();

    const secondStep = navElement.querySelectorAll(
      '.step-item'
    )[1] as HTMLElement;
    secondStep.click();
    fixture.detectChanges();
    tick();

    expect(host.stepper.selectedIndex).toBe(0);
  }));

  it('should apply correct CSS classes based on step state', fakeAsync(() => {
    host.completedSteps[0] = true;
    host.stepper.selectedIndex = 1;
    fixture.detectChanges();
    tick();

    const steps = navElement.querySelectorAll('.step-item');

    // First step should be completed
    expect(steps[0].classList.contains('completed')).toBeTrue();
    expect(steps[0].classList.contains('current')).toBeFalse();

    // Second step should be current
    expect(steps[1].classList.contains('current')).toBeTrue();
    expect(steps[1].classList.contains('completed')).toBeFalse();

    // Third step should be future
    expect(steps[2].classList.contains('future')).toBeTrue();
  }));

  it('should show connectors between steps', fakeAsync(() => {
    const connectors = navElement.querySelectorAll('.step-connector');
    expect(connectors.length).toBe(3); // 4 steps = 3 connectors
  }));

  it('should mark steps as clickable based on completion', fakeAsync(() => {
    host.completedSteps[0] = true;
    fixture.detectChanges();
    tick();

    const steps = navElement.querySelectorAll('.step-item');
    expect(steps[0].classList.contains('clickable')).toBeTrue();
    expect(steps[1].classList.contains('clickable')).toBeTrue();
  }));

  describe('linear stepper mode', () => {
    beforeEach(fakeAsync(() => {
      host.linear = true;
      fixture.detectChanges();
      tick();
    }));

    it('should only allow navigation to completed steps in linear mode', fakeAsync(() => {
      host.completedSteps[0] = true;
      host.stepper.selectedIndex = 0;
      fixture.detectChanges();
      tick();

      // Try to navigate to step 2 (index 1) which is not completed
      const thirdStep = navElement.querySelectorAll(
        '.step-item'
      )[2] as HTMLElement;
      thirdStep.click();
      fixture.detectChanges();
      tick();

      expect(host.stepper.selectedIndex).toBe(0); // Should remain on step 0
    }));

    it('should allow navigation to current and previous completed steps', fakeAsync(() => {
      host.completedSteps[0] = true;
      host.completedSteps[1] = true;
      host.stepper.selectedIndex = 2;
      fixture.detectChanges();
      tick();

      // Navigate back to step 1
      const secondStep = navElement.querySelectorAll(
        '.step-item'
      )[1] as HTMLElement;
      secondStep.click();
      fixture.detectChanges();
      tick();

      expect(host.stepper.selectedIndex).toBe(1);
    }));
  });

  describe('non-linear stepper mode', () => {
    beforeEach(fakeAsync(() => {
      host.linear = false;
      fixture.detectChanges();
      tick();
    }));

    it('should allow navigation to editable steps', fakeAsync(() => {
      host.editableSteps[2] = true;
      host.stepper.selectedIndex = 0;
      fixture.detectChanges();
      tick();

      const thirdStep = navElement.querySelectorAll(
        '.step-item'
      )[2] as HTMLElement;
      thirdStep.click();
      fixture.detectChanges();
      tick();

      expect(host.stepper.selectedIndex).toBe(2);
    }));

    it('should allow navigation to optional steps', fakeAsync(() => {
      host.stepper.selectedIndex = 0;
      fixture.detectChanges();
      tick();

      // Third step is optional
      const thirdStep = navElement.querySelectorAll(
        '.step-item'
      )[2] as HTMLElement;
      thirdStep.click();
      fixture.detectChanges();
      tick();

      expect(host.stepper.selectedIndex).toBe(2);
    }));
  });

  describe('component methods', () => {
    let nav: StepsNavComponent;

    beforeEach(fakeAsync(() => {
      // Get the nav component from the first step
      const stepContent = fixture.nativeElement.querySelector('sg-steps-nav');
      nav = stepContent
        ? fixture.debugElement.query(
            (el) => el.componentInstance instanceof StepsNavComponent
          )?.componentInstance
        : null;

      expect(nav).toBeTruthy();
    }));

    it('should return correct step state', fakeAsync(() => {
      host.stepper.selectedIndex = 1;
      fixture.detectChanges();
      tick();

      expect(nav.getStepState(0)).toBe('completed');
      expect(nav.getStepState(1)).toBe('current');
      expect(nav.getStepState(2)).toBe('future');
    }));

    it('should correctly identify completed steps', fakeAsync(() => {
      host.completedSteps[0] = true;
      fixture.detectChanges();
      tick();

      expect(nav.isStepCompleted(0)).toBeTrue();
      expect(nav.isStepCompleted(1)).toBeFalse();
    }));

    it('should correctly identify current step', fakeAsync(() => {
      host.stepper.selectedIndex = 1;
      fixture.detectChanges();
      tick();

      expect(nav.isStepCurrent(0)).toBeFalse();
      expect(nav.isStepCurrent(1)).toBeTrue();
      expect(nav.isStepCurrent(2)).toBeFalse();
    }));

    it('should calculate latest completed step', fakeAsync(() => {
      host.completedSteps[0] = true;
      host.completedSteps[1] = true;
      fixture.detectChanges();
      tick();

      expect(nav.latestStep).toBe(1);
    }));

    it('should return step labels', fakeAsync(() => {
      expect(nav.getStepLabel(0)).toBe('First Step');
      expect(nav.getStepLabel(1)).toBe('Second Step');
    }));

    it('should determine step clickability based on allowNavigation', fakeAsync(() => {
      host.completedSteps[0] = true;
      host.allowNavigation = true;
      fixture.detectChanges();
      tick();

      expect(nav.isStepClickable(0)).toBeTrue();
      expect(nav.isStepClickable(1)).toBeTrue();

      host.allowNavigation = false;
      fixture.detectChanges();
      tick();

      expect(nav.isStepClickable(0)).toBeFalse();
      expect(nav.isStepClickable(1)).toBeFalse();
    }));

    it('should not change step when clicking current step', fakeAsync(() => {
      host.stepper.selectedIndex = 1;
      fixture.detectChanges();
      tick();

      nav.onStepClick(1);
      fixture.detectChanges();
      tick();

      expect(host.stepper.selectedIndex).toBe(1);
    }));

    it('should change step when clicking clickable step', fakeAsync(() => {
      host.completedSteps[0] = true;
      fixture.detectChanges();
      tick();

      nav.onStepClick(1);
      fixture.detectChanges();
      tick();

      expect(host.stepper.selectedIndex).toBe(1);
    }));
  });
});

describe('StepsNavComponent error handling', () => {
  @Component({
    selector: 'app-test-host-no-stepper',
    template: `<sg-steps-nav></sg-steps-nav>`,
    standalone: true,
    imports: [StepsNavComponent],
  })
  class TestHostNoStepperComponent {}

  it('should log error when no stepper is provided', fakeAsync(() => {
    spyOn(console, 'error');

    TestBed.configureTestingModule({
      imports: [TestHostNoStepperComponent],
    }).compileComponents();

    const testFixture = TestBed.createComponent(TestHostNoStepperComponent);
    testFixture.detectChanges();
    tick();

    expect(console.error).toHaveBeenCalledWith(
      'sg-steps-nav: No stepper found. Must be used inside sg-steps or with [stepper] input'
    );
  }));
});
