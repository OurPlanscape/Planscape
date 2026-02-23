// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// Replace maplibre-gl Map with a stub to prevent WebGL context errors
// This must be done BEFORE any imports that use maplibre-gl
import * as maplibreGl from 'maplibre-gl';
import { MapLibreMapStub } from './testing/maplibre-gl.mock';
(maplibreGl as any).Map = MapLibreMapStub;

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);
