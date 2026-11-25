# Inventory server setup

The Express server requires a first administrator to be provisioned through environment variables. Set `INITIAL_ADMIN_PASSWORD` to a unique password of at least 12 characters before the first start. Optional values are `INITIAL_ADMIN_ID` (defaults to `ADM001`), `INITIAL_ADMIN_NAME` (defaults to `Rachel Pickard`), and `INITIAL_ADMIN_ROLE` (defaults to `Procurement Manager`). The server refuses to start without an initial administrator password when no account exists.

The SQLite database is stored at `data/inventory.sqlite` by default. Set `INVENTORY_DB_PATH` to a durable writable path in hosted deployments and back up that file using the hosting platform's persistent storage/backup facilities. The app does not ship with default user passwords or migrate local browser accounts into server accounts.

After signing in as the superior administrator, use the inventory import workflow to seed existing inventory. Server-side session cookies are HTTP-only and secure in production; serve the app over HTTPS and do not expose the database file or initialization environment variables to the client.
