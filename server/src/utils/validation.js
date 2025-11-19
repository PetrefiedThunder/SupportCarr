const Joi = require('joi');

const locationSchema = Joi.object({
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  address: Joi.string().allow('', null)
});

const registerSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    role: Joi.string().valid('rider', 'driver', 'admin').default('rider')
  })
});

const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
});

const refreshSchema = Joi.object({
  body: Joi.object({
    refreshToken: Joi.string().required()
  })
});

const rideCreationSchema = Joi.object({
  body: Joi.object({
    pickup: locationSchema.required(),
    dropoff: locationSchema.required(),
    bikeType: Joi.string().valid('analog', 'ebike', 'cargo', 'folding').required(),
    notes: Joi.string().allow('', null)
  })
});

const rideUpdateSchema = Joi.object({
  params: Joi.object({
    rideId: Joi.string().required()
  }),
  body: Joi.object({
    status: Joi.string().valid(
      'requested',
      'accepted',
      'en_route',
      'arrived',
      'in_transit',
      'completed',
      'cancelled',
      'cancelled_rider_noshow',
      'cancelled_safety',
      'rejected_geofence'
    ).required(),
    driverEtaMinutes: Joi.number().min(0).allow(null),
    cancellationReason: Joi.string().valid('rider_request', 'driver_unavailable', 'damaged_battery', 'hazmat', 'other').allow(null),
    assistRequired: Joi.boolean(),
    assistReason: Joi.string().valid('physical_help', 'equipment_issue', 'navigation', 'other').allow(null)
  })
});

const driverUpsertSchema = Joi.object({
  body: Joi.object({
    vehicleType: Joi.string().valid('van', 'truck', 'suv', 'other').required(),
    vehicleDescription: Joi.string().allow('', null)
  })
});

const driverUpdateSchema = Joi.object({
  params: Joi.object({
    driverId: Joi.string().required()
  }),
  body: Joi.object({
    active: Joi.boolean(),
    currentLocation: locationSchema
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  rideCreationSchema,
  rideUpdateSchema,
  driverUpsertSchema,
  driverUpdateSchema
};
