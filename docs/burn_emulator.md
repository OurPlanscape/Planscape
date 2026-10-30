# Funding-report burn simulations

Normal funding-report requests submit the scenario's planning area geometry as
EPSG:4326 GeoJSON to `POST /v1/jobs`. Celery Beat enqueues status checks every
60 seconds. Run both Celery workers and Beat for simulations to progress.

Set `BURN_EMULATOR_API_URL` to the Cloud Run service URL. The default is the
existing test service. Workers obtain Google ID tokens using service-account
credentials available through `GOOGLE_APPLICATION_CREDENTIALS` or the Google
metadata service. Grant that identity `roles/run.invoker` on the burn-emulator
Cloud Run service. The token audience is the service origin, without a trailing
slash. Local user ADC credentials without ID-token support are insufficient.

Submission uses a 300-second HTTP timeout; polling uses 30 seconds. Transient
submission errors receive three retries with backoff. Transient polling errors
leave the job active for the next sweep; active jobs expire after 24 hours.
A failed burn does not invalidate successful report calculations.

Job IDs and responses (including output storage URIs and failure details) are
stored separately from report calculation results. This integration does not
create a DataLayer or download output rasters. Apply the funding-report migration
before deploying the workers. Existing reports are left unchanged; rerunning a
report starts the combined workflow with fresh job tracking.
