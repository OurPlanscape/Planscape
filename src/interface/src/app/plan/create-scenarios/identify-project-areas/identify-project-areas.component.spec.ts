import { featureCollection, point } from '@turf/helpers';
import { MatLegacyRadioGroupHarness as MatRadioGroupHarness } from '@angular/material/legacy-radio/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LegacyMaterialModule } from '../../../material/legacy-material.module';
import { MatLegacyButtonHarness as MatButtonHarness } from '@angular/material/legacy-button/testing';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import * as shp from 'shpjs';

import { IdentifyProjectAreasComponent } from './identify-project-areas.component';
import { SharedModule } from '@shared';

describe('IdentifyProjectAreasComponent', () => {
  let component: IdentifyProjectAreasComponent;
  let fixture: ComponentFixture<IdentifyProjectAreasComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        LegacyMaterialModule,
        NoopAnimationsModule,
        SharedModule,
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

  it('should not require file upload when the "generate areas" button is selected', async () => {
    const radioButtonGroup: MatRadioGroupHarness =
      await loader.getHarness(MatRadioGroupHarness);

    // Select 'generate areas' button
    await (await radioButtonGroup.getRadioButtons())[0].check();

    expect(component.formGroup?.valid).toBeTrue();
  });

  it('should require file upload when the "upload files" button is selected', async () => {
    const radioButtonGroup: MatRadioGroupHarness =
      await loader.getHarness(MatRadioGroupHarness);

    // Select 'upload file' button
    await (await radioButtonGroup.getRadioButtons())[1].check();

    expect(component.formGroup?.valid).toBeFalse();

    // Add fake uploaded file value
    component.formGroup?.get('uploadedArea')?.setValue('fake');

    expect(component.formGroup?.valid).toBeTrue();
  });

  describe('file uploader', () => {
    function createSpy(mockReader: jasmine.SpyObj<FileReader>) {
      spyOn(window as any, 'FileReader').and.returnValue(mockReader);
    }

    it('should show file uploader when upload button is clicked', async () => {
      const uploadButton: MatButtonHarness = await loader.getHarness(
        MatButtonHarness.with({ text: /UPLOAD/ })
      );

      // Click upload button
      await uploadButton.click();

      expect(component.showUploader).toBeTrue();
    });

    it('adds the geojson to the form given a valid shapefile', async () => {
      const testFile = new File([], 'test.zip');
      const fakeResult = featureCollection([point([-75.343, 39.984])]);
      const mockReader = jasmine.createSpyObj('FileReader', [
        'readAsArrayBuffer',
        'onload',
      ]);
      mockReader.result = 'test content';
      mockReader.readAsArrayBuffer.and.callFake(() => mockReader.onload());
      createSpy(mockReader);
      spyOn(shp, 'parseZip').and.returnValue(Promise.resolve(fakeResult));

      // Upload fake file
      await component.loadFile({ type: 'area_upload', value: testFile });

      expect(component.showSuccessText).toBeTrue();
      expect(component.showErrorText).toBeFalse();
      expect(component.formGroup?.get('uploadedArea')?.value).toEqual(
        fakeResult
      );
    });

    it('shows error when the file is invalid', async () => {
      const testFile = new File([], 'test.zip');
      const mockReader = jasmine.createSpyObj('FileReader', [
        'readAsArrayBuffer',
        'onload',
      ]);
      mockReader.result = 'test content';
      mockReader.readAsArrayBuffer.and.callFake(() => mockReader.onload());
      createSpy(mockReader);
      spyOn(shp, 'parseZip').and.returnValue(Promise.reject());

      // Upload fake file
      await component.loadFile({ type: 'area_upload', value: testFile });

      expect(component.showErrorText).toBeTrue();
      expect(component.showSuccessText).toBeFalse();
      expect(component.formGroup?.get('uploadedArea')?.value).toBeFalsy();
    });
  });
});
