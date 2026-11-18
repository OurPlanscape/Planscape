import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, of } from 'rxjs';
import { SearchBarComponent } from '@styleguide';
import { TreatmentGoalsService } from '@services';
import { ScenarioGoal, ScenarioV3Config } from '@types';

import { ImprovedTreatmentGoalSelectorComponent } from './improved-treatment-goal-selector.component';
import { NewScenarioState } from '../new-scenario.state';

function goal(id: number, name: string, category: string): ScenarioGoal {
  return {
    id,
    name,
    description: `<p>About ${name}</p>`,
    priorities: [],
    category,
    group: '',
    group_text: '',
  };
}

const HIGH_INTENSITY_FIRE = goal(
  1,
  'Prioritize Areas with High Probability of High-Intensity Fire',
  'Fire Dynamics'
);
const WILDFIRE_HAZARD = goal(
  2,
  'Prioritize Areas with High Wildfire Hazard Potential',
  'Fire Dynamics'
);
const CARBON = goal(3, 'Maximize Carbon Storage', 'Carbon Storage');

const GOALS = [HIGH_INTENSITY_FIRE, WILDFIRE_HAZARD, CARBON];

describe('ImprovedTreatmentGoalSelectorComponent', () => {
  let component: ImprovedTreatmentGoalSelectorComponent;
  let fixture: ComponentFixture<ImprovedTreatmentGoalSelectorComponent>;
  let control: FormControl<number | null>;
  let scenarioConfig$: BehaviorSubject<Partial<ScenarioV3Config>>;

  async function setUp(goals: ScenarioGoal[] = GOALS) {
    TestBed.resetTestingModule();
    scenarioConfig$ = new BehaviorSubject<Partial<ScenarioV3Config>>({});

    await TestBed.configureTestingModule({
      imports: [ImprovedTreatmentGoalSelectorComponent, NoopAnimationsModule],
      providers: [
        MockProvider(TreatmentGoalsService, {
          getTreatmentGoals: () => of(goals),
        }),
        MockProvider(NewScenarioState, { scenarioConfig$ }),
        MockProvider(ActivatedRoute, {
          parent: { snapshot: { data: { planId: 24 } } } as any,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImprovedTreatmentGoalSelectorComponent);
    component = fixture.componentInstance;
    control = new FormControl<number | null>(null, Validators.required);
    component.control = control;
    fixture.detectChanges();
  }

  function goalLabels() {
    return fixture.debugElement
      .queryAll(By.css('sg-expander-item label'))
      .map((label) => label.nativeElement.textContent.trim());
  }

  function categoryTitles() {
    return fixture.debugElement
      .queryAll(By.css('sg-expander-section .title'))
      .map((title) => title.nativeElement.textContent.trim());
  }

  function counter() {
    return fixture.debugElement
      .query(By.css('.headline-hint'))
      .nativeElement.textContent.trim();
  }

  function openCategory(title: string) {
    const header = fixture.debugElement
      .queryAll(By.css('sg-expander-section .title'))
      .find((el) => el.nativeElement.textContent.trim() === title);
    header!.nativeElement.click();
    fixture.detectChanges();
  }

  function search(term: string) {
    fixture.debugElement
      .query(By.directive(SearchBarComponent))
      .componentInstance.searchString.emit(term);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setUp();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('groups every goal under its category', () => {
    expect(categoryTitles()).toEqual(['Fire Dynamics', 'Carbon Storage']);
  });

  it('keeps the goals of a category away until it is opened', () => {
    expect(goalLabels()).toEqual([]);

    openCategory('Fire Dynamics');

    expect(goalLabels()).toEqual([
      HIGH_INTENSITY_FIRE.name,
      WILDFIRE_HAZARD.name,
    ]);
  });

  describe('picking a goal', () => {
    it('writes the goal into the control and counts it', () => {
      expect(counter()).toBe('0/1 Selected');

      component.selectGoal(WILDFIRE_HAZARD.id);
      fixture.detectChanges();

      expect(control.value).toBe(WILDFIRE_HAZARD.id);
      expect(counter()).toBe('1/1 Selected');
    });

    it('replaces the goal already picked instead of adding to it', () => {
      component.selectGoal(WILDFIRE_HAZARD.id);
      component.selectGoal(CARBON.id);
      fixture.detectChanges();

      expect(control.value).toBe(CARBON.id);
      expect(counter()).toBe('1/1 Selected');
    });

    it('names the picked goal on a chip that gives it back', () => {
      component.selectGoal(WILDFIRE_HAZARD.id);
      fixture.detectChanges();

      const chip = fixture.debugElement.query(By.css('mat-chip-row'));

      expect(chip.nativeElement.textContent).toContain(WILDFIRE_HAZARD.name);

      component.clearGoal();
      fixture.detectChanges();

      expect(control.value).toBeNull();
      expect(fixture.debugElement.query(By.css('mat-chip-row'))).toBeNull();
      expect(counter()).toBe('0/1 Selected');
    });

    it('cuts a goal name too long for the chip, keeping it for the hover', () => {
      component.selectGoal(HIGH_INTENSITY_FIRE.id);
      fixture.detectChanges();

      const label = fixture.debugElement.query(By.css('.chip-label'));

      expect(label.nativeElement.getAttribute('title')).toBe(
        HIGH_INTENSITY_FIRE.name
      );
    });

    it('marks the control touched so the step can complain', () => {
      expect(control.touched).toBeFalse();

      component.selectGoal(WILDFIRE_HAZARD.id);

      expect(control.touched).toBeTrue();
    });
  });

  describe('searching', () => {
    it('keeps only the goals that match, and the categories left with any', () => {
      search('wildfire');

      expect(goalLabels()).toEqual([WILDFIRE_HAZARD.name]);
      expect(categoryTitles()).toEqual(['Fire Dynamics']);
    });

    it('opens the sections while a search is on, so the matches show', () => {
      expect(fixture.debugElement.query(By.css('.title.open'))).toBeNull();

      search('fire');

      expect(
        fixture.debugElement.queryAll(By.css('.title.open')).length
      ).toBeGreaterThan(0);
    });

    it('ignores case and surrounding space', () => {
      search('  CARBON ');

      expect(goalLabels()).toEqual([CARBON.name]);
    });

    it('says so when nothing matches', () => {
      search('nothing like this');

      expect(goalLabels()).toEqual([]);
      expect(
        fixture.debugElement.query(By.css('sg-no-results')).nativeElement
          .textContent
      ).toContain('nothing like this');
    });

    it('brings every category back once the search is cleared', () => {
      search('wildfire');

      expect(categoryTitles()).toEqual(['Fire Dynamics']);

      search('');

      expect(categoryTitles()).toEqual(['Fire Dynamics', 'Carbon Storage']);
    });
  });

  describe('a draft that already had a goal', () => {
    it('picks it back up', async () => {
      await setUp();
      scenarioConfig$.next({ treatment_goal: CARBON.id } as ScenarioV3Config);
      fixture.detectChanges();

      expect(control.value).toBe(CARBON.id);
      expect(counter()).toBe('1/1 Selected');
    });

    it('warns when that goal is no longer on offer', async () => {
      await setUp([CARBON]);
      scenarioConfig$.next({
        treatment_goal: WILDFIRE_HAZARD.id,
      } as ScenarioV3Config);
      fixture.detectChanges();

      expect(component.mappableGoal).toBeFalse();
      expect(fixture.debugElement.query(By.css('sg-banner'))).not.toBeNull();
    });
  });
});
