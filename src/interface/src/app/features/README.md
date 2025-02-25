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

## Sample features.json

Here is a sample features.json file that minimally enables features to allow
for angular tests to pass. You can start with this, but later enable settings.

```
{
  "disabled_feature": false,
  "enabled_feature": true,
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
