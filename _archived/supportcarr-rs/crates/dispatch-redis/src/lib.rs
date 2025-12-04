use async_trait::async_trait;
use redis::aio::MultiplexedConnection;
use supportcarr_core::dispatch::{DispatchCandidate, DispatchEngine, DispatchEngineConfig};
use supportcarr_core::error::{CoreError, CoreResult};
use supportcarr_core::model::RideLocation;

#[derive(Clone)]
pub struct RedisDispatchEngine {
    client: redis::Client,
    config: DispatchEngineConfig,
}

impl RedisDispatchEngine {
    pub fn new(client: redis::Client, config: DispatchEngineConfig) -> Self {
        Self { client, config }
    }

    async fn connection(&self) -> CoreResult<MultiplexedConnection> {
        self.client
            .get_multiplexed_async_connection()
            .await
            .map_err(|err| CoreError::Dispatch(err.to_string()))
    }

    fn geo_key(&self) -> String {
        format!("{}:drivers:geo", self.config.key_prefix)
    }

    fn status_key(&self) -> String {
        format!("{}:drivers:status", self.config.key_prefix)
    }
}

#[async_trait]
impl DispatchEngine for RedisDispatchEngine {
    async fn store_pilot_location(
        &self,
        pilot_id: &str,
        location: &RideLocation,
    ) -> CoreResult<()> {
        let mut conn = self.connection().await?;
        redis::cmd("GEOADD")
            .arg(self.geo_key())
            .arg(location.lng)
            .arg(location.lat)
            .arg(pilot_id)
            .query_async(&mut conn)
            .await
            .map_err(|err| CoreError::Dispatch(err.to_string()))
            .map(|_: i32| ())
    }

    async fn set_pilot_available(&self, pilot_id: &str, available: bool) -> CoreResult<()> {
        let mut conn = self.connection().await?;
        let status = if available { "available" } else { "busy" };
        redis::cmd("HSET")
            .arg(self.status_key())
            .arg(pilot_id)
            .arg(status)
            .query_async(&mut conn)
            .await
            .map_err(|err| CoreError::Dispatch(err.to_string()))
            .map(|_: i32| ())
    }

    async fn find_nearby_pilots(
        &self,
        location: &RideLocation,
        radius_miles: f64,
        limit: usize,
    ) -> CoreResult<Vec<DispatchCandidate>> {
        let mut conn = self.connection().await?;
        // Redis expects kilometers; JS dispatch multiplied by 1.60934.
        let radius_km = radius_miles * 1.60934;
        let results: Vec<(String, f64)> = redis::cmd("GEORADIUS")
            .arg(self.geo_key())
            .arg(location.lng)
            .arg(location.lat)
            .arg(radius_km)
            .arg("km")
            .arg("WITHDIST")
            .arg("ASC")
            .arg("COUNT")
            .arg(limit)
            .query_async(&mut conn)
            .await
            .map_err(|err| CoreError::Dispatch(err.to_string()))?;

        Ok(results
            .into_iter()
            .map(|(pilot_id, distance_km)| DispatchCandidate {
                pilot_id,
                distance_meters: Some(distance_km * 1000.0),
            })
            .collect())
    }

    async fn mark_assigned(&self, pilot_id: &str, ride_id: &str) -> CoreResult<()> {
        let mut conn = self.connection().await?;
        let _: () = redis::pipe()
            .cmd("HSET")
            .arg(self.status_key())
            .arg(pilot_id)
            .arg("busy")
            .ignore()
            .cmd("SET")
            .arg(format!("{}:pilot:{}:ride", self.config.key_prefix, pilot_id))
            .arg(ride_id)
            .query_async(&mut conn)
            .await
            .map_err(|err| CoreError::Dispatch(err.to_string()))?;
        Ok(())
    }
}

#[cfg(all(test, feature = "redis-tests"))]
mod tests {
    use super::*;
    use supportcarr_core::dispatch::DispatchEngine;

    fn url() -> Option<String> {
        std::env::var("REDIS_URL").ok()
    }

    fn client() -> Option<redis::Client> {
        url().and_then(|url| redis::Client::open(url).ok())
    }

    #[tokio::test]
    async fn round_trip_geo_commands() {
        let client = match client() {
            Some(c) => c,
            None => return,
        };

        let engine = RedisDispatchEngine::new(client, DispatchEngineConfig::default());
        let location = RideLocation { lat: 34.0, lng: -118.0 };
        engine
            .store_pilot_location("pilot-1", &location)
            .await
            .expect("store pilot location");
        engine
            .set_pilot_available("pilot-1", true)
            .await
            .expect("status set");

        let nearby = engine
            .find_nearby_pilots(&location, 10.0, 5)
            .await
            .expect("find pilots");
        assert!(!nearby.is_empty());

        engine
            .mark_assigned("pilot-1", "ride-123")
            .await
            .expect("mark assigned");
    }
}
