import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material/material.module';
import { MatButtonHarness } from '@angular/material/button/testing';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdentifyProjectAreasComponent } from './identify-project-areas.component';

fdescribe('IdentifyProjectAreasComponent', () => {
  let component: IdentifyProjectAreasComponent;
  let fixture: ComponentFixture<IdentifyProjectAreasComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        MaterialModule,
        NoopAnimationsModule,
      ],
      declarations: [IdentifyProjectAreasComponent],
      providers: [FormBuilder],
    }).compileComponents();

    fixture = TestBed.createComponent(IdentifyProjectAreasComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);

    const fb = fixture.componentRef.injector.get(FormBuilder);
    (component.formGroup = fb.group({
      generateAreas: ['', Validators.required],
      uploadedArea: [''],
    })),
      fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit event when next button is clicked and form is valid', async () => {
    spyOn(component.formNextEvent, 'emit');
    const nextButton: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: 'NEXT' })
    );
    // Set form to valid state
    component.formGroup?.get('generateAreas')?.setValue(true);

    expect(component.formGroup?.valid).toBeTrue();
    expect(await nextButton.isDisabled()).toBeFalse();

    // Click next button
    await nextButton.click();

    expect(component.formNextEvent.emit).toHaveBeenCalledOnceWith();
  });

  it('should not emit event when next button is clicked and form is invalid', async () => {
    spyOn(component.formNextEvent, 'emit');
    const nextButton: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: 'NEXT' })
    );

    // Click next button
    await nextButton.click();

    expect(component.formNextEvent.emit).toHaveBeenCalledTimes(0);
  });

  it('should emit event when previous button is clicked', async () => {
    spyOn(component.formBackEvent, 'emit');
    const backButton: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: 'BACK' })
    );
    // Click back button
    await backButton.click();

    expect(component.formBackEvent.emit).toHaveBeenCalledOnceWith();
  });
});
