import { SharedModule } from 'src/app/shared/shared.module';
import { MaterialModule } from 'src/app/material/material.module';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapLayersComponent } from './map-layers.component';
import { MapService, PlanService } from 'src/app/services';
import { ConditionsConfig } from 'src/app/types';

describe('MapLayersComponent', () => {
  let component: MapLayersComponent;
  let fixture: ComponentFixture<MapLayersComponent>;
  let fakeMapService: MapService;
  let fakePlanService: PlanService;

  beforeEach(async () => {
    let nameMap = new Map<string, string>();
    nameMap.set('fake_priority', 'fake_display_priority');
    fakeMapService = jasmine.createSpyObj<MapService>(
      'MapService',
      {
        getColormap: of({}),
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
                  display: true,
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

    fakePlanService = jasmine.createSpyObj('PlanService', {
      getConditionScoresForPlanningArea: of({ conditions: [] }),
    });

    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FormsModule,
        MaterialModule,
        SharedModule,
      ],
      declarations: [MapLayersComponent],
      providers: [
        {
          provide: MapService,
          useValue: fakeMapService,
        },
        { provide: PlanService, useValue: fakePlanService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
