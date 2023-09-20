import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'planscape-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

  readonly text1: string = `
    designed to bring the best available state & federal data and science together. Planscape
    guides regional planners in prioritizing landscape treatments to mitigate fire risk, maximize
    ecological benefits, and help California’s landscapes adapt to climate change.
  `;

  readonly bulletPoints: string[] = [
    `Open source and free to use, for state and federal planners, as well as the public`,
    `Supports regional planning for fire resilience and ecological benefits across broader
    landscapes`,
    `Designed to utilize the latest Regional Resource Kits as the primary data source`,
    `Built to utilize the best state and federal science and models`,
    `Intends to be scalable across US Landscapes`,
  ];

  constructor() { }

  ngOnInit(): void {
  }

}
