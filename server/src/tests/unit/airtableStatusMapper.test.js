const { mapStatusToAirtable, getCancelledStatus, getAirtableStatusOptions } = require('../../utils/airtableStatusMapper');

describe('airtableStatusMapper', () => {
  describe('mapStatusToAirtable', () => {
    it('maps basic statuses correctly', () => {
      expect(mapStatusToAirtable('requested')).toBe('New');
      expect(mapStatusToAirtable('accepted')).toBe('Assigned');
      expect(mapStatusToAirtable('en_route')).toBe('Driver en route');
      expect(mapStatusToAirtable('arrived')).toBe('Driver arrived');
      expect(mapStatusToAirtable('in_transit')).toBe('In transit');
      expect(mapStatusToAirtable('completed')).toBe('Completed');
    });

    it('maps specific cancellation statuses correctly', () => {
      expect(mapStatusToAirtable('cancelled_rider_noshow')).toBe('Cancelled – Rider no-show');
      expect(mapStatusToAirtable('cancelled_safety')).toBe('Cancelled – Safety');
      expect(mapStatusToAirtable('rejected_geofence')).toBe('Rejected – Geofence');
    });

    it('maps generic cancelled status with reason', () => {
      expect(mapStatusToAirtable('cancelled', 'rider_noshow')).toBe('Cancelled – Rider no-show');
      expect(mapStatusToAirtable('cancelled', 'safety')).toBe('Cancelled – Safety');
      expect(mapStatusToAirtable('cancelled', 'geofence')).toBe('Rejected – Geofence');
      expect(mapStatusToAirtable('cancelled', 'other')).toBe('Cancelled – Rider no-show');
    });

    it('defaults cancelled status without reason to no-show', () => {
      expect(mapStatusToAirtable('cancelled')).toBe('Cancelled – Rider no-show');
      expect(mapStatusToAirtable('cancelled', null)).toBe('Cancelled – Rider no-show');
    });

    it('returns original status if not mapped', () => {
      expect(mapStatusToAirtable('unknown_status')).toBe('unknown_status');
    });
  });

  describe('getCancelledStatus', () => {
    it('maps cancellation reasons correctly', () => {
      expect(getCancelledStatus('rider_noshow')).toBe('Cancelled – Rider no-show');
      expect(getCancelledStatus('safety')).toBe('Cancelled – Safety');
      expect(getCancelledStatus('geofence')).toBe('Rejected – Geofence');
      expect(getCancelledStatus('other')).toBe('Cancelled – Rider no-show');
    });

    it('defaults to no-show for unknown reasons', () => {
      expect(getCancelledStatus(null)).toBe('Cancelled – Rider no-show');
      expect(getCancelledStatus(undefined)).toBe('Cancelled – Rider no-show');
      expect(getCancelledStatus('unknown')).toBe('Cancelled – Rider no-show');
    });
  });

  describe('getAirtableStatusOptions', () => {
    it('returns all valid Airtable status options', () => {
      const options = getAirtableStatusOptions();
      
      expect(options).toContain('New');
      expect(options).toContain('Assigned');
      expect(options).toContain('Driver en route');
      expect(options).toContain('Driver arrived');
      expect(options).toContain('In transit');
      expect(options).toContain('Completed');
      expect(options).toContain('Cancelled – Rider no-show');
      expect(options).toContain('Cancelled – Safety');
      expect(options).toContain('Rejected – Geofence');
    });

    it('returns exactly 9 status options', () => {
      const options = getAirtableStatusOptions();
      expect(options).toHaveLength(9);
    });
  });
});
