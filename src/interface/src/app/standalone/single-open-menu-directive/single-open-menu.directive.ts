import { Directive, OnDestroy } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { Subscription } from 'rxjs';
import { SingleOpenMenuService } from './single-open-menu.service';

@Directive({
  selector: '[appSingleOpenMenu]',
  standalone: true,
})
export class SingleOpenMenuDirective implements OnDestroy {
  private subscriptions = new Subscription();

  constructor(
    private trigger: MatMenuTrigger,
    private singleOpenMenu: SingleOpenMenuService
  ) {
    this.subscriptions.add(
      this.trigger.menuOpened.subscribe(() =>
        this.singleOpenMenu.opened(this.trigger)
      )
    );
    this.subscriptions.add(
      this.trigger.menuClosed.subscribe(() =>
        this.singleOpenMenu.closed(this.trigger)
      )
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.singleOpenMenu.closed(this.trigger);
  }
}
