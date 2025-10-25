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
    bikeType: Joi.string().valid('bike', 'ebike', 'cargo', 'other').required(),
    notes: Joi.string().allow('', null)
  })
});

const rideUpdateSchema = Joi.object({
  params: Joi.object({
    rideId: Joi.string().required()
  }),
  body: Joi.object({
    status: Joi.string().valid('accepted', 'en_route', 'completed', 'cancelled').required()
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
