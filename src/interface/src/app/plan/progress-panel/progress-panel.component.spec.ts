import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MatTreeModule } from '@angular/material/tree';

import { ProgressPanelComponent } from './progress-panel.component';
import { Plan, Region } from '../../types';

describe('ProgressPanelComponent', () => {
  let component: ProgressPanelComponent;
  let fixture: ComponentFixture<ProgressPanelComponent>;
  let fakePlan: Plan;

  beforeEach(async () => {
    fakePlan = {
      id: 'fake',
      name: 'Shiba Resilience Plan',
      ownerId: 'fake',
      region: Region.SIERRA_NEVADA
    } as Plan;
    await TestBed.configureTestingModule({
      declarations: [ ProgressPanelComponent ],
      imports: [
        MatTreeModule,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProgressPanelComponent);
    component = fixture.componentInstance;
    component.plan = fakePlan;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('displays the plan name', () => {
    const titleEl = fixture.debugElement.query(By.css('.progress-title'));

    expect(titleEl.nativeElement.textContent).toBe(fakePlan.name);
  });

  it('changes the current task when clicked', () => {
    const nodes = fixture.debugElement.queryAll(By.css('.mat-tree-node'));

    nodes[1].nativeElement.click();

    expect(nodes.length).toBeGreaterThan(0);
    expect(component.currentTaskId).toEqual(2);
  });
});
