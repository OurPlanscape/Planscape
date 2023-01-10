import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-create-scenarios',
  templateUrl: './create-scenarios.component.html',
  styleUrls: ['./create-scenarios.component.scss']
})
export class CreateScenariosComponent implements OnInit {
  panelExpanded: boolean = true;

  constructor() { }

  ngOnInit(): void {
  }

}
