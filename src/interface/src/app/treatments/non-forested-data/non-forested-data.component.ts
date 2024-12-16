import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-non-forested-data',
  standalone: true,
  imports: [MatTableModule],
  templateUrl: './non-forested-data.component.html',
  styleUrl: './non-forested-data.component.scss',
})
export class NonForestedDataComponent {
  dataSource = [
    { time_step: 0, rate_of_spread: 'High', flame_length: 'Placeholder' },
    { time_step: 5, rate_of_spread: 'Placeholder', flame_length: 'High' },
    { time_step: 10, rate_of_spread: 'High', flame_length: 'Placeholder' },
    { time_step: 15, rate_of_spread: 'Moderate', flame_length: 'Moderate' },
    { time_step: 20, rate_of_spread: 'Placeholder', flame_length: 'Moderate' },
  ];
  displayedColumns: string[] = ['time_step', 'rate_of_spread', 'flame_length'];
}
