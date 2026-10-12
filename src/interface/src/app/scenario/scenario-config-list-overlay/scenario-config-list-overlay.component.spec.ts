import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ScenarioConfigListOverlayComponent } from './scenario-config-list-overlay.component';
import { ScenarioState } from '../scenario.state';
import { ScenarioService } from '@services';
import { ForsysService } from '@services/forsys.service';
import {
  PLANNING_APPROACH,
  Scenario,
  SCENARIO_TYPE,
  ScenarioConfigurationDetails,
} from '@types';
import { MOCK_SCENARIO } from '@app/services/mocks';

const SLOPE_ID = 2814;
const ROADS_ID = 2815;
const SUB_UNITS_APPROACH: { key: PLANNING_APPROACH; label: string } = {
  key: 'PRIORITIZE_SUB_UNITS',
  label: 'Prioritize Sub-Units',
};

const makeScenario = (overrides: Partial<Scenario> = {}): Scenario => ({
  ...MOCK_SCENARIO,
  ...overrides,
});

const makeConfig = (
  overrides: Partial<ScenarioConfigurationDetails> = {}
): ScenarioConfigurationDetails => ({
  version: 'V3',
  type: 'PRESET',
  planning_area: { id: 6167, name: 'Example Planning Area' },
  stand_size: { key: 'MEDIUM', label: 'Medium', acres: 100 },
  planning_approach: {
    key: 'OPTIMIZE_PROJECT_AREAS',
    label: 'Optimize Project Areas',
  },
  sub_units_layer: null,
  treatment_goal: { id: 1111, name: 'Test Treatment Goal' },
  priority_objectives: [{ id: 999, name: 'Example Objective', weight: 1 }],
  cobenefits: [
    { id: 12, name: 'Cobenefit 1' },
    { id: 13, name: 'Cobenefit 2' },
  ],
  treatment_goal_constraints: [],
  included_areas: [
    { id: 200, name: 'Included Area 1' },
    { id: 201, name: 'Included Area 2' },
  ],
  excluded_areas: [{ id: 300, name: 'Area to Exclude' }],
  stand_level_constraints: [
    {
      datalayer: { id: ROADS_ID, name: 'Distance From Roads - Yards' },
      operator: 'lte',
      value: '1000',
    },
    {
      datalayer: { id: SLOPE_ID, name: 'CONUS Slope Percentage' },
      operator: 'lt',
      value: '99',
    },
  ],
  advanced_stand_level_constraints: [
    {
      datalayer: { id: 2827, name: 'Some Adv Constraint Layer' },
      operator: 'dne',
      value: '1000',
    },
  ],
  targets: {
    max_area: 1000,
    max_project_count: 100,
    estimated_cost: 2470,
    max_budget: null,
    sub_units_fixed_target: null,
    sub_units_target_value: null,
  },
  ...overrides,
});

