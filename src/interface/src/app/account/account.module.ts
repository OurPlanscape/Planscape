import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AccountPageComponent } from '@app/account/account-page/account-page.component';
import { AccountRoutingModule } from '@app/account/account-routing.module';
import { ChangePasswordComponent } from '@app/account/change-password/change-password.component';
import { DeleteAccountComponent } from '@app/account/delete-account/delete-account.component';
import { DeleteAccountDialogComponent } from '@app/account/delete-account-dialog/delete-account-dialog.component';
import { DetailsComponent } from '@app/account/details/details.component';
import { EditUserFieldComponent } from '@app/account/edit-user-field/edit-user-field.component';
import { FeaturesModule } from '@app/features/features.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LegacyMaterialModule } from '@app/material/legacy-material.module';
import { MenuComponent } from '@app/account/menu/menu.component';
import { SharedModule } from '@shared';

@NgModule({
  declarations: [
    AccountPageComponent,
    ChangePasswordComponent,
    DeleteAccountComponent,
    DeleteAccountDialogComponent,
    DetailsComponent,
    EditUserFieldComponent,
    MenuComponent,
  ],
  imports: [
    AccountRoutingModule,
    CommonModule,
    FeaturesModule,
    FormsModule,
    LegacyMaterialModule,
    ReactiveFormsModule,
    SharedModule,
  ],
})
export class AccountModule {}
