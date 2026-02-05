import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapRectangleComponent } from '@app/treatments/map-rectangle/map-rectangle.component';
import {
  GeoJSONSourceComponent,
  LayerComponent,
} from '@maplibre/ngx-maplibre-gl';
import { MockDeclarations } from 'ng-mocks';
import { LngLat, Map as MapLibreMap } from 'maplibre-gl';

describe('MapRectangleComponent', () => {
  let component: MapRectangleComponent;
  let fixture: ComponentFixture<MapRectangleComponent>;
  let setDataSpy: jasmine.Spy;
  let getSourceSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapRectangleComponent],
      declarations: MockDeclarations(GeoJSONSourceComponent, LayerComponent),
    }).compileComponents();

    fixture = TestBed.createComponent(MapRectangleComponent);
    component = fixture.componentInstance;
    setDataSpy = jasmine.createSpy('setData');
    getSourceSpy = jasmine
      .createSpy('getSource')
      .and.returnValue({ setData: setDataSpy });
    component.mapLibreMap = {
      getSource: getSourceSpy,
    } as unknown as MapLibreMap;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updates geometry when start and end are set', () => {
    component.start = new LngLat(1, 2);
    component.end = new LngLat(3, 4);

    component.ngOnChanges({
      start: new SimpleChange(null, component.start, false),
      end: new SimpleChange(null, component.end, false),
    });

    expect(getSourceSpy).toHaveBeenCalledWith(component.sourceName);
    expect(setDataSpy).toHaveBeenCalledWith(component.rectangleGeometry);
    expect(component.rectangleGeometry.coordinates).toEqual([
      [
        [1, 2],
        [1, 4],
        [3, 4],
        [3, 2],
        [1, 2],
      ],
    ]);
  });

  it('clears geometry when both start and end are null after initial change', () => {
    component.start = null;
    component.end = null;

    component.ngOnChanges({
      start: new SimpleChange(new LngLat(1, 2), null, false),
      end: new SimpleChange(new LngLat(3, 4), null, false),
    });

    expect(getSourceSpy).toHaveBeenCalledWith(component.sourceName);
    expect(setDataSpy).toHaveBeenCalledWith(component.rectangleGeometry);
    expect(component.rectangleGeometry.coordinates).toEqual([[]]);
  });

  it('does not update geometry when start or end is missing', () => {
    component.start = new LngLat(1, 2);
    component.end = null;

    component.ngOnChanges({
      start: new SimpleChange(null, component.start, false),
      end: new SimpleChange(null, component.end, false),
    });

    expect(getSourceSpy).not.toHaveBeenCalled();
    expect(setDataSpy).not.toHaveBeenCalled();
  });
});