describe('ScenarioConfigListOverlayComponent', () => {
  let fixture: ComponentFixture<ScenarioConfigListOverlayComponent>;
  let el: HTMLElement;
  let scenarioState: ScenarioState;
  let scenarioService: ScenarioService;
  let currentScenario$: BehaviorSubject<Scenario> =
    new BehaviorSubject<Scenario>({ ...MOCK_SCENARIO, id: 42 });
  let displayOverlay$: BehaviorSubject<boolean>;
  let config$: Subject<ScenarioConfigurationDetails>;

  const dt = (label: string) =>
    Array.from(el.querySelectorAll('dt')).find(
      (n) => n.textContent?.trim() === label
    ) as HTMLElement | undefined;
  const dd = (label: string) =>
    dt(label)?.nextElementSibling as HTMLElement | undefined;
  const text = (label: string) =>
    dd(label)?.textContent?.replace(/\s+/g, ' ').trim();
  const items = (label: string) =>
    Array.from(dd(label)?.querySelectorAll('li') ?? []).map((li) =>
      li.textContent?.replace(/\s+/g, ' ').trim()
    );

  const emitConfig = (config = makeConfig()) => {
    config$.next(config);
    fixture.detectChanges();
  };

  beforeEach(() => {
    displayOverlay$ = new BehaviorSubject(true);
    config$ = new Subject();

    TestBed.configureTestingModule({
      imports: [ScenarioConfigListOverlayComponent],
      providers: [
        MockProvider(ScenarioState, {
          displayConfigOverlay$: displayOverlay$,
          currentScenario$: currentScenario$,
        }),
        MockProvider(ScenarioService),
        MockProvider(ForsysService, {
          forsysData$: of({
            thresholds: {
              slope: { id: SLOPE_ID },
              distance_from_roads: { id: ROADS_ID },
            },
          }),
        } as Partial<ForsysService>),
      ],
    });

    scenarioState = TestBed.inject(ScenarioState);
    scenarioService = TestBed.inject(ScenarioService);
    spyOn(scenarioState, 'setDisplayOverlay');
    spyOn(scenarioService, 'getScenarioConfiguration').and.returnValue(config$);

    fixture = TestBed.createComponent(ScenarioConfigListOverlayComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('loading and error states', () => {
    it('shows the spinner and no content while loading', () => {
      expect(el.querySelector('mat-spinner')).toBeTruthy();
      expect(el.querySelector('dl')).toBeNull();
    });

    it('renders content and hides the spinner once loaded', () => {
      emitConfig();
      expect(el.querySelector('mat-spinner')).toBeNull();
      expect(el.querySelector('dl')).toBeTruthy();
    });

    it('shows an error message when the request fails', () => {
      config$.error(new Error('boom'));
      fixture.detectChanges();
      expect(el.textContent).toContain("Couldn't load the configuration.");
      expect(el.querySelector('mat-spinner')).toBeNull();
      expect(el.querySelector('dl')).toBeNull();
    });

    it('refetches when the current scenario changes', () => {
      const newScenario = { ...MOCK_SCENARIO, id: 99 };
      currentScenario$.next(newScenario);
      expect(scenarioService.getScenarioConfiguration).toHaveBeenCalledWith(99);
    });

    it('renders nothing when the overlay is hidden', () => {
      displayOverlay$.next(false);
      fixture.detectChanges();
      expect(el.querySelector('.header')).toBeNull();
    });
  });

  describe('expected fields', () => {
    beforeEach(() => emitConfig());

    it('renders approach, stand size, planning area and goal', () => {
      expect(text('Planning Approach')).toContain('Optimize Project Areas');
      expect(text('Stand Size')).toContain('Medium (100 acres)');
      expect(text('Planning Area')).toContain('Example Planning Area');
      expect(text('Treatment Goal')).toContain('Test Treatment Goal');
    });

    it('omits Treatment Goal when treatment_goal is null', () => {
      emitConfig(makeConfig({ treatment_goal: null as any }));
      expect(dt('Treatment Goal')).toBeUndefined();
    });

    it('renders the subunit layer only when present', () => {
      expect(dt('Subunit')).toBeUndefined();
      emitConfig(
        makeConfig({ sub_units_layer: { id: 5, name: 'Some Subunits Layer' } })
      );
      expect(text('Subunit')).toContain('Some Subunits Layer');
    });

    it('lists co-benefits and included/excluded areas by name', () => {
      expect(items('Co-Benefits')).toEqual(['Cobenefit 1', 'Cobenefit 2']);
      expect(items('Included Areas')).toEqual([
        'Included Area 1',
        'Included Area 2',
      ]);
      expect(items('Excluded Areas')).toEqual(['Area to Exclude']);
    });

    it('hides list sections when their arrays are empty', () => {
      emitConfig(
        makeConfig({
          priority_objectives: [],
          cobenefits: [],
          included_areas: [],
          excluded_areas: [],
          stand_level_constraints: [],
          advanced_stand_level_constraints: [],
        })
      );
      [
        'Priority Objectives',
        'Co-Benefits',
        'Included Areas',
        'Excluded Areas',
        'Stand-Level Constraints',
        'Advanced Stand-Level Constraints',
      ].forEach((label) => expect(dt(label)).toBeUndefined());
    });
  });

  describe('priority objectives', () => {
    it('shows weights when there are multiple objectives', () => {
      emitConfig(
        makeConfig({
          priority_objectives: [
            { id: 1, name: 'A', weight: 1 },
            { id: 2, name: 'B', weight: 3 },
          ],
        })
      );
      expect(items('Priority Objectives')).toEqual(['A (1x)', 'B (3x)']);
    });
  });

  describe('stand-level constraints', () => {
    beforeEach(() => emitConfig());

    it('renders the hardcoded slope and roads wording', () => {
      const rows = items('Stand-Level Constraints');
      expect(rows).toContain('Distance from roads is less than (<) 1,000 yds');
      expect(rows).toContain('Slope less than or equal to (<=) 99 %');
    });

    it('renders advanced constraints with the generic display name', () => {
      const [row] = items('Advanced Stand-Level Constraints');
      expect(row).toContain('Some Adv Constraint Layer:');
      expect(row).toContain('!=');
      expect(row).toContain('1000');
    });

    it('formats "between" constraints as a min-max range', () => {
      emitConfig(
        makeConfig({
          advanced_stand_level_constraints: [
            {
              datalayer: { id: 1, name: 'Layer' },
              operator: 'btw',
              value: '20,10',
            },
          ],
        })
      );
      expect(items('Advanced Stand-Level Constraints')).toEqual([
        'Layer: 10-20',
      ]);
    });
  });

  describe('treatment target', () => {
    it('renders project areas, acres and cost per acre by default', () => {
      emitConfig();
      expect(text('Treatment Target')).toContain(
        '100 project areas of 1,000 acres @ $2,470 / acre'
      );
    });

    describe('with sub-units', () => {
      const subUnitConfig = (
        targets: Partial<ScenarioConfigurationDetails['targets']>
      ) =>
        makeConfig({
          planning_approach: SUB_UNITS_APPROACH,
          targets: { ...makeConfig().targets, ...targets },
        });

      it('shows acres when the target is fixed', () => {
        emitConfig(
          subUnitConfig({
            sub_units_fixed_target: true as any,
            sub_units_target_value: 250,
          })
        );
        expect(text('Treatment Target')).toContain(
          'Targeted area within each subunit:'
        );
        expect(text('Treatment Target')).toContain('250 Acres');
      });

      it('shows a percentage when the target is not fixed', () => {
        emitConfig(
          subUnitConfig({
            sub_units_fixed_target: null,
            sub_units_target_value: 25,
          })
        );
        expect(text('Treatment Target')).toContain('25%');
      });

      it('does not render the project-area wording', () => {
        emitConfig(subUnitConfig({}));
        expect(text('Treatment Target')).not.toContain('project areas');
      });
    });
  });

  describe('PRESET indent', () => {
    const indented = [
      'Priority Objectives',
      'Co-Benefits',
      'Stand-Level Constraints',
    ];
    const wrapper = () => el.querySelector('.indented-section');

    const emitForType = (type: SCENARIO_TYPE) => {
      currentScenario$.next(makeScenario({ type } as Partial<Scenario>));
      emitConfig(makeConfig({ type }));
    };

    it('wraps the three sections in an indented section for PRESET', () => {
      emitForType('PRESET');
      expect(wrapper()).toBeTruthy();
      indented.forEach((label) =>
        expect(wrapper()!.contains(dt(label)!)).toBe(true)
      );
    });

    it('does not wrap them for custom scenarios', () => {
      emitForType('CUSTOM');
      expect(wrapper()).toBeNull();
      indented.forEach((label) => expect(dt(label)).toBeTruthy()); // still rendered
    });

    it('keeps other sections outside the wrapper', () => {
      emitForType('PRESET');
      expect(wrapper()!.contains(dt('Included Areas')!)).toBe(false);
      expect(wrapper()!.contains(dt('Advanced Stand-Level Constraints')!)).toBe(
        false
      );
    });
  });

  describe('closing', () => {
    it('hides the overlay when Close is clicked', () => {
      emitConfig();
      el.querySelector<HTMLButtonElement>('.scenario-config-button')!.click();
      expect(scenarioState.setDisplayOverlay).toHaveBeenCalledWith(false);
    });

    it('hides the overlay on destroy', () => {
      fixture.destroy();
      expect(scenarioState.setDisplayOverlay).toHaveBeenCalledWith(false);
    });
  });
});
