import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreComponent } from './explore.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { NavBarComponent, SharedModule } from '@shared';
import { SyncedMapsComponent } from '../../maplibre-map/synced-maps/synced-maps.component';

describe('ExploreComponent', () => {
  let component: ExploreComponent;
  let fixture: ComponentFixture<ExploreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreComponent, SharedModule],
      providers: [MockProviders(BreadcrumbService)],
      declarations: [MockDeclarations(SyncedMapsComponent, NavBarComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
