use thiserror::Error;

#[derive(Debug, Error)]
pub enum CoreError {
    #[error("invalid status transition from {from} to {to}")]
    InvalidStatusTransition { from: String, to: String },
    #[error("invalid location: {0}")]
    InvalidLocation(String),
    #[error("trip exceeds pilot 10-mile limit (distance: {0:.2} miles)")]
    PilotLimitExceeded(f64),
    #[error("dispatch error: {0}")]
    Dispatch(String),
    #[error("storage error: {0}")]
    Storage(String),
    #[error("ride not found")]
    NotFound,
    #[error("unauthorized")]
    Unauthorized,
}

pub type CoreResult<T> = Result<T, CoreError>;
