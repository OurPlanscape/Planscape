import { CdkCellDef } from '@angular/cdk/table';
import { Directive, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { MatCellDef, MatTableDataSource } from '@angular/material/table';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[matCellDef]', // same selector as MatCellDef
  providers: [{ provide: CdkCellDef, useExisting: TypeSafeMatCellDef }],
})
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class TypeSafeMatCellDef<T> extends MatCellDef {
  // leveraging syntactic-sugar syntax when we use *matCellDef
  @Input()
  matCellDefDataSource!: T[] | Observable<T[]> | MatTableDataSource<T>;

  // ngTemplateContextGuard flag to help with the Language Service
  static ngTemplateContextGuard<T>(
    dir: TypeSafeMatCellDef<T>,
    ctx: unknown
  ): ctx is { $implicit: T; index: number } {
    return true;
  }
}
