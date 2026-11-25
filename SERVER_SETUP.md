# Inventory server setup

The Express server requires a first administrator to be provisioned through environment variables. For local development, copy `.env.example` to `.env` and set `INITIAL_ADMIN_PASSWORD` to a unique password of at least 12 characters before the first start. Keep `.env` private; it is ignored by Git. Never commit the password or put it in a client-side variable. The server refuses to start without an initial administrator password when no account exists.

For hosted deployments, provide `INITIAL_ADMIN_PASSWORD` through the platform's secret manager instead of a checked-in file. The value is only used when initializing a database that has no accounts; changing it later does not reset an existing admin password. After first login, change the bootstrap password and remove the initialization secret from the runtime environment.

Optional values are `INITIAL_ADMIN_ID` (defaults to `ADM001`), `INITIAL_ADMIN_NAME` (defaults to `Rachel Pickard`), and `INITIAL_ADMIN_ROLE` (defaults to `Procurement Manager`).

The SQLite database is stored at `data/inventory.sqlite` by default. Set `INVENTORY_DB_PATH` to a durable writable path in hosted deployments and back up that file using the hosting platform's persistent storage/backup facilities. The app does not ship with default user passwords or migrate local browser accounts into server accounts.

After signing in as the superior administrator, use the inventory import workflow to seed existing inventory. Server-side session cookies are HTTP-only and secure in production; serve the app over HTTPS and do not expose the database file or initialization environment variables to the client.
