import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepsActionsComponent } from './steps-actions.component';

describe('StepsActionsComponent', () => {
  let component: StepsActionsComponent;
  let fixture: ComponentFixture<StepsActionsComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepsActionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StepsActionsComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should display step count', () => {
      component.currentStep = 0;
      component.totalSteps = 4;
      component.showStepCount = true;
      fixture.detectChanges();

      const stepCount = compiled.querySelector('.step-count');
      expect(stepCount?.textContent?.trim()).toBe('Step 1 of 4');
    });

    it('should hide step count when showStepCount is false', () => {
      component.showStepCount = false;
      fixture.detectChanges();

      const stepCount = compiled.querySelector('.step-count');
      expect(stepCount).toBeFalsy();
    });

    it('should display back button when showBack is true', () => {
      component.showBack = true;
      fixture.detectChanges();

      const backButton = compiled.querySelector('button:nth-of-type(1)');
      expect(backButton?.textContent?.trim()).toBe('Back');
    });

    it('should hide back button when showBack is false', () => {
      component.showBack = false;
      fixture.detectChanges();

      const buttons = compiled.querySelectorAll('button');
      expect(buttons.length).toBe(1); // Only continue button
    });

    it('should display continue button when showContinue is true', () => {
      component.showContinue = true;
      component.isLastStep = false;
      fixture.detectChanges();

      const continueButton = compiled.querySelector(
        'button[variant="primary"]'
      );
      expect(continueButton?.textContent?.trim()).toBe('Save & Continue');
    });

    it('should hide continue button when showContinue is false', () => {
      component.showBack = false;
      component.showContinue = false;
      fixture.detectChanges();

      const buttons = compiled.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });

    it('should display finish label on last step', () => {
      component.isLastStep = true;
      component.showContinue = true;
      fixture.detectChanges();

      const continueButton = compiled.querySelector(
        'button[variant="primary"]'
      );
      expect(continueButton?.textContent?.trim()).toBe('Finish');
    });

    it('should use custom labels when provided', () => {
      component.showBack = true;
      component.showContinue = true;
      component.backLabel = 'Previous';
      component.continueLabel = 'Next Step';
      component.finishLabel = 'Complete';
      component.isLastStep = false;
      fixture.detectChanges();

      const backButton = compiled.querySelector('button:nth-of-type(1)');
      const continueButton = compiled.querySelector(
        'button[variant="primary"]'
      );

      expect(backButton?.textContent?.trim()).toBe('Previous');
      expect(continueButton?.textContent?.trim()).toBe('Next Step');
    });

    it('should use custom finish label on last step', () => {
      component.showContinue = true;
      component.finishLabel = 'Submit';
      component.isLastStep = true;
      fixture.detectChanges();

      const continueButton = compiled.querySelector(
        'button[variant="primary"]'
      );
      expect(continueButton?.textContent?.trim()).toBe('Submit');
    });
  });

  describe('button states', () => {
    beforeEach(() => {
      component.showBack = true;
      component.showContinue = true;
      fixture.detectChanges();
    });

    it('should disable back button when canGoBack is false', () => {
      component.canGoBack = false;
      fixture.detectChanges();

      const backButton = compiled.querySelector(
        'button:nth-of-type(1)'
      ) as HTMLButtonElement;
      expect(backButton.disabled).toBeTrue();
    });

    it('should enable back button when canGoBack is true', () => {
      component.canGoBack = true;
      fixture.detectChanges();

      const backButton = compiled.querySelector(
        'button:nth-of-type(1)'
      ) as HTMLButtonElement;
      expect(backButton.disabled).toBeFalse();
    });

    it('should disable continue button when canGoNext is false', () => {
      component.canGoNext = false;
      fixture.detectChanges();

      const continueButton = compiled.querySelector(
        'button[variant="primary"]'
      ) as HTMLButtonElement;
      expect(continueButton.disabled).toBeTrue();
    });

    it('should enable continue button when canGoNext is true', () => {
      component.canGoNext = true;
      fixture.detectChanges();

      const continueButton = compiled.querySelector(
        'button[variant="primary"]'
      ) as HTMLButtonElement;
      expect(continueButton.disabled).toBeFalse();
    });

    it('should disable both buttons when loading', () => {
      component.canGoBack = true;
      component.canGoNext = true;
      component.loading = true;
      fixture.detectChanges();

      const backButton = compiled.querySelector(
        'button:nth-of-type(1)'
      ) as HTMLButtonElement;
      const continueButton = compiled.querySelector(
        'button[variant="primary"]'
      ) as HTMLButtonElement;

      expect(backButton.disabled).toBeTrue();
      expect(continueButton.disabled).toBeTrue();
    });

    it('should show loading state on continue button', () => {
      component.loading = true;
      fixture.detectChanges();

      const continueButton = compiled.querySelector(
        'button[variant="primary"]'
      );
      expect(continueButton?.getAttribute('ng-reflect-loading')).toBe('true');
    });
  });

  describe('interactions', () => {
    beforeEach(() => {
      component.showBack = true;
      component.showContinue = true;
      component.canGoBack = true;
      component.canGoNext = true;
      fixture.detectChanges();
    });

    it('should emit back event when back button is clicked', () => {
      spyOn(component.back, 'emit');

      const backButton = compiled.querySelector(
        'button:nth-of-type(1)'
      ) as HTMLElement;
      backButton.click();

      expect(component.back.emit).toHaveBeenCalledWith();
    });

    it('should emit next event when continue button is clicked', () => {
      spyOn(component.next, 'emit');

      const continueButton = compiled.querySelector(
        'button[variant="primary"]'
      ) as HTMLElement;
      continueButton.click();

      expect(component.next.emit).toHaveBeenCalledWith();
    });

    it('should not emit back event when canGoBack is false', () => {
      component.canGoBack = false;
      spyOn(component.back, 'emit');

      component.onBack();

      expect(component.back.emit).not.toHaveBeenCalled();
    });

    it('should not emit next event when canGoNext is false', () => {
      component.canGoNext = false;
      spyOn(component.next, 'emit');

      component.onNext();

      expect(component.next.emit).not.toHaveBeenCalled();
    });

    it('should not emit back event when loading', () => {
      component.loading = true;
      spyOn(component.back, 'emit');

      component.onBack();

      expect(component.back.emit).not.toHaveBeenCalled();
    });

    it('should not emit next event when loading', () => {
      component.loading = true;
      spyOn(component.next, 'emit');

      component.onNext();

      expect(component.next.emit).not.toHaveBeenCalled();
    });
  });

  describe('step count display', () => {
    beforeEach(() => {
      component.showStepCount = true;
    });

    it('should show "Step 1 of 3" for first step', () => {
      component.currentStep = 0;
      component.totalSteps = 3;
      fixture.detectChanges();

      const stepCount = compiled.querySelector('.step-count');
      expect(stepCount?.textContent?.trim()).toBe('Step 1 of 3');
    });

    it('should show "Step 3 of 5" for middle step', () => {
      component.currentStep = 2;
      component.totalSteps = 5;
      fixture.detectChanges();

      const stepCount = compiled.querySelector('.step-count');
      expect(stepCount?.textContent?.trim()).toBe('Step 3 of 5');
    });

    it('should show "Step 4 of 4" for last step', () => {
      component.currentStep = 3;
      component.totalSteps = 4;
      fixture.detectChanges();

      const stepCount = compiled.querySelector('.step-count');
      expect(stepCount?.textContent?.trim()).toBe('Step 4 of 4');
    });
  });

  describe('layout', () => {
    it('should have actions container', () => {
      fixture.detectChanges();

      const actions = compiled.querySelector('.actions');
      expect(actions).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle zero total steps', () => {
      component.currentStep = 0;
      component.totalSteps = 0;
      component.showStepCount = true;
      fixture.detectChanges();

      const stepCount = compiled.querySelector('.step-count');
      expect(stepCount?.textContent?.trim()).toBe('Step 1 of 0');
    });

    it('should handle negative step values gracefully', () => {
      component.currentStep = -1;
      component.totalSteps = 3;
      component.showStepCount = true;
      fixture.detectChanges();

      const stepCount = compiled.querySelector('.step-count');
      expect(stepCount?.textContent?.trim()).toBe('Step 0 of 3');
    });
  });
});
