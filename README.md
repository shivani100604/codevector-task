# CodeVector Internship Take Home Task

## What is included

- `src/server.js`: Express backend with PostgreSQL + Sequelize
- `generate_products.js`: Script to seed 200,000 products quickly
- `public/index.html`: Simple browser UI for filtering and pagination
- `package.json`: run scripts for server and data generation

## Setup

1. `npm install`
2. Set `DATABASE_URL` to your Postgres connection string
3. `npm run seed`
4. `npm start`

Then open `http://localhost:3000`.

## Postgres configuration

- The app uses `process.env.DATABASE_URL` for the database connection.
- SSL options are enabled for Neon/Supabase compatibility:
  - `ssl.require: true`
  - `ssl.rejectUnauthorized: false`

## Pagination approach

- Uses cursor pagination on `updatedAt DESC, id DESC`
- Returns one extra row to determine if more pages exist
- Ensures products are not repeated or skipped if data changes while browsing

## Notes

- SQLite is used for simplicity; it works well for local testing and demonstration.
- For production, a hosted Postgres / Neon or Supabase database would be a better fit.
