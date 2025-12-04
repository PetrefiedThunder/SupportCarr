const {
  DEFAULT_RADIUS_METERS,
  ensureGeoIndexes,
  countActiveDriversNear,
  countActiveRidesNear
} = require('../../services/geoService');
const { __setPostgresPool } = require('../../config/postgres');

describe('geoService PostGIS queries', () => {
  let queries;
  let mockPool;

  beforeEach(() => {
    queries = [];
    mockPool = {
      query: jest.fn((sql, params) => {
        queries.push({ sql, params });
        return Promise.resolve({ rows: [{ count: '2' }] });
      })
    };
    __setPostgresPool(mockPool);
  });

  test('ensures indexes and extension exist', async () => {
    await ensureGeoIndexes();

    expect(mockPool.query).toHaveBeenCalledTimes(4);
    expect(mockPool.query.mock.calls[0][0]).toContain('CREATE EXTENSION IF NOT EXISTS postgis');
    expect(mockPool.query.mock.calls[1][0]).toContain('drivers');
    expect(mockPool.query.mock.calls[2][0]).toContain('rides');
    expect(mockPool.query.mock.calls[3][0]).toContain('driver_locations');
  });

  test('counts only available drivers using geodesic radius', async () => {
    const count = await countActiveDriversNear({ lat: 89.9, lng: 179.9, radiusMeters: 500 });

    expect(count).toBe(2);
    expect(queries[0].sql).toContain("d.status = 'available'");
    expect(queries[0].sql).toContain('ST_DWithin');
    expect(queries[0].params).toEqual([179.9, 89.9, 500]);
  });

  test('counts active rides within configurable radius', async () => {
    const count = await countActiveRidesNear({ lat: -89.9, lng: -179.9, radiusMeters: DEFAULT_RADIUS_METERS });

    expect(count).toBe(2);
    expect(queries[0].sql).toContain('r.status IN');
    expect(queries[0].sql).toContain('ST_DWithin');
    expect(queries[0].params).toEqual([-179.9, -89.9, DEFAULT_RADIUS_METERS]);
  });

  test('handles edge coordinate queries across poles and dateline', async () => {
    await countActiveDriversNear({ lat: 89.9999, lng: -179.9999, radiusMeters: 250 });

    expect(queries[0].sql).toContain('ST_DWithin');
    expect(queries[0].params).toEqual([-179.9999, 89.9999, 250]);
  });
});
