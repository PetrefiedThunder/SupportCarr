use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::Json;
use serde::{Deserialize, Serialize};
use supportcarr_core::dispatch::DispatchEngine;
use supportcarr_core::error::CoreError;
use supportcarr_core::fsm::{enforce_pilot_distance, estimate_distance_miles, RideEvent, RideStatus, RideStatusMachine};
use supportcarr_core::model::{Ride, RideLocation};
use uuid::Uuid;

pub mod repository;

use repository::RideRepository;

#[derive(Clone)]
pub struct ApiState {
    pub repo: Arc<dyn RideRepository>,
    pub dispatch: Arc<dyn DispatchEngine>,
}

#[derive(Debug, Deserialize)]
pub struct RideRequest {
    pub rider_id: String,
    pub pickup: RideLocation,
    pub dropoff: RideLocation,
    pub bike_type: Option<String>,
    pub notes: Option<String>,
    pub rider_phone: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RideResponse {
    pub id: Uuid,
    pub status: String,
    pub driver_id: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error(transparent)]
    Core(#[from] CoreError),
    #[error("bad request: {0}")]
    BadRequest(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match &self {
            ApiError::Core(CoreError::InvalidStatusTransition { .. }) => {
                (StatusCode::BAD_REQUEST, self.to_string())
            }
            ApiError::Core(CoreError::InvalidLocation(_)) => (StatusCode::BAD_REQUEST, self.to_string()),
            ApiError::Core(CoreError::PilotLimitExceeded(_)) => {
                (StatusCode::BAD_REQUEST, self.to_string())
            }
            ApiError::Core(CoreError::NotFound) => (StatusCode::NOT_FOUND, self.to_string()),
            ApiError::BadRequest(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            _ => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };

        (status, message).into_response()
    }
}

pub fn router(state: ApiState) -> axum::Router {
    axum::Router::new()
        .route("/rides", post(create_ride))
        .route("/rides/:id", get(get_ride_status))
        .with_state(state)
}

async fn create_ride(State(state): State<ApiState>, Json(payload): Json<RideRequest>) -> Result<Json<RideResponse>, ApiError> {
    let distance = estimate_distance_miles(&payload.pickup, &payload.dropoff);
    enforce_pilot_distance(distance)?;

    let price_cents = 5000; // Flat pilot price mirrors JS implementation.
    let mut ride = Ride::new(
        payload.rider_id.clone(),
        payload.pickup.clone(),
        payload.dropoff.clone(),
        payload.bike_type.clone(),
        payload.notes.clone(),
        payload.rider_phone.clone(),
        distance,
        price_cents,
    );

    state.repo.create_ride(ride.clone()).await?;

    if let Some(candidate) = state
        .dispatch
        .find_nearby_pilots(&ride.pickup, 15.0, 1)
        .await
        .ok()
        .and_then(|mut list| list.pop())
    {
        ride.driver_id = Some(candidate.pilot_id.clone());
        ride.status = RideStatusMachine::apply_event(RideStatus::Requested, RideEvent::Accept)?
            .to_string();
        state
            .dispatch
            .mark_assigned(&candidate.pilot_id, &ride.id.to_string())
            .await?;
        state.repo.update_ride(ride.clone()).await?;
    }

    Ok(Json(RideResponse {
        id: ride.id,
        status: ride.status.clone(),
        driver_id: ride.driver_id.clone(),
    }))
}

async fn get_ride_status(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Result<Json<RideResponse>, ApiError> {
    let ride = state.repo.get_ride(&id).await?;
    Ok(Json(RideResponse {
        id: ride.id,
        status: ride.status.clone(),
        driver_id: ride.driver_id.clone(),
    }))
}

pub async fn run(state: ApiState) -> Result<(), Box<dyn std::error::Error>> {
    let app = router(state);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    axum::serve(listener, app).await?;
    Ok(())
}
