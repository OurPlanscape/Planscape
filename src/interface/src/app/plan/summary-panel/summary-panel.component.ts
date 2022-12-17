import { Component, Input, OnInit } from '@angular/core';
import * as L from 'leaflet';

import { Plan, Region } from '../../types';

export interface SummaryInput {
  id?: string;
  type: string;
  name: string;
  owner: string;
  region: Region;
  area: GeoJSON.GeoJSON;
  status?: string;
  createdTime: string;
  updatedTime: string;
}

@Component({
  selector: 'summary-panel',
  templateUrl: './summary-panel.component.html',
  styleUrls: ['./summary-panel.component.scss']
})
export class SummaryPanelComponent implements OnInit {
  @Input() summaryInput: SummaryInput | null = null;

  constructor() { }

  ngOnInit(): void {
    // todo: pass the summaryInput from plan component
    const plan = {
      id: 'fakeId',
      name: 'placeholder plan name',
      ownerId: 'fake',
      region: Region.SIERRA_NEVADA,
      planningArea: new L.Polygon([
        new L.LatLng(38.715517043571914, -120.42857302225725),
        new L.LatLng(38.47079787227401, -120.5164425608172),
        new L.LatLng(38.52668443555346, -120.11828371421737),
      ]).toGeoJSON(),
    };

    this.summaryInput = {
      id: plan.id,
      type: 'Plan',
      name: plan.name,
      owner: 'Player 456',
      region: plan.region,
      area: plan.planningArea,
      status: 'Draft',
      createdTime: '10/20/2022',
      updatedTime: '2 hours ago',
    }
  }

}
