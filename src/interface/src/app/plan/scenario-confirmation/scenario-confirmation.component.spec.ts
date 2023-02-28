import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';

import { MaterialModule } from './../../material/material.module';
import { ScenarioConfirmationComponent } from './scenario-confirmation.component';

describe('ScenarioConfirmationComponent', () => {
  let component: ScenarioConfirmationComponent;
  let fixture: ComponentFixture<ScenarioConfirmationComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    const fakeRoute = jasmine.createSpyObj(
      'ActivatedRoute',
      {},
      {
        snapshot: {
          paramMap: convertToParamMap({ id: '1' }),
        },
      }
    );

    await TestBed.configureTestingModule({
      imports: [MaterialModule],
      declarations: [ScenarioConfirmationComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: fakeRoute,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioConfirmationComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('navigates to area overview when button is clicked', async () => {
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate');
    const buttonHarness = await loader.getHarness(MatButtonHarness);

    await buttonHarness.click();

    expect(router.navigate).toHaveBeenCalledOnceWith(['plan', '1']);
  });
});
