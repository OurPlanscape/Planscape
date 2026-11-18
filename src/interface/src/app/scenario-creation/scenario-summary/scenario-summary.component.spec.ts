import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioSummaryComponent } from './scenario-summary.component';
import { MockDeclaration } from 'ng-mocks';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SectionComponent } from '@styleguide';

describe('ScenarioSummaryComponent', () => {
  let component: ScenarioSummaryComponent;
  let fixture: ComponentFixture<ScenarioSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MockDeclaration(SectionComponent)],
      imports: [ScenarioSummaryComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('names the planning approach rather than showing its key', () => {
    component.planningApproach = 'PRIORITIZE_SUB_UNITS';
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Prioritize Sub-Units');
    expect(text).not.toContain('PRIORITIZE_SUB_UNITS');
  });

  it('leaves out the rows it was given nothing for', () => {
    expect(fixture.nativeElement.textContent).not.toContain(
      'Planning Approach'
    );
  });
});
