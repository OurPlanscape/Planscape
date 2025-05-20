import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SyncedMapsComponent } from './synced-maps.component';
import { MockDeclaration, MockProvider } from 'ng-mocks';
import { MultiMapConfigState } from '../multi-map-config.state';
import { ExploreMapComponent } from '../explore-map/explore-map.component';
import { of } from 'rxjs';

describe('SyncedMapsComponent', () => {
  let component: SyncedMapsComponent;
  let fixture: ComponentFixture<SyncedMapsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncedMapsComponent],
      providers: [
        MockProvider(MultiMapConfigState, {
          layoutMode$: of(1 as any),
        }),
      ],
      declarations: [MockDeclaration(ExploreMapComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(SyncedMapsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
