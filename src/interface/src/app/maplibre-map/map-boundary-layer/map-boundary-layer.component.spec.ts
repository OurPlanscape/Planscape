import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DrawService } from '../draw.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapBoundaryLayerComponent } from './map-boundary-layer.component';

describe('MapBoundaryLayerComponent', () => {
  let component: MapBoundaryLayerComponent;
  let fixture: ComponentFixture<MapBoundaryLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MapBoundaryLayerComponent],
      providers: [DrawService],
    }).compileComponents();

    fixture = TestBed.createComponent(MapBoundaryLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
