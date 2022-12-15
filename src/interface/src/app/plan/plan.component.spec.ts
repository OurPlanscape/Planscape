import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { Router } from '@angular/router';

import { PlanComponent } from './plan.component';

describe('PlanComponent', () => {
  let component: PlanComponent;
  let fixture: ComponentFixture<PlanComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    const routerStub = () => ({ navigate: (array: string[]) => ({}) });

    await TestBed.configureTestingModule({
      declarations: [PlanComponent],
      providers: [{ provide: Router, useFactory: routerStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('expand map button', () => {
    it('should navigate to map view when clicked'),
      async () => {
        const routerStub: Router = fixture.debugElement.injector.get(Router);
        spyOn(routerStub, 'navigate').and.callThrough();
        const button = await loader.getHarness(
          MatButtonHarness.with({ text: 'EXPAND MAP' })
        );

        await button.click();

        expect(routerStub.navigate).toHaveBeenCalledOnceWith(['map']);
      };
  });
});
