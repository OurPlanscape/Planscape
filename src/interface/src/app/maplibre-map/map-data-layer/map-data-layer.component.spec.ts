import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapDataLayerComponent } from './map-data-layer.component';

describe('MapDataLayerComponent', () => {
  let component: MapDataLayerComponent;
  let fixture: ComponentFixture<MapDataLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapDataLayerComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MapDataLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
