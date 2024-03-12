import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-resource-unavailable',
  templateUrl: './resource-unavailable.component.html',
  styleUrls: ['./resource-unavailable.component.scss'],
})
export class ResourceUnavailableComponent {
  @Input() resource = '';
}
