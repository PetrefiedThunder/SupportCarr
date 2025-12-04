use std::sync::Arc;

use async_trait::async_trait;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::Router;
use axum::body::Bytes;
use base64::Engine;
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha1::Sha1;
use supportcarr_core::error::CoreError;
use supportcarr_core::fsm::{RideEvent, RideStatus, RideStatusMachine};
use supportcarr_core::model::Ride;
use tokio::sync::RwLock;

use std::collections::HashMap;

pub type HmacSha1 = Hmac<Sha1>;

#[derive(Clone)]
pub struct TwilioConfig {
    pub auth_token: String,
    pub webhook_url: String,
}

#[async_trait]
pub trait TwilioRideStore: Send + Sync {
    async fn find_by_phone(&self, phone: &str) -> Result<Option<Ride>, CoreError>;
    async fn save(&self, ride: Ride) -> Result<(), CoreError>;
}

#[derive(Clone)]
pub struct TwilioState {
    pub config: TwilioConfig,
    pub store: Arc<dyn TwilioRideStore>,
}

#[derive(Debug, Deserialize)]
pub struct TwilioSmsPayload {
    #[serde(rename = "From")]
    pub from: String,
    #[serde(rename = "Body")]
    pub body: String,
}

pub fn router(state: TwilioState) -> Router {
    Router::new()
        .route("/twilio/sms", post(inbound_sms))
        .with_state(state)
}

async fn inbound_sms(
    State(state): State<TwilioState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Response, TwilioError> {
    let signature = headers
        .get("X-Twilio-Signature")
        .and_then(|v| v.to_str().ok())
        .ok_or(TwilioError::Unauthorized)?;

    if !verify_signature(&state.config.auth_token, &state.config.webhook_url, &body, signature)? {
        return Err(TwilioError::Unauthorized);
    }

    let payload: TwilioSmsPayload = serde_urlencoded::from_bytes(&body)
        .map_err(|_| TwilioError::BadRequest("invalid form payload".into()))?;

    let ride = state
        .store
        .find_by_phone(&payload.from)
        .await?
        .ok_or(TwilioError::NotFound)?;

    let new_status = if payload.body.to_uppercase().contains("CANCEL") {
        RideStatusMachine::apply_event(RideStatus::try_from(ride.status.as_str())?, RideEvent::Cancel)?
    } else {
        RideStatusMachine::apply_event(RideStatus::try_from(ride.status.as_str())?, RideEvent::Complete)?
    };

    let mut ride = ride;
    ride.status = new_status.to_string();
    state.store.save(ride).await?;

    let reply = if new_status == RideStatus::Completed {
        "Thanks! Your rescue is marked complete."
    } else {
        "Your rescue has been cancelled."
    };

    Ok((StatusCode::OK, reply).into_response())
}

pub fn verify_signature(
    auth_token: &str,
    webhook_url: &str,
    body: &[u8],
    signature: &str,
) -> Result<bool, TwilioError> {
    let mut mac = HmacSha1::new_from_slice(auth_token.as_bytes())
        .map_err(|_| TwilioError::Unauthorized)?;
    mac.update(webhook_url.as_bytes());
    mac.update(body);
    let expected = base64::engine::general_purpose::STANDARD.encode(mac.finalize().into_bytes());
    Ok(subtle::ConstantTimeEq::ct_eq(expected.as_bytes(), signature.as_bytes()).into())
}

#[derive(Default)]
pub struct InMemoryTwilioRideStore {
    rides: Arc<RwLock<HashMap<String, Ride>>>,
}

#[async_trait]
impl TwilioRideStore for InMemoryTwilioRideStore {
    async fn find_by_phone(&self, phone: &str) -> Result<Option<Ride>, CoreError> {
        Ok(self.rides.read().await.get(phone).cloned())
    }

    async fn save(&self, ride: Ride) -> Result<(), CoreError> {
        let mut lock = self.rides.write().await;
        if let Some(phone) = ride.rider_phone.clone() {
            lock.insert(phone, ride);
            Ok(())
        } else {
            Err(CoreError::InvalidLocation("ride missing phone".into()))
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TwilioError {
    #[error("unauthorized request")]
    Unauthorized,
    #[error("bad request: {0}")]
    BadRequest(String),
    #[error(transparent)]
    Core(#[from] CoreError),
    #[error("ride not found")]
    NotFound,
}

impl IntoResponse for TwilioError {
    fn into_response(self) -> Response {
        match self {
            TwilioError::Unauthorized => StatusCode::UNAUTHORIZED.into_response(),
            TwilioError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg).into_response(),
            TwilioError::NotFound => StatusCode::NOT_FOUND.into_response(),
            TwilioError::Core(err) => {
                let status = match err {
                    CoreError::InvalidStatusTransition { .. } => StatusCode::BAD_REQUEST,
                    _ => StatusCode::INTERNAL_SERVER_ERROR,
                };
                (status, err.to_string()).into_response()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use supportcarr_core::fsm::RideStatus;

    #[test]
    fn signature_verification_matches_hmac() {
        let token = "test-token";
        let url = "https://example.com/twilio/sms";
        let body = b"Body=Done&From=%2B15555551212";
        let signature = verify_signature(token, url, body, "invalid").unwrap();
        assert!(!signature);
    }

    #[test]
    fn ride_status_display() {
        assert_eq!(RideStatus::Completed.to_string(), "completed");
    }
}
