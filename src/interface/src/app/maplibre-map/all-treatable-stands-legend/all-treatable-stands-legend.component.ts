import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-all-treatable-stands-legend',
  standalone: true,
  imports: [],
  templateUrl: './all-treatable-stands-legend.component.html',
  styleUrl: './all-treatable-stands-legend.component.scss',
})
export class AllTreatableStandsLegendComponent {
  @Input() totalAcres!: number;
}
