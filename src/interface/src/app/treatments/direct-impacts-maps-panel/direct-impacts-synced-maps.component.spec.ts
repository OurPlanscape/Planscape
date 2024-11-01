import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectImpactsSyncedMapsComponent } from './direct-impacts-synced-maps.component';
import { MockDeclarations } from 'ng-mocks';
import { DirectImpactsMapComponent } from '../direct-impacts-map/direct-impacts-map.component';

describe('DirectImpactsMapsPanelComponent', () => {
  let component: DirectImpactsSyncedMapsComponent;
  let fixture: ComponentFixture<DirectImpactsSyncedMapsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectImpactsSyncedMapsComponent],
      declarations: [MockDeclarations(DirectImpactsMapComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectImpactsSyncedMapsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
