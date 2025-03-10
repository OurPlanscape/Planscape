import { Component, OnInit } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import {
  LayerComponent,
  RasterSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { AsyncPipe, NgIf } from '@angular/common';
import { makeColorFunction } from './color-functions';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-datalayer-poc',
  standalone: true,
  imports: [RasterSourceComponent, LayerComponent, AsyncPipe, NgIf],
  templateUrl: './datalayer-poc.component.html',
  styleUrl: './datalayer-poc.component.scss',
})
export class DatalayerPocComponent implements OnInit {
  finalUrl = '';
  imageUrl =
    'https://planscape-control-dev.s3.us-west-2.amazonaws.com/datalayers/1/0396428b-ba40-4863-b045-b44989d07a37.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA2ISRA6UAKFOLPL76%2F20250303%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250303T155951Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=33e2d9b04f16b509323675eb65b70a940b563baf8d699f477f224e6fb2d18202' +
    environment.aws_params;
  stylesUrl = '/assets/geostyles.json';

  ngOnInit(): void {
    //fetch styles
    this.client.get(this.stylesUrl).subscribe((styleJson) => {
      const colorFn = makeColorFunction(styleJson as any);

      // 4. Register it with maplibre-cog-protocol
      setColorFunction(this.imageUrl, colorFn);
      this.finalUrl = `cog://${this.imageUrl}`;
    });
  }

  constructor(private client: HttpClient) {}
}