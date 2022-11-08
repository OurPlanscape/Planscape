import { SessionService } from './../session.service';
import { Component, OnInit } from '@angular/core';
import { Region } from '../types';

/**
 * The main region selection view component.
 */
interface RegionButton {
  type: Region;
  name: string;
  available: boolean;
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
  selectedRegion$ = this.sessionService.region$;
  regionButtons: RegionButton[] = [];

  constructor(private sessionService: SessionService) {}

  ngOnInit(): void {
    this.regionButtons = regions.map((region) => {
      return {
        type: region,
        name: region,
        available: availableRegions.has(region),
      }
    });
  }

  /** Sets the region. */
  setRegion(regionButton: RegionButton) {
    if (!regionButton.available) {
      return;
    }
    this.sessionService.setRegion(regionButton.type);
  }

}
