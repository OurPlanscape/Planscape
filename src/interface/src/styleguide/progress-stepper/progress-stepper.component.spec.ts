import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ProgressStepperComponent,
  StepperStep,
} from './progress-stepper.component';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';

describe('ProgressStepperComponent', () => {
  let component: ProgressStepperComponent;
  let fixture: ComponentFixture<ProgressStepperComponent>;

  const mockSteps: StepperStep[] = [
    { label: 'Select Data Layers' },
    { label: 'Assign Favorability' },
    { label: 'Assign Pillars' },
    { label: 'Save & Run Analysis' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, MatIconModule, ProgressStepperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressStepperComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render all steps', () => {
    component.steps = mockSteps;
    fixture.detectChanges();

    const stepElements = fixture.debugElement.queryAll(By.css('.step-item'));
    expect(stepElements.length).toBe(mockSteps.length);
  });

  it('should display step labels correctly', () => {
    component.steps = mockSteps;
    fixture.detectChanges();

    const labelElements = fixture.debugElement.queryAll(By.css('.step-label'));
    labelElements.forEach((el, index) => {
      expect(el.nativeElement.textContent.trim()).toBe(mockSteps[index].label);
    });
  });

  it('should show checkmark for completed steps', () => {
    component.steps = mockSteps;
    component.currentStep = 2;
    component.latestStep = 2;
    fixture.detectChanges();

    const checkmarks = fixture.debugElement.queryAll(By.css('.checkmark'));
    expect(checkmarks.length).toBe(2);
  });

  it('should show number for non-completed steps', () => {
    component.steps = mockSteps;
    component.currentStep = 1;
    component.latestStep = 1;
    fixture.detectChanges();

    const stepNumbers = fixture.debugElement.queryAll(By.css('.step-number'));
    expect(stepNumbers.length).toBe(3);
    expect(stepNumbers[0].nativeElement.textContent.trim()).toBe('2');
    expect(stepNumbers[1].nativeElement.textContent.trim()).toBe('3');
  });

  it('should apply correct classes based on step state', () => {
    component.steps = mockSteps;
    component.currentStep = 1;
    component.latestStep = 2;
    fixture.detectChanges();

    const stepItems = fixture.debugElement.queryAll(By.css('.step-item'));

    expect(stepItems[0].nativeElement.classList.contains('completed')).toBe(
      true
    );
    expect(stepItems[1].nativeElement.classList.contains('current')).toBe(true);
    expect(stepItems[2].nativeElement.classList.contains('completed')).toBe(
      false
    );
    expect(stepItems[3].nativeElement.classList.contains('future')).toBe(true);
  });

  it('should emit stepChange when clicking on a valid step', () => {
    component.steps = mockSteps;
    component.currentStep = 2;
    component.latestStep = 2;
    component.allowNavigation = true;
    fixture.detectChanges();

    spyOn(component.stepChange, 'emit');

    const firstStep = fixture.debugElement.query(By.css('.step-item'));
    firstStep.nativeElement.click();

    expect(component.stepChange.emit).toHaveBeenCalledWith(0);
    expect(component.currentStep).toBe(0);
  });

  it('should not emit stepChange when clicking on a future step', () => {
    component.steps = mockSteps;
    component.currentStep = 1;
    component.latestStep = 1;
    component.allowNavigation = true;
    fixture.detectChanges();

    spyOn(component.stepChange, 'emit');

    const futureStep = fixture.debugElement.queryAll(By.css('.step-item'))[3];
    futureStep.nativeElement.click();

    expect(component.stepChange.emit).not.toHaveBeenCalled();
    expect(component.currentStep).toBe(1);
  });

  it('should not allow navigation when allowNavigation is false', () => {
    component.steps = mockSteps;
    component.currentStep = 2;
    component.latestStep = 2;
    component.allowNavigation = false;
    fixture.detectChanges();

    spyOn(component.stepChange, 'emit');

    const firstStep = fixture.debugElement.query(By.css('.step-item'));
    firstStep.nativeElement.click();

    expect(component.stepChange.emit).not.toHaveBeenCalled();
    expect(component.currentStep).toBe(2);
  });

  describe('navigation methods', () => {
    beforeEach(() => {
      component.steps = mockSteps;
      component.latestStep = 2;
      spyOn(component.stepChange, 'emit');
    });

    it('should navigate to next step', () => {
      component.currentStep = 1;
      component.next();

      expect(component.currentStep).toBe(2);
      expect(component.stepChange.emit).toHaveBeenCalledWith(2);
    });

    it('should navigate next even if beyond latest step', () => {
      component.currentStep = 2;
      component.latestStep = 2;
      component.next();

      expect(component.currentStep).toBe(3);
      expect(component.stepChange.emit).toHaveBeenCalledWith(3);
    });

    it('should not navigate next if at last step', () => {
      component.currentStep = 3;
      component.next();

      expect(component.currentStep).toBe(3);
      expect(component.stepChange.emit).not.toHaveBeenCalled();
    });

    it('should navigate to previous step', () => {
      component.currentStep = 2;
      component.previous();

      expect(component.currentStep).toBe(1);
      expect(component.stepChange.emit).toHaveBeenCalledWith(1);
    });

    it('should not navigate previous if at first step', () => {
      component.currentStep = 0;
      component.previous();

      expect(component.currentStep).toBe(0);
      expect(component.stepChange.emit).not.toHaveBeenCalled();
    });

    it('should go to specific step if valid', () => {
      component.currentStep = 0;
      component.goToStep(2);

      expect(component.currentStep).toBe(2);
      expect(component.stepChange.emit).toHaveBeenCalledWith(2);
    });

    it('should go to step even if beyond latest step', () => {
      component.currentStep = 0;
      component.latestStep = 1;
      component.goToStep(3);

      expect(component.currentStep).toBe(3);
      expect(component.stepChange.emit).toHaveBeenCalledWith(3);
    });

    it('should not go to invalid step index', () => {
      component.currentStep = 0;
      component.goToStep(-1);

      expect(component.currentStep).toBe(0);
      expect(component.stepChange.emit).not.toHaveBeenCalled();

      component.goToStep(4);
      expect(component.currentStep).toBe(0);
      expect(component.stepChange.emit).not.toHaveBeenCalled();
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      component.steps = mockSteps;
    });

    it('should correctly identify if can go next', () => {
      component.currentStep = 1;
      component.latestStep = 2;
      expect(component.canGoNext()).toBe(true);

      component.currentStep = 2;
      expect(component.canGoNext()).toBe(true);

      component.currentStep = 3;
      expect(component.canGoNext()).toBe(false);
    });

    it('should correctly identify if can go previous', () => {
      component.currentStep = 0;
      expect(component.canGoPrevious()).toBe(false);

      component.currentStep = 1;
      expect(component.canGoPrevious()).toBe(true);
    });

    it('should correctly get step state', () => {
      component.currentStep = 1;

      expect(component.getStepState(0)).toBe('completed');
      expect(component.getStepState(1)).toBe('current');
      expect(component.getStepState(2)).toBe('future');
    });
  });
});
