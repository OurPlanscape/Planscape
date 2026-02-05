import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DrawService } from '@app/maplibre-map/draw.service';
import { MapDrawingToolboxComponent } from '@app/maplibre-map/map-drawing-toolbox/map-drawing-toolbox.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';

describe('MapDrawingToolboxComponent', () => {
  let component: MapDrawingToolboxComponent;
  let fixture: ComponentFixture<MapDrawingToolboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [MockProvider(DrawService)],
      declarations: [MockDeclarations(ControlComponent)],
      imports: [MapDrawingToolboxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapDrawingToolboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
