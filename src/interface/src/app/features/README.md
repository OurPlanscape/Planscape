# Features.json

The features.json file is needed to enable or disable certain features that are
under development or newly released. You should add a features.json file (see
below) in this directory before running angular. The file is listed in the
toplevel .gitignore so that it does not get overwritten with pulls.

By convention, try to name feature flags such that "true" will enable features/show them to the user, while "false" will hide them. By default, we
should keep new flags
set to false, and your code should be testing for "true". This also will
reduce the risk of releasing something unexpected to production.
The exceptions are for "login" and "top_percent_slider", both of which need to
be enabled for tests to run properly.

## Environments

`features.json` gets replaced based on the environment, using
angular [fileReplacements](https://angular.io/guide/build#configure-target-specific-file-replacements), just like `environment.ts`.

When building for prod `features.prod.json` is used. When developing locally, `features.dev.json` is used. You'll need to copy `features.json` and
update accordingly to your environment if its the first time setting up the repo.

## Testing

When you want to test behavior that is based on feature flags, you need to provide on your test configuration the `FeaturesModule` as well
as `FEATURES_JSON` provider, which is the [injection token](https://angular.io/guide/dependency-injection-in-action) that references the json file
used on `FeaturesService`.

```typescript
 await TestBed.configureTestingModule({
  imports: [FeaturesModule],
  declarations: [...],
  providers: [
    {
      provide: FEATURES_JSON,
      useValue: { your_testing_flag: true },
    },
  ],
}).compileComponents();
```

This way you can set flags for your tests, independently of the actual contents of `features.json`.

If you need to override the value on a test, you can override the provider, with the caveat that it needs to be called
before `TestBed.createComponent`.

```typescript
TestBed.overrideProvider(FEATURES_JSON, {
  useValue: { your_testing_flag: false },
});

fixture = TestBed.createComponent(SomeComponent);
component = fixture.componentInstance;
fixture.detectChanges();

```

## Flag Descriptions

### scenario_constraints

This flag will display the Max slope, Distance from roads, and Stand size inputs on the Scenario configuration page.

### show_future_control_panel

This flag will enable future condition options in the map control panel for all regions. A region-specific flag, "future_data", can be found for each
region in Planscape/src/planscape/config/conditions.json. When "show_future_control_panel" is set to true and "future_data" is set to true for a
region, the future condition layers will appear in the map control panel. When "show_future_control_panel" is set to true and "future_data" is set to
false for a region, "Future Climate Stability (coming soon)" will appear in the map control panel.

### show_translated_control_panel

This flag will enable translated condition options in the map control panel for all regions. A region-specific flag, "translated_data", can be found
for each region in Planscape/src/planscape/config/conditions.json. When "show_translated_control_panel" is set to true and "translated_data" is set to
true for a region, the translated condition layers will appear in the map control panel. When "show_translated_control_panel" is set to true and "
translated_data" is set to false for a region, "Current Conditions (coming soon)" will appear in the map control panel.

### top_percent_slider

This flag shows the slider displayed in the scenario generator UI (plan phase).

### unlaunched_layers

This flag will hide map layers that are not currently launched or implemented
when set to false. Once layers are launched in prod, they should be changed in
map-control-panel.component.html so they are no longer affected by this flag.

### upload_project_area

This flag will enable the Project Area control panel in the Scenario Configuration page. That will allow users to choose between having their Project
Areas determined for them, or uploading their own zipped shapefiles.

### use_its

This flag will enable use of ITS data for past resilience projects rather than
Calmapper.

### Other flags

There are two other flags, testFalseFeature and testTrueFeature created just for
automated testing. Their values should be kept to "false" and "true" for
angular tests to pass.

## Sample features.json

Here is a sample features.json file that minimally enables features to allow
for angular tests to pass. You can start with this, but later enable settings.

```
{
  "scenario_constraints": false,
  "show_future_control_panel": false,
  "show_translated_control_panel": false
  "testFalseFeature": false,
  "testTrueFeature": true,
  "top_percent_slider": true,
  "unlaunched_layers": false,
  "upload_project_area": false,
  "use_its": false
}
```

# Feature Flag directive

Use the feature flag directive to show or hide content on your markup.

```angular2html

<div *appFeatureFlag="'your_flag'">
  Show me when the flag is on!
</div>
```

You can alternatively hide content if the flag is on.

```angular2html

<div *appFeatureFlag="'your_flag'; hide: true">
  Hide me when the flag is on!
</div>
```
