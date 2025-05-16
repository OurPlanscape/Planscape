import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreComponent } from './explore.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { AuthService } from '@services';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { NavBarComponent, SharedModule } from '@shared';

describe('ExploreComponent', () => {
  let component: ExploreComponent;
  let fixture: ComponentFixture<ExploreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreComponent, SharedModule],
      providers: [
        MockProviders(BreadcrumbService, MapConfigState, AuthService),
      ],
      declarations: [MockDeclarations(MapComponent, NavBarComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
