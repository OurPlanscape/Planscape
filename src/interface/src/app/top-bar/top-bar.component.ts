import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent implements OnInit {
  @Output()
  toggleEvent = new EventEmitter<Event>();

  readonly color = 'primary';

  ngOnInit(): void {}

  /** Toggles the sidebar in the navigation component. */
  sendToggle(event: Event) {
    this.toggleEvent.emit(event);
  }

}
