import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreMapComponent } from './explore-map.component';
import { MockProviders } from 'ng-mocks';
import { MultiMapConfigState } from '../multi-map-config.state';
import { MapConfigState } from '../map-config.state';
import { AuthService } from '@services';

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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
