import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
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
  let loader: HarnessLoader;
  let fakeService: PlanService = jasmine.createSpyObj('PlanService', {
    listPlansByUser: of([fakePlan]),
  });
  let routerStub = () => ({ navigate: (array: string[]) => ({}) });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, MaterialModule],
      declarations: [PlanTableComponent],
      providers: [
        { provide: PlanService, useValue: fakeService },
        { provide: Router, useFactory: routerStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanTableComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch plans from the DB', () => {
    expect(fakeService.listPlansByUser).toHaveBeenCalled();
    expect(component.datasource.data).toEqual([fakePlan]);
  });

  it('create button should navigate to region selection', async () => {
    const routerStub: Router = fixture.debugElement.injector.get(Router);
    spyOn(routerStub, 'navigate').and.callThrough();
    const button = await loader.getHarness(MatButtonHarness);

    await button.click();

    expect(routerStub.navigate).toHaveBeenCalledOnceWith(['region']);
  });
});
