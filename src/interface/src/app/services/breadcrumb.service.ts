import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface BreadCrumb {
  label: string;
  backUrl: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BreadcrumbService {
  private _breadcrumb$ = new BehaviorSubject<BreadCrumb | null>(null);

  public breadcrumb$ = this._breadcrumb$.asObservable();

  constructor() {}

  updateBreadCrumb(breadcrumb: BreadCrumb) {
    this._breadcrumb$.next(breadcrumb);
  }

  updateBreadcrumbIfChanged(breadcrumb: BreadCrumb) {
    const current = this._breadcrumb$.value;
    if (current?.label === breadcrumb.label) {
      return;
    }
    this._breadcrumb$.next(breadcrumb);
  }
}
