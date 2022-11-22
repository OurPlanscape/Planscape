import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StringifyMapConfigPipe } from './../../stringify-map-config.pipe';
import { MapNameplateComponent } from './map-nameplate.component';

describe('MapNameplateComponent', () => {
  let component: MapNameplateComponent;
  let fixture: ComponentFixture<MapNameplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MapNameplateComponent, StringifyMapConfigPipe],
    }).compileComponents();

    fixture = TestBed.createComponent(MapNameplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
