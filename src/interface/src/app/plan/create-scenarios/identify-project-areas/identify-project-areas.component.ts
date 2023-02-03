import { FormGroup } from '@angular/forms';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-identify-project-areas',
  templateUrl: './identify-project-areas.component.html',
  styleUrls: ['./identify-project-areas.component.scss']
})
export class IdentifyProjectAreasComponent implements OnInit {
  @Input() formGroup: FormGroup | undefined;
  @Output() formNextEvent = new EventEmitter<void>();
  @Output() formBackEvent = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
  }

}
