import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { ScenarioConfigListOverlayComponent } from './scenario-config-list-overlay.component';
import { ScenarioState } from '../scenario.state';
import { DataLayersService } from '@services';
import { ForsysService } from '@services/forsys.service';
import { PlanState } from '@app/plan/plan.state';
import { ModuleService } from '@app/services/module.service';

const mockScenarioV3 = {
  planning_approach: null,
  version: 'V3',
  type: 'STANDARD',
  treatment_goal: { name: 'Sample tx goal' },
  configuration: {
    stand_size: 'LARGE',
    included_areas: [],
    excluded_areas: [],
    priorities: [],
    priority_objectives: [],
    cobenefits: [],
    constraints: [],
    sub_units_layer: undefined,
    targets: {
      max_project_count: 5,
      max_area: 1000,
      estimated_cost: 250,
      sub_units_fixed_target: true,
      sub_units_target_value: 100,
    },
  },
};

// Legacy have no `priorities` or `constraints` array
const mockScenarioV2 = {
  planning_approach: null,
  version: 'V2',
  type: 'STANDARD',
  treatment_goal: { name: 'Legacy Treatment Goal' },
  configuration: {
    stand_size: 'LARGE' as const,
    max_slope: 25,
    max_area: 5000 as number | null,
    max_budget: 123456,
    min_distance_from_road: 150,
    included_areas: [],
    excluded_areas: [],
    priority_objectives: [],
    cobenefits: [],
    sub_units_layer: undefined,
  },
};

function makeDataLayer(id: number, name: string) {
  return { id, name } as any;
}

