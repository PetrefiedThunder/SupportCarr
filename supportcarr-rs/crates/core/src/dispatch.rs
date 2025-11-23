use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::CoreResult;
use crate::model::RideLocation;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DispatchEngineConfig {
    pub key_prefix: String,
}

impl Default for DispatchEngineConfig {
    fn default() -> Self {
        Self {
            key_prefix: "supportcarr".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DispatchCandidate {
    pub pilot_id: String,
    pub distance_meters: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DispatchEvent {
    pub ride_id: String,
    pub pilot_id: String,
    pub eta_minutes: Option<u32>,
}

#[async_trait]
pub trait DispatchEngine: Send + Sync {
    async fn store_pilot_location(
        &self,
        pilot_id: &str,
        location: &RideLocation,
    ) -> CoreResult<()>;

    async fn set_pilot_available(&self, pilot_id: &str, available: bool) -> CoreResult<()>;

    async fn find_nearby_pilots(
        &self,
        location: &RideLocation,
        radius_miles: f64,
        limit: usize,
    ) -> CoreResult<Vec<DispatchCandidate>>;

    async fn mark_assigned(&self, pilot_id: &str, ride_id: &str) -> CoreResult<()>;
}
