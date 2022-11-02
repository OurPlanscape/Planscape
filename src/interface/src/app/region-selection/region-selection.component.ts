import { Component, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';

import { Region } from '../types';
import { AppState, userRegionSelector, userUpdateRegionAction } from '../state';

interface RegionButton {
  region: Region;
  name: string;
  available: boolean;
  iconColor?: string;
}

const regions: Region[] = [
  Region.SIERRA_NEVADA,
  Region.SOUTHERN_CALIFORNIA,
  Region.CENTRAL_COAST,
  Region.NORTHERN_CALIFORNIA,
]

const availableRegions = new Set([
  Region.SIERRA_NEVADA,
])

@Component({
  selector: 'app-region-selection',
  templateUrl: './region-selection.component.html',
  styleUrls: ['./region-selection.component.scss']
})
export class RegionSelectionComponent implements OnInit {
  selectedRegion$ = this.store.pipe(select(userRegionSelector));
  regionButtons: RegionButton[] = [];

  constructor(private store: Store<AppState>) { }

  ngOnInit(): void {
    this.regionButtons = regions.map((region) => {
      return {
        region: region,
        name: region,
        available: availableRegions.has(region),
        iconColor: '#838383',
      }
    })
  }

  setRegion(regionButton: RegionButton) {
    if (!regionButton.available) {
      return;
    }
    this.store.dispatch(userUpdateRegionAction({region: regionButton.region}));
  }

}
