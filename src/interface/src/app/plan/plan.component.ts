import { BehaviorSubject } from 'rxjs';
import { Component } from '@angular/core';
import * as L from 'leaflet';

import { Plan, Region } from '../types';

@Component({
  selector: 'app-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
})
export class PlanComponent {
  plan: Plan | undefined;
  currentPlan$ = new BehaviorSubject<Plan | null>(null);
  resumePlanning = true;

  constructor() {
    // TODO(leehana): Use a fake plan until we can query plans from the DB
    const plan = {
      id: 'fake',
      name: 'Shiba Resilience Plan',
      ownerId: 'fake',
      region: Region.SIERRA_NEVADA,
      planningArea: new L.Polygon([
        new L.LatLng(38.715517043571914, -120.42857302225725),
        new L.LatLng(38.47079787227401, -120.5164425608172),
        new L.LatLng(38.52668443555346, -120.11828371421737),
      ]).toGeoJSON(),
    };
    this.currentPlan$.next(plan);
  }
}
