# Report service conventions

All report date ranges use UTC and an inclusive end-date in the UI, converted to an exclusive database bound. Report queries must pass the active membership to the service, include the tenant ID, and apply `reports.view` branch/ownership scope. Monetary details additionally require `reports.financial.view`; personnel details additionally require `staff.view`; exports require `reports.export`.

Product gross margin is explicitly an estimate based on the current product cost because historical order items do not retain a cost snapshot. Staff attribution is explicit: order counts use `createdById`, preparation time uses the actor who recorded the READY transition, cancellations/rejections use status-history actors, price changes use `PriceHistory.changedById`, and activity uses `StaffActivityLog`.
