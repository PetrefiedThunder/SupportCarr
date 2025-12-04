use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use supportcarr_core::error::{CoreError, CoreResult};
use supportcarr_core::model::Ride;

#[async_trait]
pub trait RideRepository: Send + Sync {
    async fn create_ride(&self, ride: Ride) -> CoreResult<()>;
    async fn get_ride(&self, id: &Uuid) -> CoreResult<Ride>;
    async fn update_ride(&self, ride: Ride) -> CoreResult<()>;
}

#[derive(Default)]
pub struct InMemoryRideRepository {
    rides: Arc<RwLock<HashMap<Uuid, Ride>>>,
}

#[async_trait]
impl RideRepository for InMemoryRideRepository {
    async fn create_ride(&self, ride: Ride) -> CoreResult<()> {
        self.rides.write().await.insert(ride.id, ride);
        Ok(())
    }

    async fn get_ride(&self, id: &Uuid) -> CoreResult<Ride> {
        self
            .rides
            .read()
            .await
            .get(id)
            .cloned()
            .ok_or(CoreError::NotFound)
    }

    async fn update_ride(&self, ride: Ride) -> CoreResult<()> {
        if self.rides.write().await.insert(ride.id, ride).is_some() {
            Ok(())
        } else {
            Err(CoreError::NotFound)
        }
    }
}
