import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreMapComponent } from './explore-map.component';
import { MockProvider, MockProviders } from 'ng-mocks';
import { MultiMapConfigState } from '../multi-map-config.state';
import { MapConfigState } from '../map-config.state';
import { AuthService } from '@services';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

describe('ExploreMapComponent', () => {
  let component: ExploreMapComponent;
  let fixture: ComponentFixture<ExploreMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreMapComponent],
      providers: [
        MockProviders(MultiMapConfigState, AuthService),
        // alias the abstract token
        { provide: MapConfigState, useExisting: MultiMapConfigState },
        MockProvider(MultiMapConfigState, {
          selectedMapId$: new BehaviorSubject(3),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have isSelected$ as TRUE if map is selected', async () => {
    component.mapNumber = 3;
    fixture.detectChanges();
    const isSelected = await firstValueFrom(component.isSelected$);
    expect(isSelected).toBeTrue();
  });

  it('should have isSelected$ as FALSE if map is NOT selected', async () => {
    component.mapNumber = 1;
    fixture.detectChanges();
    const isSelected = await firstValueFrom(component.isSelected$);
    expect(isSelected).toBeFalse();
  });
});
