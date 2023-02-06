import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PlanModule } from '../plan.module';
import { CreateScenariosComponent } from './create-scenarios.component';

describe('CreateScenariosComponent', () => {
  let component: CreateScenariosComponent;
  let fixture: ComponentFixture<CreateScenariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, HttpClientTestingModule, PlanModule],
      declarations: [CreateScenariosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateScenariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stepper should begin on the first step', () => {
    expect(component.stepper?.selectedIndex).toEqual(0);
  });

  it('advancing the stepper is blocked if the step form is invalid', () => {
    component.stepper?.next();

    expect(component.stepper?.selectedIndex).toEqual(0);
  });

  it('stepper advances automatically when step 1 form is valid', () => {
    component.formGroups[0].get('scoreSelectCtrl')?.setValue('test');

    expect(component.stepper?.selectedIndex).toEqual(1);
  });

  it('emits drawShapes event when "identify project areas" form inputs change', () => {
    const generateAreas = component.formGroups[3].get('generateAreas');
    const uploadedArea = component.formGroups[3].get('uploadedArea');
    spyOn(component.drawShapesEvent, 'emit');

    // Set "generate areas automatically" to true
    generateAreas?.setValue(true);

    expect(component.drawShapesEvent.emit).toHaveBeenCalledWith(null);

    // Add an uploaded area and set "generate areas automatically" to false
    generateAreas?.setValue(false);
    uploadedArea?.setValue('testvalue');

    expect(component.drawShapesEvent.emit).toHaveBeenCalledWith('testvalue');
  });
});
