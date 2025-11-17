/**
 * Maps internal ride status codes to Airtable-compatible status strings
 * that match the Day 0 Field Manual exactly
 */

/**
 * Map internal status to Airtable display status
 * @param {string} internalStatus - The status from MongoDB
 * @param {string} cancellationReason - Optional cancellation reason
 * @returns {string} Airtable-compatible status string
 */
function mapStatusToAirtable(internalStatus, cancellationReason = null) {
  const statusMap = {
    'requested': 'New',
    'accepted': 'Assigned',
    'en_route': 'Driver en route',
    'arrived': 'Driver arrived',
    'in_transit': 'In transit',
    'completed': 'Completed',
    'cancelled': getCancelledStatus(cancellationReason),
    'cancelled_rider_noshow': 'Cancelled – Rider no-show',
    'cancelled_safety': 'Cancelled – Safety',
    'rejected_geofence': 'Rejected – Geofence'
  };

  return statusMap[internalStatus] || internalStatus;
}

/**
 * Get the appropriate cancelled status based on reason
 * @param {string} reason - Cancellation reason
 * @returns {string} Airtable-compatible cancelled status
 */
function getCancelledStatus(reason) {
  const cancelledReasonMap = {
    'rider_noshow': 'Cancelled – Rider no-show',
    'safety': 'Cancelled – Safety',
    'geofence': 'Rejected – Geofence',
    'rider_request': 'Cancelled – Rider no-show', // Maps to no-show for Airtable
    'driver_unavailable': 'Cancelled – Safety', // Maps to safety for operational reasons
    'damaged_battery': 'Cancelled – Safety', // Maps to safety for equipment issues
    'hazmat': 'Cancelled – Safety', // Maps to safety for hazmat issues
    'other': 'Cancelled – Rider no-show' // Default to no-show for backwards compatibility
  };

  return cancelledReasonMap[reason] || 'Cancelled – Rider no-show';
}

/**
 * Get all valid Airtable status options
 * @returns {Array<string>} List of valid Airtable status values
 */
function getAirtableStatusOptions() {
  return [
    'New',
    'Assigned',
    'Driver en route',
    'Driver arrived',
    'In transit',
    'Completed',
    'Cancelled – Rider no-show',
    'Cancelled – Safety',
    'Rejected – Geofence'
  ];
}

module.exports = {
  mapStatusToAirtable,
  getCancelledStatus,
  getAirtableStatusOptions
};
