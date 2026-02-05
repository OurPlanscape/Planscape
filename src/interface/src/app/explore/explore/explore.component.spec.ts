import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreComponent } from './explore.component';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { NavBarComponent, SharedModule } from '@shared';
import { SyncedMapsComponent } from '@maplibre-map/synced-maps/synced-maps.component';
import { MatTabsModule } from '@angular/material/tabs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExploreStorageService } from '@services/local-storage.service';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';

describe('ExploreComponent', () => {
  let component: ExploreComponent;
  let fixture: ComponentFixture<ExploreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ExploreComponent,
        SharedModule,
        MatTabsModule,
        BrowserAnimationsModule,
      ],
      providers: [MockProviders(BreadcrumbService, ExploreStorageService)],
      declarations: [
        MockDeclarations(
          SyncedMapsComponent,
          NavBarComponent,
          BaseLayersComponent
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
