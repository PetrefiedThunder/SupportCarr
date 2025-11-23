use std::fmt::{Display, Formatter};

use crate::error::{CoreError, CoreResult};
use crate::model::RideLocation;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum RideStatus {
    Requested,
    Accepted,
    EnRoute,
    Arrived,
    InTransit,
    Completed,
    Cancelled,
    CancelledRiderNoShow,
    CancelledSafety,
    RejectedGeofence,
}

impl RideStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            RideStatus::Requested => "requested",
            RideStatus::Accepted => "accepted",
            RideStatus::EnRoute => "en_route",
            RideStatus::Arrived => "arrived",
            RideStatus::InTransit => "in_transit",
            RideStatus::Completed => "completed",
            RideStatus::Cancelled => "cancelled",
            RideStatus::CancelledRiderNoShow => "cancelled_rider_noshow",
            RideStatus::CancelledSafety => "cancelled_safety",
            RideStatus::RejectedGeofence => "rejected_geofence",
        }
    }
}

impl Display for RideStatus {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl TryFrom<&str> for RideStatus {
    type Error = CoreError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        Ok(match value {
            "requested" => RideStatus::Requested,
            "accepted" => RideStatus::Accepted,
            "en_route" => RideStatus::EnRoute,
            "arrived" => RideStatus::Arrived,
            "in_transit" => RideStatus::InTransit,
            "completed" => RideStatus::Completed,
            "cancelled" => RideStatus::Cancelled,
            "cancelled_rider_noshow" => RideStatus::CancelledRiderNoShow,
            "cancelled_safety" => RideStatus::CancelledSafety,
            "rejected_geofence" => RideStatus::RejectedGeofence,
            other => {
                return Err(CoreError::InvalidStatusTransition {
                    from: other.to_string(),
                    to: "".to_string(),
                })
            }
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RideEvent {
    Accept,
    Depart,
    Arrive,
    BeginTransit,
    Complete,
    Cancel,
    CancelNoShow,
    CancelSafety,
    RejectGeofence,
}

pub struct RideStatusMachine;

impl RideStatusMachine {
    pub fn validate_transition(from: RideStatus, to: RideStatus) -> CoreResult<()> {
        let allowed = match from {
            RideStatus::Requested => vec![
                RideStatus::Accepted,
                RideStatus::Cancelled,
                RideStatus::CancelledRiderNoShow,
                RideStatus::CancelledSafety,
                RideStatus::RejectedGeofence,
            ],
            RideStatus::Accepted => vec![
                RideStatus::EnRoute,
                RideStatus::Arrived,
                RideStatus::Cancelled,
                RideStatus::CancelledRiderNoShow,
                RideStatus::CancelledSafety,
            ],
            RideStatus::EnRoute => vec![
                RideStatus::Arrived,
                RideStatus::InTransit,
                RideStatus::Completed,
                RideStatus::Cancelled,
                RideStatus::CancelledRiderNoShow,
                RideStatus::CancelledSafety,
            ],
            RideStatus::Arrived => vec![
                RideStatus::InTransit,
                RideStatus::Completed,
                RideStatus::Cancelled,
                RideStatus::CancelledRiderNoShow,
                RideStatus::CancelledSafety,
            ],
            RideStatus::InTransit => vec![
                RideStatus::Completed,
                RideStatus::Cancelled,
                RideStatus::CancelledRiderNoShow,
                RideStatus::CancelledSafety,
            ],
            RideStatus::Completed
            | RideStatus::Cancelled
            | RideStatus::CancelledRiderNoShow
            | RideStatus::CancelledSafety
            | RideStatus::RejectedGeofence => Vec::new(),
        };

        if allowed.contains(&to) {
            Ok(())
        } else {
            Err(CoreError::InvalidStatusTransition {
                from: from.to_string(),
                to: to.to_string(),
            })
        }
    }

    pub fn apply_event(current: RideStatus, event: RideEvent) -> CoreResult<RideStatus> {
        let target = match (current, event) {
            (RideStatus::Requested, RideEvent::Accept) => RideStatus::Accepted,
            (RideStatus::Requested, RideEvent::Cancel) => RideStatus::Cancelled,
            (RideStatus::Requested, RideEvent::CancelNoShow) => RideStatus::CancelledRiderNoShow,
            (RideStatus::Requested, RideEvent::CancelSafety) => RideStatus::CancelledSafety,
            (RideStatus::Requested, RideEvent::RejectGeofence) => RideStatus::RejectedGeofence,
            (RideStatus::Accepted, RideEvent::Depart) => RideStatus::EnRoute,
            (RideStatus::Accepted, RideEvent::Arrive) => RideStatus::Arrived,
            (RideStatus::Accepted, RideEvent::Cancel) => RideStatus::Cancelled,
            (RideStatus::Accepted, RideEvent::CancelNoShow) => RideStatus::CancelledRiderNoShow,
            (RideStatus::Accepted, RideEvent::CancelSafety) => RideStatus::CancelledSafety,
            (RideStatus::EnRoute, RideEvent::Arrive) => RideStatus::Arrived,
            (RideStatus::EnRoute, RideEvent::BeginTransit) => RideStatus::InTransit,
            (RideStatus::EnRoute, RideEvent::Complete) => RideStatus::Completed,
            (RideStatus::EnRoute, RideEvent::Cancel) => RideStatus::Cancelled,
            (RideStatus::EnRoute, RideEvent::CancelNoShow) => RideStatus::CancelledRiderNoShow,
            (RideStatus::EnRoute, RideEvent::CancelSafety) => RideStatus::CancelledSafety,
            (RideStatus::Arrived, RideEvent::BeginTransit) => RideStatus::InTransit,
            (RideStatus::Arrived, RideEvent::Complete) => RideStatus::Completed,
            (RideStatus::Arrived, RideEvent::Cancel) => RideStatus::Cancelled,
            (RideStatus::Arrived, RideEvent::CancelNoShow) => RideStatus::CancelledRiderNoShow,
            (RideStatus::Arrived, RideEvent::CancelSafety) => RideStatus::CancelledSafety,
            (RideStatus::InTransit, RideEvent::Complete) => RideStatus::Completed,
            (RideStatus::InTransit, RideEvent::Cancel) => RideStatus::Cancelled,
            (RideStatus::InTransit, RideEvent::CancelNoShow) => RideStatus::CancelledRiderNoShow,
            (RideStatus::InTransit, RideEvent::CancelSafety) => RideStatus::CancelledSafety,
            _ => {
                return Err(CoreError::InvalidStatusTransition {
                    from: current.to_string(),
                    to: "".to_string(),
                })
            }
        };

        Self::validate_transition(current, target)?;
        Ok(target)
    }
}

/// Calculate the great-circle distance between two coordinates using the Haversine formula.
/// Mirrors the JS helper by returning a minimum of 1 mile and a fallback of 2 miles when
/// coordinates are incomplete.
pub fn estimate_distance_miles(pickup: &RideLocation, dropoff: &RideLocation) -> f64 {
    if pickup.lat == 0.0 || pickup.lng == 0.0 || dropoff.lat == 0.0 || dropoff.lng == 0.0 {
        return 2.0;
    }

    let to_radians = |deg: f64| deg * (std::f64::consts::PI / 180.0);
    let r = 3959.0_f64;
    let lat1 = to_radians(pickup.lat);
    let lat2 = to_radians(dropoff.lat);
    let delta_lat = to_radians(dropoff.lat - pickup.lat);
    let delta_lng = to_radians(dropoff.lng - pickup.lng);

    let a = (delta_lat / 2.0).sin().powi(2)
        + lat1.cos() * lat2.cos() * (delta_lng / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    let distance = r * c;

    distance.max(1.0)
}

/// Enforce the pilot 10-mile constraint.
pub fn enforce_pilot_distance(distance_miles: f64) -> CoreResult<()> {
    if distance_miles > 10.0 {
        Err(CoreError::PilotLimitExceeded(distance_miles))
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn location(lat: f64, lng: f64) -> RideLocation {
        RideLocation { lat, lng }
    }

    #[test]
    fn valid_status_transitions_match_js_fsm() {
        let cases = vec![
            (RideStatus::Requested, RideStatus::Accepted, true),
            (RideStatus::Requested, RideStatus::Cancelled, true),
            (RideStatus::Requested, RideStatus::CancelledRiderNoShow, true),
            (RideStatus::Requested, RideStatus::RejectedGeofence, true),
            (RideStatus::Accepted, RideStatus::EnRoute, true),
            (RideStatus::Accepted, RideStatus::Arrived, true),
            (RideStatus::Accepted, RideStatus::Cancelled, true),
            (RideStatus::EnRoute, RideStatus::Arrived, true),
            (RideStatus::EnRoute, RideStatus::InTransit, true),
            (RideStatus::EnRoute, RideStatus::Completed, true),
            (RideStatus::Arrived, RideStatus::InTransit, true),
            (RideStatus::Arrived, RideStatus::Completed, true),
            (RideStatus::InTransit, RideStatus::Completed, true),
            (RideStatus::Requested, RideStatus::Completed, false),
            (RideStatus::Completed, RideStatus::Cancelled, false),
            (RideStatus::Cancelled, RideStatus::Accepted, false),
            (RideStatus::Accepted, RideStatus::Requested, false),
            (RideStatus::Completed, RideStatus::EnRoute, false),
            (RideStatus::Cancelled, RideStatus::Requested, false),
            (RideStatus::CancelledRiderNoShow, RideStatus::Requested, false),
            (RideStatus::CancelledSafety, RideStatus::Accepted, false),
            (RideStatus::RejectedGeofence, RideStatus::Requested, false),
        ];

        for (from, to, allowed) in cases {
            let result = RideStatusMachine::validate_transition(from, to);
            assert_eq!(result.is_ok(), allowed, "from {from} to {to}");
        }
    }

    #[test]
    fn pilot_distance_matches_js_helper() {
        let pickup = location(34.0522, -118.2437);
        let dropoff = location(34.0522, -118.2437);
        let distance = estimate_distance_miles(&pickup, &dropoff);
        assert_eq!(distance, 1.0);

        let pickup = location(0.0, 0.0);
        let dropoff = location(0.0, 0.0);
        let distance = estimate_distance_miles(&pickup, &dropoff);
        assert_eq!(distance, 2.0);
    }

    #[test]
    fn pilot_limit_enforced() {
        assert!(enforce_pilot_distance(9.9).is_ok());
        let err = enforce_pilot_distance(10.5).unwrap_err();
        match err {
            CoreError::PilotLimitExceeded(distance) => assert!(distance > 10.0),
            other => panic!("unexpected error {other:?}"),
        }
    }
}
