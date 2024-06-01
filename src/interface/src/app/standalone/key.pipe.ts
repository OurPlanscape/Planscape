import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'keyPipe',
  standalone: true,
})
export class KeyPipe implements PipeTransform {
  transform<T extends { key: any }>(items: T[]): any[] {
    return items.map((item) => item.key);
  }
}
