import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { DataLayer, ScenarioGoal, UsageType } from '@types';

import { TreatmentGoalDetailsComponent } from './treatment-goal-details.component';

function layer(
  id: number,
  name: string,
  dataset = 'California Landscape Metrics'
) {
  return { id, name, dataset: { id: 1, name: dataset } } as DataLayer;
}

const FIRE_SEVERITY = layer(10, 'Probability of Fire Severity - High');
const STRUCTURE_EXPOSURE = layer(11, 'Structure Exposure Source');
const CARBON = layer(12, 'Total Aboveground Carbon', '');
const FLAME_LENGTH = layer(13, 'Probability of Fire Severity High');

function goalWith(usageTypes: UsageType[]): ScenarioGoal {
  return {
    id: 1,
    name: 'Prioritize Areas w/ High Wildfire Hazard Potential',
    description: '<p>Identify and prioritize treatment areas.</p>',
    priorities: [],
    category: 'Fire Dynamics',
    group: '',
    group_text: '',
    usage_types: usageTypes,
  };
}

const FULL_GOAL = goalWith([
  { usage_type: 'PRIORITY', datalayer: FIRE_SEVERITY },
  { usage_type: 'SECONDARY_METRIC', datalayer: STRUCTURE_EXPOSURE },
  { usage_type: 'SECONDARY_METRIC', datalayer: CARBON },
  { usage_type: 'THRESHOLD', datalayer: FLAME_LENGTH },
]);

