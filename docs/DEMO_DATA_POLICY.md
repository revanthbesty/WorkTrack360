# WorkTrack360 demo-data policy

## Mandatory rule

The showcase UI must use fictional demo data only. Do not enter, import, seed, or display real customer, employee, contact, ticket, tenant, or confidential company information in demo environments.

## Current demo behavior

- The frontend starts in demo mode and uses locally defined fictional work items and fictional activity events.
- Live API reads and writes are disabled by default. They require an explicit `VITE_ENABLE_LIVE_DATA=true` environment setting and a configured trusted session; do not set this flag for public showcases or screenshots.
- Demo CSV export is generated only from the currently filtered fictional records in the browser.
- Sample product names, requester names, owner names, activity events, and identifiers are invented for demonstration.
- Demo records are not evidence of real SLA performance, customer commitments, employee workload, or business outcomes.

## Before any non-demo use

Use a separately configured environment, approved identity provider, authorized data source, access controls, retention rules, and security review. Never copy production records into the demo dataset.
