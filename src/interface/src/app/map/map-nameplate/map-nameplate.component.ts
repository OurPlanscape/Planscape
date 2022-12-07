import { filter } from 'rxjs/operators';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { Component, Input, OnInit, AfterViewInit, AfterContentInit, AfterContentChecked, ChangeDetectorRef } from '@angular/core';
import { Map } from 'src/app/types';

const NAMEPLATE_RIGHT_MARGIN = 16;

@Component({
  selector: 'app-map-nameplate',
  templateUrl: './map-nameplate.component.html',
  styleUrls: ['./map-nameplate.component.scss'],
})
export class MapNameplateComponent implements OnInit {
  @Input() map: Map | null = null;
  @Input() selected: boolean = false;
  @Input() width$: Observable<number | null> = of(null);

  widthInPx: string = '100%';

  ngOnInit() {
    this.width$.pipe(filter(width => !!width)).subscribe(width => {
      // Timeout is required to avoid triggering changes too quickly,
      // which causes errors with Angular's change detection.
      setTimeout(() => {
        this.widthInPx = this.widthToPx(width);
      }, 0);
    });
  }

  /** Compute the maximum width of the nameplate, accounting for the Leaflet
   *  attribution control.
   */
  private widthToPx(width: number | null): string {
    if (width != null) {
      return Number(width - NAMEPLATE_RIGHT_MARGIN).toString().concat('px');
    }
    return '100%';
  }
}
