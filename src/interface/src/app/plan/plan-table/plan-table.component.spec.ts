import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material/material.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PlanPreview, Region } from 'src/app/types';

import { PlanService } from './../../services/plan.service';
import { PlanTableComponent } from './plan-table.component';

describe('PlanTableComponent', () => {
  const fakePlan: PlanPreview = {
    id: 'temp',
    name: 'somePlan',
    region: Region.SIERRA_NEVADA,
  };

  let component: PlanTableComponent;
  let fixture: ComponentFixture<PlanTableComponent>;
  let fakeService: PlanService = jasmine.createSpyObj('PlanService', {
    listPlansByUser: of([fakePlan]),
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, MaterialModule],
      declarations: [PlanTableComponent],
      providers: [{ provide: PlanService, useValue: fakeService }],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch plans from the DB', () => {
    expect(fakeService.listPlansByUser).toHaveBeenCalled();
    expect(component.datasource.data).toEqual([fakePlan]);
  });
});
