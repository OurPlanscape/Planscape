import { LayoutModule } from '@angular/cdk/layout';
import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  HTTP_INTERCEPTORS,
  HttpClientModule,
  HttpClientXsrfModule,
} from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import {
  NgxGoogleAnalyticsModule,
  NgxGoogleAnalyticsRouterModule,
} from 'ngx-google-analytics';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ButtonComponent } from '@styleguide';
import { ChipInputComponent } from './home/chip-input/chip-input.component';

import { FeaturesModule } from './features/features.module';
import { FileUploadFieldComponent } from '../styleguide/file-upload-field/file-upload-field.component';
import { HomeComponent } from './home/home.component';
import { JwtInterceptor, WINDOW_PROVIDERS } from '@services';
import { MapModule } from './map/map.module';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';

import { LegacyMaterialModule } from './material/legacy-material.module';

import { NgxMaskModule } from 'ngx-mask';
import { PlanTableComponent } from './home/plan-table/plan-table.component';

import { SharePlanDialogComponent } from './home/share-plan-dialog/share-plan-dialog.component';
import { SharedModule } from '@shared';
import { WelcomeComponent } from './home/welcome/welcome.component';
import { environment } from 'src/environments/environment';
import { DeleteDialogComponent } from './standalone/delete-dialog/delete-dialog.component';
import { LegacyPlanningAreasComponent } from './home/legacy-planning-areas/legacy-planning-areas.component';
import { PlanningAreasComponent } from './standalone/planning-areas/planning-areas.component';

@NgModule({
  declarations: [
    AppComponent,
    ChipInputComponent,
    HomeComponent,
    PlanTableComponent,
    LegacyPlanningAreasComponent,
    SharePlanDialogComponent,
    WelcomeComponent,
  ],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    FeaturesModule,
    FileUploadFieldComponent,
    FormsModule,
    HttpClientModule,
    HttpClientXsrfModule.withOptions({
      cookieName: 'csrftoken',
      headerName: 'X-CSRFTOKEN',
    }),
    LayoutModule,
    LegacyMaterialModule,
    NgxGoogleAnalyticsModule.forRoot(environment.google_analytics_id),
    NgxGoogleAnalyticsRouterModule,
    RouterModule,
    SharedModule,
    ReactiveFormsModule,
    MatDialogModule,
    MapModule,
    NgxMaskModule.forRoot(),
    ButtonComponent,
    DeleteDialogComponent,
    PlanningAreasComponent,
  ],
  providers: [
    WINDOW_PROVIDERS,
    CurrencyPipe,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