describe('ScenarioConfigListOverlayComponent', () => {
  let component: ScenarioConfigListOverlayComponent;
  let fixture: ComponentFixture<ScenarioConfigListOverlayComponent>;

  let currentScenario$: BehaviorSubject<any>;
  let displayConfigOverlay$: BehaviorSubject<boolean>;
  let includedAreas$: BehaviorSubject<any[]>;
  let excludedAreas$: BehaviorSubject<any[]>;
  let forsysData$: BehaviorSubject<any>;
  let currentPlan$: BehaviorSubject<any>;

  let scenarioStateSpy: jasmine.SpyObj<ScenarioState>;
  let forsysServiceSpy: jasmine.SpyObj<ForsysService>;
  let dataLayersServiceSpy: jasmine.SpyObj<DataLayersService>;
  let planStateSpy: jasmine.SpyObj<PlanState>;
  let moduleServiceSpy: jasmine.SpyObj<ModuleService>;

  beforeEach(async () => {
    currentScenario$ = new BehaviorSubject<any>(mockScenarioV3);
    displayConfigOverlay$ = new BehaviorSubject<boolean>(true);
    includedAreas$ = new BehaviorSubject<any[]>([]);
    excludedAreas$ = new BehaviorSubject<any[]>([]);
    forsysData$ = new BehaviorSubject<any>({
      thresholds: {
        slope: { id: 1 },
        distance_from_roads: { id: 2 },
      },
    });
    currentPlan$ = new BehaviorSubject<any>({ name: 'Test Plan' });

    scenarioStateSpy = jasmine.createSpyObj(
      'ScenarioState',
      ['setDisplayOverlay'],
      {
        currentScenario$,
        displayConfigOverlay$,
      }
    );

    forsysServiceSpy = jasmine.createSpyObj('ForsysService', [], {
      excludedAreas$,
      includedAreas$,
      forsysData$,
    });

    dataLayersServiceSpy = jasmine.createSpyObj('DataLayersService', [
      'getDataLayersByIds',
    ]);
    dataLayersServiceSpy.getDataLayersByIds.and.returnValue(of([]));

    planStateSpy = jasmine.createSpyObj('PlanState', [], {
      currentPlan$,
    });

    moduleServiceSpy = jasmine.createSpyObj('ModuleService', ['getModule']);
    moduleServiceSpy.getModule.and.returnValue(
      of({ options: { datalayers: [] } } as any)
    );

    await TestBed.configureTestingModule({
      imports: [ScenarioConfigListOverlayComponent],
      providers: [
        { provide: ScenarioState, useValue: scenarioStateSpy },
        { provide: ForsysService, useValue: forsysServiceSpy },
        { provide: DataLayersService, useValue: dataLayersServiceSpy },
        { provide: PlanState, useValue: planStateSpy },
        { provide: ModuleService, useValue: moduleServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioConfigListOverlayComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set configuration from the current scenario on init', () => {
    fixture.detectChanges();
    expect(component.configuration).toEqual(
      mockScenarioV3.configuration as any
    );
  });

  it('should use slope and distance-to-roads ids from forsys', () => {
    fixture.detectChanges();
    expect(component.slopeId).toBe(1);
    expect(component.distanceToRoadsId).toBe(2);
  });

  describe('close()', () => {
    it('should tell ScenarioState to hide the overlay', () => {
      fixture.detectChanges();
      component.close();
      expect(scenarioStateSpy.setDisplayOverlay).toHaveBeenCalledWith(false);
    });
  });

  describe('ngOnDestroy()', () => {
    it('should close the overlay on destroy', () => {
      fixture.detectChanges();
      spyOn(component, 'close');
      component.ngOnDestroy();
      expect(component.close).toHaveBeenCalled();
    });
  });

  describe('globalLoading$', () => {
    it('should emit true before any dependent streams have resolved', (done) => {
      let firstValue: boolean | undefined;
      const sub = component.globalLoading$.subscribe((v) => {
        if (firstValue === undefined) firstValue = v;
      });
      expect(firstValue).toBeTrue();
      sub.unsubscribe();
      done();
    });

    it('should emit false once all dependent streams have data', (done) => {
      fixture.detectChanges();
      const values: boolean[] = [];
      component.globalLoading$.subscribe((v) => {
        values.push(v);
        if (v === false) {
          expect(values).toContain(false);
          done();
        }
      });
    });
  });

  describe('priorityObjectives$', () => {
    it('should map priority_objectives (legacy) to a default weight of 1', (done) => {
      dataLayersServiceSpy.getDataLayersByIds.and.returnValue(
        of([makeDataLayer(10, 'Habitat Quality')])
      );
      currentScenario$.next({
        ...mockScenarioV3,
        configuration: {
          ...mockScenarioV3.configuration,
          priorities: [],
          priority_objectives: [10],
        },
      });
      fixture.detectChanges();

      component.priorityObjectives$.subscribe((result) => {
        expect(result).toEqual([{ name: 'Habitat Quality', weight: 1 }]);
        done();
      });
    });

    it('should prefer weighted `priorities` over `priority_objectives` when present', (done) => {
      dataLayersServiceSpy.getDataLayersByIds.and.returnValue(
        of([makeDataLayer(20, 'Some priority layer')])
      );
      currentScenario$.next({
        ...mockScenarioV3,
        configuration: {
          ...mockScenarioV3.configuration,
          priorities: [{ datalayer: 20, weight: 3 }],
          priority_objectives: [999],
        },
      });
      fixture.detectChanges();

      component.priorityObjectives$.subscribe((result) => {
        expect(result).toEqual([{ name: 'Some priority layer', weight: 3 }]);
        done();
      });
    });

    it('should drop priorities whose datalayer name could not be resolved', (done) => {
      dataLayersServiceSpy.getDataLayersByIds.and.returnValue(of([]));
      currentScenario$.next({
        ...mockScenarioV3,
        configuration: {
          ...mockScenarioV3.configuration,
          priorities: [{ datalayer: 999, weight: 1 }],
        },
      });
      fixture.detectChanges();

      component.priorityObjectives$.subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });
  });

  describe('cobenefits$', () => {
    it('should emit an empty array when there are no cobenefit ids', (done) => {
      fixture.detectChanges();
      component.cobenefits$.subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('should resolve cobenefit ids to names', (done) => {
      dataLayersServiceSpy.getDataLayersByIds.and.returnValue(
        of([makeDataLayer(5, 'Carbon Sequestration')])
      );
      currentScenario$.next({
        ...mockScenarioV3,
        configuration: {
          ...mockScenarioV3.configuration,
          cobenefits: [5],
        },
      });
      fixture.detectChanges();

      component.cobenefits$.subscribe((result) => {
        expect(result).toEqual(['Carbon Sequestration']);
        done();
      });
    });
  });

  describe('selectedIncludedAreas$ / selectedExcludedAreas$', () => {
    it('should resolve included area ids to names', (done) => {
      includedAreas$.next([{ id: 1, name: 'Some included area' }]);
      currentScenario$.next({
        ...mockScenarioV3,
        configuration: {
          ...mockScenarioV3.configuration,
          included_areas: [1],
        },
      });
      fixture.detectChanges();

      component.selectedIncludedAreas$.subscribe((result) => {
        if (result && result.length) {
          expect(result).toEqual(['Some included area']);
          done();
        }
      });
    });

    it('should resolve excluded area ids to names', (done) => {
      excludedAreas$.next([{ id: 2, name: 'Some Area to Exclude' }]);
      currentScenario$.next({
        ...mockScenarioV3,
        configuration: {
          ...mockScenarioV3.configuration,
          excluded_areas: [2],
        },
      });
      fixture.detectChanges();

      component.selectedExcludedAreas$.subscribe((result) => {
        expect(result).toEqual(['Some Area to Exclude']);
        done();
      });
    });

    it('should filter out ids that do not match any known area', (done) => {
      includedAreas$.next([{ id: 1, name: 'Some included area' }]);
      currentScenario$.next({
        ...mockScenarioV3,
        configuration: {
          ...mockScenarioV3.configuration,
          included_areas: [1, 42], // 42 has no matching area
        },
      });
      fixture.detectChanges();

      component.selectedIncludedAreas$.subscribe((result) => {
        if (result && result.length) {
          expect(result).toEqual(['Some included area']);
          done();
        }
      });
    });
  });

  describe('standardConstraints', () => {
    it('should only include constraints matching slope or distance-to-roads ids', () => {
      fixture.detectChanges();
      component.configuration = {
        ...mockScenarioV3.configuration,
        constraints: [
          { datalayer: 1, value: 30 }, // slope
          { datalayer: 2, value: 100 }, // distance to roads
          { datalayer: 999, value: 5 }, // unrelated, should be excluded
        ],
      } as any;

      expect(component.standardConstraints.length).toBe(2);
      expect(
        component.standardConstraints.some((c) => c.datalayer === 999)
      ).toBeFalse();
    });

    it('should return an empty array when there is no configuration', () => {
      component.configuration = null;
      expect(component.standardConstraints).toEqual([]);
    });
  });

  describe('scenarioHasPlanningApproachSubUnits$', () => {
    it('should be falsy when planning_approach is not a sub-units approach', (done) => {
      currentScenario$.next({
        ...mockScenarioV3,
        planning_approach: null,
      });
      fixture.detectChanges();

      component.scenarioHasPlanningApproachSubUnits$.subscribe((result) => {
        expect(result).toBeFalsy();
        done();
      });
    });
  });

  describe('legacy V1/V2 scenarios', () => {
    beforeEach(() => {
      currentScenario$.next(mockScenarioV2);
      fixture.detectChanges();
    });

    it('should still set `configuration` for a V2 record', () => {
      expect(component.configuration).toEqual(
        mockScenarioV2.configuration as any
      );
    });

    it('standardConstraints should be empty since V2 has no matching constraint entries', () => {
      expect(component.standardConstraints).toEqual([]);
    });

    it('should render the legacy slope line from max_slope in the template', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Slope less than or equal to (<=) 25%');
    });

    it('should render legacy Planning Area Acres / Budget targets instead of the V3 targets line', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Planning Area Acres');
      expect(text).toContain('5,000');
      expect(text).toContain('Planning Area Budget');
      expect(text).toContain('$123,456');
    });

    it('should not render the V3 "project areas of ... acres @ $... / acre" line', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('project areas of');
    });

    it('should render Distance from roads for legacy records', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Distance from roads');
    });

    it('should still show the treatment goal for non-custom legacy scenarios', (done) => {
      component.scenarioGoal$.subscribe((goal) => {
        expect(goal).toBe('Legacy Treatment Goal');
        done();
      });
    });
  });
});
