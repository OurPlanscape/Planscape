# Feature Flags

Edit the `FEATURE_FLAGS` variable under the `.env` located at the root of the project. See `/feature-flags.md` for details.

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

This way you can set flags for your tests, independently of the actual contents of `FEATURE_FLAGS`.

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
