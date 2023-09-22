import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-planscape-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
})
export class AboutComponent {
  readonly bulletPoints: string[] = [
    `Open source and free to use, for state and federal planners, as well as the public`,
    `Supports regional planning for fire resilience and ecological benefits across broader
    landscapes`,
    `Designed to utilize the latest Regional Resource Kits as the primary data source`,
    `Built to utilize the best state and federal science and models`,
    `Intends to be scalable across US Landscapes`,
  ];
}
