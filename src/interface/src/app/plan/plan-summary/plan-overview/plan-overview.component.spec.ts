import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MaterialModule } from 'src/app/material/material.module';

import { PlanModule } from './../../plan.module';
import { PlanOverviewComponent } from './plan-overview.component';

describe('PlanOverviewComponent', () => {
  let component: PlanOverviewComponent;
  let fixture: ComponentFixture<PlanOverviewComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MaterialModule,
        PlanModule,
        RouterTestingModule,
      ],
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

  it('clicking new configuration button should emit event', async () => {
    spyOn(component.openConfigEvent, 'emit');
    let createScenarioButton = await loader.getHarness(
      MatButtonHarness.with({ text: /NEW CONFIGURATION/ })
    );

    await createScenarioButton.click();

    expect(component.openConfigEvent.emit).toHaveBeenCalledOnceWith();
  });
});
