import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountPageComponent } from './account-page/account-page.component';
import { AuthGuard } from '@services';
import { DetailsComponent } from './details/details.component';
import { DeleteAccountComponent } from './delete-account/delete-account.component';
import { ChangePasswordComponent } from './change-password/change-password.component';

const routes: Routes = [
  {
    path: '',
    title: 'Account Details',
    component: AccountPageComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'information',
        pathMatch: 'full',
      },
      {
        path: 'information',
        title: 'Edit Personal information',
        component: DetailsComponent,
      },
      {
        path: 'credentials',
        title: 'Edit Credentials',
        component: ChangePasswordComponent,
      },
      {
        path: 'delete-account',
        title: 'Deactivate Account',
        component: DeleteAccountComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccountRoutingModule {}