describe('TreatmentGoalDetailsComponent', () => {
  let component: TreatmentGoalDetailsComponent;
  let fixture: ComponentFixture<TreatmentGoalDetailsComponent>;
  let viewedDataLayer$: BehaviorSubject<DataLayer | null>;
  let selectDataLayer: jasmine.Spy;

  async function renderWith(goal: ScenarioGoal) {
    TestBed.resetTestingModule();
    viewedDataLayer$ = new BehaviorSubject<DataLayer | null>(null);
    selectDataLayer = jasmine.createSpy('selectDataLayer');

    await TestBed.configureTestingModule({
      imports: [TreatmentGoalDetailsComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          viewedDataLayer$,
          selectDataLayer,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentGoalDetailsComponent);
    component = fixture.componentInstance;
    component.goal = goal;
    fixture.detectChanges();
  }

  function groupLabels() {
    return fixture.debugElement
      .queryAll(By.css('.group-label'))
      .map((el) => el.nativeElement.textContent.trim());
  }

  function layerNames() {
    return fixture.debugElement
      .queryAll(By.css('.layer-name'))
      .map((el) => el.nativeElement.textContent.trim());
  }

  function toggles() {
    return fixture.debugElement.queryAll(By.css('sg-toggle input'));
  }

  beforeEach(async () => {
    await renderWith(FULL_GOAL);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the panel to the size the design asks for', () => {
    const styles = getComputedStyle(fixture.nativeElement);

    expect(styles.width).toBe('500px');
    expect(styles.minHeight).toBe('500px');
    expect(styles.maxHeight).toBe('600px');
  });

  it('fills the preview box so it reads apart from the panel', () => {
    const box = fixture.debugElement.query(By.css('.preview-layers'));
    const fill = getComputedStyle(box.nativeElement).backgroundColor;

    expect(fill).not.toBe('rgba(0, 0, 0, 0)');
    expect(fill).not.toBe(
      getComputedStyle(fixture.nativeElement).backgroundColor
    );
  });

  it('sorts the layers into the groups the design names', () => {
    expect(groupLabels()).toEqual([
      'Priority Objective',
      'Co-Benefits',
      'Stand-Level Constraint',
    ]);
    expect(layerNames()).toEqual([
      FIRE_SEVERITY.name,
      STRUCTURE_EXPOSURE.name,
      CARBON.name,
      FLAME_LENGTH.name,
    ]);
  });

  it('names the dataset each layer comes from, when it has one', () => {
    const sources = fixture.debugElement
      .queryAll(By.css('.layer-source'))
      .map((el) => el.nativeElement.textContent.trim());

    expect(sources).toEqual([
      'California Landscape Metrics',
      'California Landscape Metrics',
      'California Landscape Metrics',
    ]);
  });

  it('leaves out a group the goal has no layers for', async () => {
    await renderWith(
      goalWith([{ usage_type: 'PRIORITY', datalayer: FIRE_SEVERITY }])
    );

    expect(groupLabels()).toEqual(['Priority Objective']);
  });

  it('skips a usage that arrived as a bare layer name', async () => {
    await renderWith(
      goalWith([
        { usage_type: 'PRIORITY', datalayer: FIRE_SEVERITY },
        { usage_type: 'SECONDARY_METRIC', datalayer: 'Total Live Tree Volume' },
      ])
    );

    expect(groupLabels()).toEqual(['Priority Objective']);
    expect(layerNames()).toEqual([FIRE_SEVERITY.name]);
  });

  it('says nothing about preview layers when the goal has none', async () => {
    await renderWith(goalWith([]));

    expect(fixture.debugElement.query(By.css('.preview-layers'))).toBeNull();
  });

  describe('previewing a layer', () => {
    it('puts it on the map', () => {
      toggles()[1].nativeElement.click();

      expect(selectDataLayer).toHaveBeenCalledWith(STRUCTURE_EXPOSURE);
    });

    it('takes it off the map when switched back off', () => {
      viewedDataLayer$.next(FIRE_SEVERITY);
      fixture.detectChanges();

      toggles()[0].nativeElement.click();

      expect(selectDataLayer).toHaveBeenCalledWith(null);
    });

    it('shows which layer the map is already on', () => {
      viewedDataLayer$.next(CARBON);
      fixture.detectChanges();

      expect(toggles().map((t) => t.nativeElement.checked)).toEqual([
        false,
        false,
        true,
        false,
      ]);
    });
  });

  describe('a layer the goal uses twice', () => {
    const SHARED = goalWith([
      { usage_type: 'SECONDARY_METRIC', datalayer: CARBON },
      { usage_type: 'THRESHOLD', datalayer: CARBON },
    ]);

    beforeEach(async () => {
      await renderWith(SHARED);
    });

    it('lists it under both groups', () => {
      expect(groupLabels()).toEqual(['Co-Benefits', 'Stand-Level Constraint']);
      expect(layerNames()).toEqual([CARBON.name, CARBON.name]);
    });

    it('lights only the row that was switched on', () => {
      toggles()[0].nativeElement.click();
      viewedDataLayer$.next(CARBON);
      fixture.detectChanges();

      expect(toggles().map((t) => t.nativeElement.checked)).toEqual([
        true,
        false,
      ]);
    });

    it('lights the other row when that is the one switched on', () => {
      toggles()[1].nativeElement.click();
      viewedDataLayer$.next(CARBON);
      fixture.detectChanges();

      expect(toggles().map((t) => t.nativeElement.checked)).toEqual([
        false,
        true,
      ]);
    });

    it('lights neither when the map was pointed at it from elsewhere', () => {
      viewedDataLayer$.next(CARBON);
      fixture.detectChanges();

      expect(toggles().map((t) => t.nativeElement.checked)).toEqual([
        false,
        false,
      ]);
    });
  });

  it('drops the row it was lighting once the map moves on', () => {
    toggles()[0].nativeElement.click();
    fixture.detectChanges();

    viewedDataLayer$.next(STRUCTURE_EXPOSURE);
    fixture.detectChanges();

    expect(toggles().map((t) => t.nativeElement.checked)).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });

  it('asks to be closed', () => {
    const closed = jasmine.createSpy('closed');
    component.closed.subscribe(closed);

    fixture.debugElement.query(By.css('.close-button')).nativeElement.click();

    expect(closed).toHaveBeenCalled();
  });
});
