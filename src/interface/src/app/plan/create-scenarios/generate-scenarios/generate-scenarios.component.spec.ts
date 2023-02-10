import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSliderHarness } from '@angular/material/slider/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { MapService } from 'src/app/services';

import { GenerateScenariosComponent } from './generate-scenarios.component';

describe('GenerateScenariosComponent', () => {
  let component: GenerateScenariosComponent;
  let fixture: ComponentFixture<GenerateScenariosComponent>;
  let loader: HarnessLoader;
  let fakeMapService: MapService;

  beforeEach(async () => {
    let nameMap = new Map<string, string>();
    nameMap.set('fake_priority', 'fake_display_priority');

    fakeMapService = jasmine.createSpyObj<MapService>(
      'MapService',
      {},
      {
        conditionNameToDisplayNameMap$: new BehaviorSubject(nameMap),
      }
    );
    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FormsModule,
        MaterialModule,
        ReactiveFormsModule,
      ],
      declarations: [GenerateScenariosComponent],
      providers: [
        FormBuilder,
        {
          provide: MapService,
          useValue: fakeMapService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GenerateScenariosComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);

    const fb = fixture.componentRef.injector.get(FormBuilder);
    component.formGroup = fb.group({
      priorityWeightsForm: fb.group({}),
      areaPercent: [
        10,
        [Validators.required, Validators.min(10), Validators.max(40)],
      ],
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map condition name to display name', () => {
    expect(component.displayNameForPriority('fake_priority')).toEqual(
      'fake_display_priority'
    );
  });

  it('should update form with slider value', async () => {
    const sliderHarness: MatSliderHarness = await loader.getHarness(
      MatSliderHarness
    );

    // Set slider value to 34
    await sliderHarness.setValue(34);

    expect(component.formGroup?.get('areaPercent')?.value).toEqual(34);
    expect(component.formGroup?.get('areaPercent')?.dirty).toBeTrue();
  });
});
