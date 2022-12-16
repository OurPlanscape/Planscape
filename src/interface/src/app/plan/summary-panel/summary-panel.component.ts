import { Component, Input, OnInit } from '@angular/core';
import * as L from 'leaflet';

import { Plan, Region } from '../../types';

@Component({
  selector: 'summary-panel',
  templateUrl: './summary-panel.component.html',
  styleUrls: ['./summary-panel.component.scss']
})
export class SummaryPanelComponent implements OnInit {
  @Input() plan: Plan | null = null;

  constructor() { }

  ngOnInit(): void {
    this.plan = {
      id: 'fake',
      name: 'placeholder plan name',
      ownerId: 'fake',
      region: Region.SIERRA_NEVADA,
      planningArea: new L.Polygon([
        new L.LatLng(38.715517043571914, -120.42857302225725),
        new L.LatLng(38.47079787227401, -120.5164425608172),
        new L.LatLng(38.52668443555346, -120.11828371421737),
      ]).toGeoJSON(),
    };
  }

}
