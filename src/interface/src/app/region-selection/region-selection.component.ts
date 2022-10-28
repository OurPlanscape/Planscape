import { Component, OnInit } from '@angular/core';
import { Region } from '../types';

interface RegionButton {
  type: Region;
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
  Region = Region;
  selectedRegion?: Region;

  regionButtons: RegionButton[] = [];

  constructor() { }

  ngOnInit(): void {
    this.regionButtons = regions.map((region) => {
      const available = availableRegions.has(region);

      return {
        type: region,
        name: region,
        available,
        iconColor: '#838383',
      }
    })
  }

  setRegion(regionButton: RegionButton) {
    if (!regionButton.available) {
      return;
    }
    this.selectedRegion = regionButton.type;
    console.log(this.selectedRegion);
  }

}
