import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepsNavComponent } from '@styleguide/steps/steps-nav.component';

describe('StepsNavComponent', () => {
  let component: StepsNavComponent;
  let fixture: ComponentFixture<StepsNavComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepsNavComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StepsNavComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('basic rendering', () => {
    beforeEach(() => {
      component.steps = [
        { label: 'First Step' },
        { label: 'Second Step' },
        { label: 'Third Step' },
        { label: 'Fourth Step' },
      ];
      component.selectedIndex = 0;
      fixture.detectChanges();
    });

    it('should display all steps', () => {
      const stepItems = compiled.querySelectorAll('.step-item');
      expect(stepItems.length).toBe(4);
    });

    it('should display step labels correctly', () => {
      const stepLabels = compiled.querySelectorAll('.step-label');
      expect(stepLabels[0].textContent?.trim()).toBe('First Step');
      expect(stepLabels[1].textContent?.trim()).toBe('Second Step');
      expect(stepLabels[2].textContent?.trim()).toBe('Third Step');
      expect(stepLabels[3].textContent?.trim()).toBe('Fourth Step');
    });

    it('should display step numbers correctly', () => {
      const stepNumbers = compiled.querySelectorAll('.step-number');
      expect(stepNumbers[0].textContent?.trim()).toBe('1');
      expect(stepNumbers[1].textContent?.trim()).toBe('2');
      expect(stepNumbers[2].textContent?.trim()).toBe('3');
      expect(stepNumbers[3].textContent?.trim()).toBe('4');
    });

    it('should mark first step as current initially', () => {
      const firstStep = compiled.querySelector('.step-item');
      expect(firstStep?.classList.contains('current')).toBeTrue();
    });

    it('should show connectors between steps', () => {
      const connectors = compiled.querySelectorAll('.step-connector');
      expect(connectors.length).toBe(3); // 4 steps = 3 connectors
    });
  });

  describe('step states', () => {
    beforeEach(() => {
      component.steps = [
        { label: 'Step 1', completed: true },
        { label: 'Step 2', completed: true },
        { label: 'Step 3', completed: false },
        { label: 'Step 4' },
      ];
      component.selectedIndex = 2;
      fixture.detectChanges();
    });

    it('should show checkmark for completed steps that are not current', () => {
      const firstStep = compiled.querySelectorAll('.step-item')[0];
      const checkmark = firstStep.querySelector('mat-icon.checkmark');
      const stepNumber = firstStep.querySelector('.step-number');

      expect(checkmark).toBeTruthy();
      expect(checkmark?.textContent?.trim()).toBe('check');
      expect(stepNumber).toBeFalsy();
    });

    it('should show step number for current step even if completed', () => {
      component.steps = [
        { label: 'Step 1', completed: true },
        { label: 'Step 2' },
      ];
      component.selectedIndex = 0;
      fixture.detectChanges();

      const firstStep = compiled.querySelector('.step-item');
      const checkmark = firstStep?.querySelector('mat-icon.checkmark');
      const stepNumber = firstStep?.querySelector('.step-number');

      expect(checkmark).toBeFalsy();
      expect(stepNumber).toBeTruthy();
      expect(stepNumber?.textContent?.trim()).toBe('1');
    });

    it('should apply correct CSS classes based on step state', () => {
      const steps = compiled.querySelectorAll('.step-item');

      // First step should be completed
      expect(steps[0].classList.contains('completed')).toBeTrue();
      expect(steps[0].classList.contains('current')).toBeFalse();

      // Second step should be completed
      expect(steps[1].classList.contains('completed')).toBeTrue();
      expect(steps[1].classList.contains('current')).toBeFalse();

      // Third step should be current
      expect(steps[2].classList.contains('current')).toBeTrue();
      expect(steps[2].classList.contains('completed')).toBeFalse();

      // Fourth step should be future
      expect(steps[3].classList.contains('future')).toBeTrue();
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      component.steps = [
        { label: 'Step 1', completed: true },
        { label: 'Step 2', completed: true },
        { label: 'Step 3', completed: false },
        { label: 'Step 4' },
      ];
      component.selectedIndex = 0;
      component.allowNavigation = true;
      fixture.detectChanges();
    });

    it('should emit selectionChange when clicking a clickable step', () => {
      spyOn(component.selectionChange, 'emit');

      const secondStep = compiled.querySelectorAll(
        '.step-item'
      )[1] as HTMLElement;
      secondStep.click();

      expect(component.selectionChange.emit).toHaveBeenCalledWith(1);
    });

    it('should not emit selectionChange when clicking current step', () => {
      spyOn(component.selectionChange, 'emit');

      const firstStep = compiled.querySelector('.step-item') as HTMLElement;
      firstStep.click();

      expect(component.selectionChange.emit).not.toHaveBeenCalled();
    });

    it('should not emit selectionChange when allowNavigation is false', () => {
      component.allowNavigation = false;
      fixture.detectChanges();
      spyOn(component.selectionChange, 'emit');

      const secondStep = compiled.querySelectorAll(
        '.step-item'
      )[1] as HTMLElement;
      secondStep.click();

      expect(component.selectionChange.emit).not.toHaveBeenCalled();
    });

    it('should mark steps as clickable based on completion', () => {
      const steps = compiled.querySelectorAll('.step-item');
      expect(steps[0].classList.contains('clickable')).toBeTrue(); // completed
      expect(steps[1].classList.contains('clickable')).toBeTrue(); // completed
      expect(steps[2].classList.contains('clickable')).toBeTrue(); // next step
    });
  });

  describe('linear mode', () => {
    beforeEach(() => {
      component.steps = [
        { label: 'Step 1', completed: true },
        { label: 'Step 2', completed: true },
        { label: 'Step 3', completed: false },
        { label: 'Step 4' },
      ];
      component.selectedIndex = 0;
      component.linear = true;
      component.allowNavigation = true;
      fixture.detectChanges();
    });

    it('should only allow navigation to previous completed steps in linear mode', () => {
      component.selectedIndex = 1;
      fixture.detectChanges();
      const steps = compiled.querySelectorAll('.step-item');
      expect(steps[0].classList.contains('clickable')).toBeTrue(); // completed
      expect(steps[1].classList.contains('clickable')).toBeTrue(); // completed
      expect(steps[2].classList.contains('clickable')).toBeFalse(); // next step
      expect(steps[3].classList.contains('clickable')).toBeFalse(); // future
    });

    it('should not allow clicking future steps in linear mode', () => {
      spyOn(component.selectionChange, 'emit');

      const fourthStep = compiled.querySelectorAll(
        '.step-item'
      )[3] as HTMLElement;
      fourthStep.click();

      expect(component.selectionChange.emit).not.toHaveBeenCalled();
    });
  });

  describe('non-linear mode', () => {
    beforeEach(() => {
      component.steps = [
        { label: 'Step 1', completed: true },
        { label: 'Step 2', completed: false },
        { label: 'Step 3', optional: true },
        { label: 'Step 4', editable: true },
      ];
      component.selectedIndex = 0;
      component.linear = false;
      component.allowNavigation = true;
      fixture.detectChanges();
    });

    it('should allow navigation to optional steps', () => {
      const thirdStep = compiled.querySelectorAll('.step-item')[2];
      expect(thirdStep.classList.contains('clickable')).toBeTrue();
    });

    it('should allow navigation to editable steps', () => {
      const fourthStep = compiled.querySelectorAll('.step-item')[3];
      expect(fourthStep.classList.contains('clickable')).toBeTrue();
    });
  });

  describe('component methods', () => {
    beforeEach(() => {
      component.steps = [
        { label: 'Step 1', completed: true },
        { label: 'Step 2', completed: false },
        { label: 'Step 3' },
      ];
      component.selectedIndex = 1;
    });

    it('should return correct step state', () => {
      expect(component.getStepState(0)).toBe('completed');
      expect(component.getStepState(1)).toBe('current');
      expect(component.getStepState(2)).toBe('future');
    });

    it('should correctly identify completed steps', () => {
      expect(component.isStepCompleted(0)).toBeTrue();
      expect(component.isStepCompleted(1)).toBeFalse();
      expect(component.isStepCompleted(2)).toBeFalse();
    });

    it('should correctly identify current step', () => {
      expect(component.isStepCurrent(0)).toBeFalse();
      expect(component.isStepCurrent(1)).toBeTrue();
      expect(component.isStepCurrent(2)).toBeFalse();
    });

    it('should calculate latest completed step', () => {
      expect(component.latestStep).toBe(0);

      component.steps[1].completed = true;
      expect(component.latestStep).toBe(1);
    });

    it('should return step labels', () => {
      expect(component.getStepLabel(0)).toBe('Step 1');
      expect(component.getStepLabel(1)).toBe('Step 2');
      expect(component.getStepLabel(2)).toBe('Step 3');
    });

    it('should return default label for missing step', () => {
      expect(component.getStepLabel(10)).toBe('Step 11');
    });
  });

  describe('empty state', () => {
    it('should handle empty steps array', () => {
      component.steps = [];
      fixture.detectChanges();

      const stepItems = compiled.querySelectorAll('.step-item');
      expect(stepItems.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle many steps', () => {
      component.steps = Array.from({ length: 10 }, (_, i) => ({
        label: `Step ${i + 1}`,
        completed: i < 5,
      }));
      component.selectedIndex = 5;
      fixture.detectChanges();

      const stepItems = compiled.querySelectorAll('.step-item');
      expect(stepItems.length).toBe(10);
    });

    it('should handle long step labels', () => {
      component.steps = [
        {
          label:
            'This is a very long step label that might wrap to multiple lines',
        },
      ];
      fixture.detectChanges();

      const stepLabel = compiled.querySelector('.step-label');
      expect(stepLabel?.textContent?.trim()).toBe(
        'This is a very long step label that might wrap to multiple lines'
      );
    });
  });
});
