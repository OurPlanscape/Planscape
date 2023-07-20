import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { BehaviorSubject } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';

import { SessionService } from '../../services';
import { Region } from '../../types';
import { RegionSelectionComponent } from './region-selection.component';

describe('RegionSelectionComponent', () => {
  let component: RegionSelectionComponent;
  let fixture: ComponentFixture<RegionSelectionComponent>;
  let loader: HarnessLoader;
  let mockSessionService: Partial<SessionService>;

  beforeEach(async () => {
    mockSessionService = {
      region$: new BehaviorSubject<Region | null>(null),
      setRegion: () => {},
    };

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MaterialModule],
      declarations: [RegionSelectionComponent],
      providers: [{ provide: SessionService, useValue: mockSessionService }],
    }).compileComponents();

    fixture = TestBed.createComponent(RegionSelectionComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set available region', async () => {
    const setRegionSpy = spyOn<any>(mockSessionService, 'setRegion');
    const sierraNevadaButton: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: /SIERRA NEVADA/ })
    );

    await sierraNevadaButton.click();

    expect(setRegionSpy).toHaveBeenCalledWith(Region.SIERRA_NEVADA);
  });

  it('should disable unavailable regions', async () => {
    const regionButtons: MatButtonHarness[] = await loader.getAllHarnesses(
      MatButtonHarness
    );

    for (let regionButton of regionButtons) {
      if ((await regionButton.getText()).match(/(SIERRA NEVADA)|(SOUTHERN CALIFORNIA)|(CENTRAL COAST)/)) {
        expect(await regionButton.isDisabled()).toBeFalse();
      } else {
        expect(await regionButton.isDisabled()).toBeTrue();
      }
    }
  });
});
