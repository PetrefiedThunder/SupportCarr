-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Regions table with PostGIS geometry and region_id primary key
CREATE TABLE IF NOT EXISTS regions (
  region_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  geom GEOMETRY(POLYGON, 4326)
);

-- Events table referencing regions
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(region_id),
  type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB
);
