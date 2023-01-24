import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MaterialModule } from 'src/app/material/material.module';
import { HarnessLoader } from '@angular/cdk/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { MapService } from './../../../services/map.service';
import { ConditionsConfig } from './../../../types/data.types';
import { SetPrioritiesComponent } from './set-priorities.component';

describe('SetPrioritiesComponent', () => {
  let component: SetPrioritiesComponent;
  let fixture: ComponentFixture<SetPrioritiesComponent>;
  let loader: HarnessLoader;

  let fakeMapService: MapService;

  beforeEach(async () => {
    fakeMapService = jasmine.createSpyObj<MapService>(
      'MapService',
      {},
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
    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FormsModule,
        MaterialModule,
        ReactiveFormsModule,
      ],
      declarations: [SetPrioritiesComponent],
      providers: [
        {
          provide: MapService,
          useValue: fakeMapService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetPrioritiesComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate datasource', () => {
    const metric = {
      conditionName: 'test_metric_1',
      filepath: 'test_metric_1',
      score: 0,
      children: [],
      level: 2,
    };
    const element = {
      conditionName: 'test_element_1',
      filepath: 'test_element_1_normalized',
      score: 0,
      children: [metric],
      level: 1,
      expanded: true,
    };
    const pillar = {
      conditionName: 'test_pillar_1',
      filepath: 'test_pillar_1_normalized',
      score: 0,
      children: [element],
      level: 0,
      expanded: true,
    };
    expect(component.datasource.data).toEqual([pillar, element, metric]);
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

  it('no rows should be hidden at first', () => {
    expect(
      component.datasource.data.find((element) => element.hidden)
    ).toBeUndefined();
  });

  it('collapsing a row should hide all of its descendants', () => {
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
    component.toggleExpand(component.datasource.data[0]);

    expect(component.datasource.data[0].expanded).toBeTrue();
    component.datasource.data[0].children.forEach((child) => {
      expect(child.hidden).toBeFalse();
      child.children.forEach((grandchild) => {
        expect(grandchild.hidden).toBeTrue();
      });
    });
  });

  it('selecting a priority should emit a priority change event', async () => {
    spyOn(component.changePrioritiesEvent, 'emit');
    const checkboxHarnesses = await loader.getAllHarnesses(MatCheckboxHarness);

    // Check the first priority (should be 'test_pillar_1')
    await checkboxHarnesses[0].check();

    expect(component.changePrioritiesEvent.emit).toHaveBeenCalledOnceWith({
      priorities: ['test_pillar_1'],
    });

    // Check the second priority (should be 'test_element_1')
    await checkboxHarnesses[1].check();

    expect(component.changePrioritiesEvent.emit).toHaveBeenCalledWith({
      priorities: ['test_pillar_1', 'test_element_1'],
    });
  });
});
