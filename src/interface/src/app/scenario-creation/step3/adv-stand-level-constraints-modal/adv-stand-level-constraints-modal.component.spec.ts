import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvStandLevelConstraintsModalComponent } from './adv-stand-level-constraints-modal.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('AdvStandLevelConstraintsModalComponent', () => {
  let component: AdvStandLevelConstraintsModalComponent;
  let fixture: ComponentFixture<AdvStandLevelConstraintsModalComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AdvStandLevelConstraintsModalComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [AdvStandLevelConstraintsModalComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { dataLayerName: 'Test Layer Alpha' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvStandLevelConstraintsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize dataLayerName from dialog data', () => {
    expect(component).toBeTruthy();
    expect(component.dataLayerName).toBe('Test Layer Alpha');
  });

  it('should invalidate the form if valueOne is empty', () => {
    component.form.patchValue({ constraintOperator: 'eq', constraintValueOne: null });
    expect(component.form.valid).toBeFalse();
    expect(component.isButtonDisabled).toBeTrue();
  });

  it('should validate the form if valueOne is present for standard operators', () => {
    component.form.patchValue({ constraintOperator: 'eq', constraintValueOne: 42 });
    expect(component.form.valid).toBeTrue();
    expect(component.isButtonDisabled).toBeFalse();
  });

  it('should toggle showSecondValue and enable/disable constraintValueTwo when operator changes', () => {
    const valTwoControl = component.form.get('constraintValueTwo');

    // Switch to 'btw'
    component.form.patchValue({ constraintOperator: 'btw' });
    expect(component.showSecondValue).toBeTrue();
    expect(valTwoControl?.enabled).toBeTrue();

    // Switch back to 'eq'
    component.form.patchValue({ constraintOperator: 'eq' });
    expect(component.showSecondValue).toBeFalse();
    expect(valTwoControl?.disabled).toBeTrue();
    expect(valTwoControl?.value).toBeNull();
  });

  it('should require both valueOne and value2 when operator is "btw"', () => {
    component.form.patchValue({
      constraintOperator: 'btw',
      constraintValueOne: 10,
      constraintValueTwo: null,
    });
    expect(component.form.valid).toBeFalse();

    component.form.patchValue({ constraintValueTwo: 20 });
    expect(component.form.valid).toBeTrue();
  });

  it('should close dialog with correct payload including value2 on handleApply for "btw"', () => {
    component.form.patchValue({
      constraintOperator: 'btw',
      constraintValueOne: 10,
      constraintValueTwo: 50,
    });

    component.handleApply();

    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      operator: 'btw',
      value: 10,
      value2: 50,
    });
  });

  it('should close dialog without value2 on handleApply for standard operators', () => {
    component.form.patchValue({
      constraintOperator: 'gte',
      constraintValueOne: 25,
    });

    component.handleApply();

    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      operator: 'gte',
      value: 25,
    });
  });
});