import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { BehaviorSubject } from 'rxjs';

import {
  MapNameplateComponent,
  NAMEPLATE_RIGHT_MARGIN,
} from './map-nameplate.component';
import { StringifyMapConfigPipe } from '../stringify-map-config.pipe';

describe('MapNameplateComponent', () => {
  let component: MapNameplateComponent;
  let fixture: ComponentFixture<MapNameplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MapNameplateComponent, StringifyMapConfigPipe],
      imports: [MatTooltipModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MapNameplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate width in px', () => {
    expect(component.widthInPx).toEqual('100%');

    component.width$ = new BehaviorSubject<number | null>(
      40 + NAMEPLATE_RIGHT_MARGIN
    );
    component.ngAfterViewInit();

    (component.width$ as BehaviorSubject<number | null>).next(
      40 + NAMEPLATE_RIGHT_MARGIN
    );

    setTimeout(() => {
      expect(component.widthInPx).toEqual('40px');
    }, 0);
  });
});
