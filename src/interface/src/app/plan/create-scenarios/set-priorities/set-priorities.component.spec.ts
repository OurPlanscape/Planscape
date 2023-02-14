import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { colormapConfigToLegend, Plan, Region } from 'src/app/types';

import { MapService } from './../../../services/map.service';
import { PlanService } from './../../../services/plan.service';
import { ConditionsConfig } from './../../../types/data.types';
import { ColormapConfig } from './../../../types/legend.types';
import {
  ScoreColumn,
  SetPrioritiesComponent,
} from './set-priorities.component';

describe('SetPrioritiesComponent', () => {
  let component: SetPrioritiesComponent;
  let fixture: ComponentFixture<SetPrioritiesComponent>;
  let loader: HarnessLoader;

  let fakeMapService: MapService;
  let fakePlanService: PlanService;

  const fakeColormapConfig: ColormapConfig = {
    name: 'fakecolormap',
    values: [
      {
        rgb: '#000000',
        name: 'fakelabel',
      },
    ],
  };

  beforeEach(async () => {
    fakeMapService = jasmine.createSpyObj<MapService>(
      'MapService',
      {
        getColormap: of(fakeColormapConfig),
      },
      {
        conditionsConfig$: new BehaviorSubject<ConditionsConfig | null>({
          pillars: [
            {
              pillar_name: 'test_pillar_1',
              filepath: 'test_pillar_1',
              display: true,
              elements: [
                {
                  element_name: 'test_element_1',
                  filepath: 'test_element_1',
                  metrics: [
                    {
                      metric_name: 'test_metric_1',
                      filepath: 'test_metric_1',
                    },
                  ],
                },
              ],
            },
          ],
        }),
      }
    );
    fakePlanService = jasmine.createSpyObj<PlanService>(
      'PlanService',
      {
        getConditionScoresForPlanningArea: of({
          conditions: [
            {
              condition: 'test_pillar_1',
              mean_score: 0.1,
            },
            {
              condition: 'test_element_1',
              mean_score: -0.7,
            },
            {
              condition: 'test_metric_1',
              mean_score: 0.4,
            },
          ],
        }),
      },
      {}
    );
    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FormsModule,
        MaterialModule,
        ReactiveFormsModule,
      ],
      declarations: [SetPrioritiesComponent],
      providers: [
        FormBuilder,
        {
          provide: MapService,
          useValue: fakeMapService,
        },
        {
          provide: PlanService,
          useValue: fakePlanService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetPrioritiesComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);

    const fb = fixture.componentRef.injector.get(FormBuilder);
    component.formGroup = fb.group({
      priorities: ['', Validators.required],
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch colormap from service to create legend', () => {
    let legend = colormapConfigToLegend(fakeColormapConfig);
    legend!.labels = ['Poor', 'OK', 'Excellent'];

    expect(fakeMapService.getColormap).toHaveBeenCalledOnceWith('turbo');
    expect(component.legend).toEqual(legend);
  });

  it('should populate datasource', () => {
    const metric = {
      conditionName: 'test_metric_1',
      displayName: undefined,
      filepath: 'test_metric_1',
      children: [],
      level: 2,
      hidden: true,
    };
    const element = {
      conditionName: 'test_element_1',
      displayName: undefined,
      filepath: 'test_element_1_normalized',
      children: [metric],
      level: 1,
      expanded: false,
      hidden: true,
    };
    const pillar = {
      conditionName: 'test_pillar_1',
      displayName: undefined,
      filepath: 'test_pillar_1_normalized',
      children: [element],
      level: 0,
      expanded: false,
    };
    expect(component.datasource.data).toEqual([pillar, element, metric]);
  });

  it('should populate condition score map', () => {
    const fakePlan: Plan = {
      id: '1',
      name: 'fakeplan',
      ownerId: '1',
      region: Region.SIERRA_NEVADA,
    };
    const expectedMap = new Map<string, ScoreColumn>([
      [
        'test_pillar_1',
        {
          label: 'Medium',
          score: 0.1,
        },
      ],
      [
        'test_element_1',
        {
          label: 'Lowest',
          score: -0.7,
        },
      ],
      [
        'test_metric_1',
        {
          label: 'High',
          score: 0.4,
        },
      ],
    ]);

    component.plan$.next(fakePlan);

    expect(component.conditionScores).toEqual(expectedMap);
  });

  it('should only have 1 condition visible at a time', () => {
    expect(
      component.datasource.data.find((element) => element.visible)
    ).toBeUndefined();

    component.toggleVisibility(component.datasource.data[1]);

    expect(component.datasource.data[1].visible).toBeTrue();
    expect(
      component.datasource.data.filter((element) => element.visible).length
    ).toEqual(1);

    component.toggleVisibility(component.datasource.data[2]);

    expect(component.datasource.data[2].visible).toBeTrue();
    expect(
      component.datasource.data.filter((element) => element.visible).length
    ).toEqual(1);
  });

  it('only pillars should be visible at first', () => {
    expect(
      component.datasource.data.filter((element) => element.hidden).length
    ).toEqual(2);
  });

  it('collapsing a row should hide all of its descendants', () => {
    component.toggleExpand(component.datasource.data[0]);
    component.toggleExpand(component.datasource.data[0]);

    expect(component.datasource.data[0].expanded).toBeFalse();
    component.datasource.data[0].children.forEach((child) => {
      expect(child.hidden).toBeTrue();
      child.children.forEach((grandchild) => {
        expect(grandchild.hidden).toBeTrue();
      });
    });
  });

  it('expanding a row should unhide its immediate children', () => {
    component.toggleExpand(component.datasource.data[0]);

    expect(component.datasource.data[0].expanded).toBeTrue();
    component.datasource.data[0].children.forEach((child) => {
      expect(child.hidden).toBeFalse();
      child.children.forEach((grandchild) => {
        expect(grandchild.hidden).toBeTrue();
      });
    });
  });

  it('selecting a priority should update the form value', async () => {
    const checkboxHarnesses = await loader.getAllHarnesses(MatCheckboxHarness);

    // Check the first priority (should be 'test_pillar_1')
    await checkboxHarnesses[0].check();

    expect(component.formGroup?.get('priorities')?.value).toEqual([
      'test_pillar_1',
    ]);

    // Check the second priority (should be 'test_element_1')
    await checkboxHarnesses[1].check();

    expect(component.formGroup?.get('priorities')?.value).toEqual([
      'test_pillar_1',
      'test_element_1',
    ]);
  });

  it('updateSelectedPriorities should update checkboxes', async () => {
    component.formGroup?.get('priorities')?.setValue([]);
    const checkboxHarnesses = await loader.getAllHarnesses(MatCheckboxHarness);
    const conditionCheckbox1 = checkboxHarnesses[0];

    expect(component.datasource.data[0].selected).toBeFalsy();
    expect(await conditionCheckbox1.isChecked()).toBeFalse();

    component.formGroup?.get('priorities')?.setValue(['test_pillar_1']);
    component.updateSelectedPriorities();

    expect(component.datasource.data[0].selected).toBeTrue();
    expect(await conditionCheckbox1.isChecked()).toBeTrue();
  });
});
