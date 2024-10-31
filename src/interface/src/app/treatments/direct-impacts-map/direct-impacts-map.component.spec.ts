import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectImpactsMapComponent } from './direct-impacts-map.component';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { MapConfigState } from '../treatment-map/map-config.state';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { AuthService } from '@services';

describe('DirectImpactsMapComponent', () => {
  let component: DirectImpactsMapComponent;
  let fixture: ComponentFixture<DirectImpactsMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectImpactsMapComponent],
      providers: [MockProviders(MapConfigState, AuthServ ice)],
      declarations: [MockDeclarations(MapComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectImpactsMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
