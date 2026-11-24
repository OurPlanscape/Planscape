import { Injectable } from '@angular/core';

/** Data layers whose file this tab is still sending. */
@Injectable({ providedIn: 'root' })
export class ActiveUploadsService {
  private ids = new Set<number>();

  add(id: number) {
    this.ids.add(id);
  }

  remove(id: number) {
    this.ids.delete(id);
  }

  has(id: number) {
    return this.ids.has(id);
  }
}
