import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { FileUploaderComponent } from '@shared/file-uploader/file-uploader.component';
import { NavBarComponent } from '@shared/nav-bar/nav-bar.component';
import { FeaturesModule } from '@features/features.module';
import { RouterLink } from '@angular/router';
import { TypeSafeMatCellDef } from '@shared/type-safe-mat-cell/type-safe-mat-cell-def.directive';
import { FieldAlertComponent } from '@shared/field-alert/field-alert.component';
import { CreditsBlurbComponent } from '@shared/credits-blurb/credits-blurb.component';
import { FormMessageBoxComponent } from '@shared/form-message-box/form-message-box.component';
import { SectionLoaderComponent } from '@shared/section-loader/section-loader.component';
import { TopBarComponent } from '@shared/top-bar/top-bar.component';
import { ButtonComponent } from '@styleguide';
import { PopoverComponent } from '@styleguide/popover/popover.component';

@NgModule({
  declarations: [
    FileUploaderComponent,
    NavBarComponent,
    TypeSafeMatCellDef,
    FieldAlertComponent,
    CreditsBlurbComponent,
    FormMessageBoxComponent,
    SectionLoaderComponent,
    TopBarComponent,
  ],
  exports: [
    FileUploaderComponent,
    NavBarComponent,
    TypeSafeMatCellDef,
    FieldAlertComponent,
    CreditsBlurbComponent,
    FormMessageBoxComponent,
    SectionLoaderComponent,
    TopBarComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    LegacyMaterialModule,
    ReactiveFormsModule,
    FeaturesModule,
    RouterLink,
    ButtonComponent,
    PopoverComponent,
  ],
})
export class SharedModule {}
