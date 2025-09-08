import { TitleCasePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  standalone: true,
  imports: [TitleCasePipe],
  selector: 'app-resource-unavailable',
  templateUrl: './resource-unavailable.component.html',
  styleUrls: ['./resource-unavailable.component.scss'],
})
export class ResourceUnavailableComponent {
  @Input() resource = '';
}
