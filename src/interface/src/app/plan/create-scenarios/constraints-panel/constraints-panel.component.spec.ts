import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ConstraintsPanelComponent } from './constraints-panel.component';
import { MaterialModule } from 'src/app/material/material.module';

describe('ConstraintsPanelComponent', () => {
  let component: ConstraintsPanelComponent;
  let fixture: ComponentFixture<ConstraintsPanelComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        MaterialModule,
        NoopAnimationsModule,
      ],
      declarations: [ConstraintsPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConstraintsPanelComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Select fields', () => {
    it('should have all treatment options selected by default', async () => {
      const selectEl = await loader.getHarness(
        MatSelectHarness.with({ selector: '[formControlName="treatmentType"]' })
      );
      const selectElText = await selectEl.getValueText();
      expect(selectElText).toEqual('All treatment types selected')

      await selectEl.open(); // need to open first to get options

      const options = await selectEl.getOptions();
      expect(options.length).toEqual(component.treatmentTypes.length);

      for (const option of options) {
        const isSelected = await option.isSelected();
        expect(isSelected).toBeTrue();
      }
    });

    it('should have placeholder text when no options are selected', async () => {
      const selectEl = await loader.getHarness(
        MatSelectHarness.with({ selector: '[formControlName="treatmentType"]' })
      );

      await selectEl.open(); // need to open first to get options

      const options = await selectEl.getOptions();

      for (const option of options) {
        await option.click(); // deselect each option
      }

      const selectElText = await selectEl.getValueText();

      expect(selectElText).toEqual('None');
    })
  });
});
