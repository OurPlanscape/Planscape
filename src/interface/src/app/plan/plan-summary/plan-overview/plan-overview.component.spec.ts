import { MaterialModule } from 'src/app/material/material.module';
import { MatButtonHarness } from '@angular/material/button/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanModule } from './../../plan.module';
import { PlanOverviewComponent } from './plan-overview.component';

describe('PlanOverviewComponent', () => {
  let component: PlanOverviewComponent;
  let fixture: ComponentFixture<PlanOverviewComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MaterialModule, PlanModule],
      declarations: [PlanOverviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanOverviewComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('clicking create scenario button should emit event', async () => {
    spyOn(component.openConfigEvent, 'emit');
    let createScenarioButton = await loader.getHarness(
      MatButtonHarness.with({ text: 'CREATE A NEW SCENARIO' })
    );

    await createScenarioButton.click();

    expect(component.openConfigEvent.emit).toHaveBeenCalledOnceWith();
  });
});
