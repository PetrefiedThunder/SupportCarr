use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Represents a geospatial coordinate.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RideLocation {
    pub lat: f64,
    pub lng: f64,
}

impl RideLocation {
    pub fn new(lat: f64, lng: f64) -> Self {
        Self { lat, lng }
    }
}

/// Minimal ride representation used by the dispatch and API layers.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Ride {
    pub id: Uuid,
    pub rider_id: String,
    pub pickup: RideLocation,
    pub dropoff: RideLocation,
    pub status: String,
    pub bike_type: Option<String>,
    pub notes: Option<String>,
    pub rider_phone: Option<String>,
    pub distance_miles: f64,
    pub price_cents: i64,
    pub driver_id: Option<String>,
}

impl Ride {
    pub fn new(
        rider_id: String,
        pickup: RideLocation,
        dropoff: RideLocation,
        bike_type: Option<String>,
        notes: Option<String>,
        rider_phone: Option<String>,
        distance_miles: f64,
        price_cents: i64,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            rider_id,
            pickup,
            dropoff,
            status: "requested".to_string(),
            bike_type,
            notes,
            rider_phone,
            distance_miles,
            price_cents,
            driver_id: None,
        }
    }
}

/// A lean summary used for status endpoints or webhook replies.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RideSummary {
    pub id: Uuid,
    pub status: String,
    pub driver_id: Option<String>,
}

impl From<&Ride> for RideSummary {
    fn from(value: &Ride) -> Self {
        Self {
            id: value.id,
            status: value.status.clone(),
            driver_id: value.driver_id.clone(),
        }
    }
}
