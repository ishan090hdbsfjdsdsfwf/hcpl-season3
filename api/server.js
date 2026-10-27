
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import crypto from 'node:crypto';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const REGISTRATION_FEE_PAISE = 70000;
const MAX_JSON_SIZE = '15mb';

app.use(helmet());


app.use(cors({
  origin: process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim())
    : [
      'http://localhost:5173',
      'https://hcpl-season3-1.onrender.com'
    ]
}));


app.use(express.json({ limit: MAX_JSON_SIZE }));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: req => req.path.startsWith('/player-photo/')
}));

// Return JSON instead of an HTML error for oversized JSON requests.
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      message: 'Your registration request is too large. Please upload a smaller photo (maximum 2 MB) and try again.'
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      message: 'Invalid request data. Please check the form and try again.'
    });
  }

  next(err);
});

const registrationSchema = new mongoose.Schema({
  fullName: {
    type: String, required: true, trim: true,
    minlength: 2, maxlength: 100
  },
  phone: {
    type: String, required: true, match: /^[6-9]\d{9}$/
  },
  dateOfBirth: { type: Date, required: true },
  address: {
    type: String, required: true, trim: true,
    minlength: 8, maxlength: 300
  },
  district: {
    type: String, required: true, enum: ['Hamirpur']
  },
  pincode: {
    type: String, default: '', match: /^(\d{6})?$/
  },
  // Player details
  age: { type: Number, min: 1, max: 100 },
  fatherName: { type: String, trim: true, maxlength: 100 },
  battingHand: { type: String, enum: ['Right Hand', 'Left Hand'] },
  wicketKeeper: { type: Boolean, default: false },
  fastBowling: { type: String, maxlength: 40 },
  spinBowling: { type: String, maxlength: 60 },
  kitSize: { type: String, enum: ['S', 'M', 'L', 'XL', 'XXL'] },
  // Compressed WebP data URL. Keep it excluded from normal admin list queries.
  playerPhoto: { type: String, default: '', select: false, maxlength: 14000000 },

  feePaise: {
    type: Number, required: true, default: REGISTRATION_FEE_PAISE
  },

  offlinePaymentMethod: {
    type: String,
    enum: ['cash', 'upi'],
    default: undefined
  },
  offlinePaymentMarkedAt: {
    type: Date,
    default: undefined
  },
  offlinePaymentMarkedBy: {
    type: String,
    default: undefined
  },
  offlinePaymentReference: {
    type: String,
    default: undefined
  },

  paymentStatus: {
    type: String, enum: ['pending', 'paid', 'failed'], default: 'pending'
  },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  consentAt: { type: Date, required: true }
}, { timestamps: true });

registrationSchema.index({ phone: 1, createdAt: -1 });

const Registration =
  mongoose.models.Registration ||
  mongoose.model('Registration', registrationSchema);

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

function cleanString(value, max = 300) {
  return typeof value === 'string'
    ? value.trim().slice(0, max)
    : '';
}

function publicRegistrationId(doc) {
  return `HCPL-${String(doc._id).toUpperCase()}`;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'HCPL Season 3 API',
    database: mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected'
  });
});

// Create registration
app.post('/api/registrations', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: 'Database is not connected. Please try again later.'
      });
    }

    const body = req.body || {};
    const fullName = cleanString(body.fullName, 100);
    const phone = cleanString(body.phone, 10);
    const address = cleanString(body.address, 300);
    const district = cleanString(body.district, 50);
    const pincode = cleanString(body.pincode, 6);
    const fatherName = cleanString(body.fatherName, 100);
    const dob = new Date(body.dateOfBirth);

    if (fullName.length < 2) {
      return res.status(400).json({ message: 'Enter your full name.' });
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        message: 'Enter a valid 10-digit Indian mobile number.'
      });
    }

    if (!body.dateOfBirth || Number.isNaN(dob.getTime()) ||
      dob >= new Date()) {
      return res.status(400).json({
        message: 'Enter a valid date of birth.'
      });
    }

    if (address.length < 8) {
      return res.status(400).json({
        message: 'Enter your complete address.'
      });
    }

    if (district !== 'Hamirpur') {
      return res.status(400).json({
        message: 'Registration is limited to Hamirpur district, Uttar Pradesh.'
      });
    }

    if (pincode && !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        message: 'PIN code must contain 6 digits.'
      });
    }

    const playerPhoto = typeof body.playerPhoto === 'string' ? body.playerPhoto : '';

    if (!/^data:image\/(jpeg|png|webp);base64,/.test(playerPhoto)) {
      return res.status(400).json({
        message: 'Please upload a valid JPG, PNG, or WEBP photo.'
      });
    }

    if (playerPhoto.length > 14000000) {
      return res.status(413).json({
        message: 'Photo is too large. Please upload an image under 10 MB.'
      });
    }

    const age = body.age === undefined || body.age === ''
      ? undefined
      : Number(body.age);

    if (age !== undefined && (!Number.isInteger(age) || age < 1 || age > 100)) {
      return res.status(400).json({ message: 'Enter a valid age.' });
    }

    const allowedKitSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const kitSize = cleanString(body.kitSize, 3);

    if (kitSize && !allowedKitSizes.includes(kitSize)) {
      return res.status(400).json({ message: 'Select a valid kit size.' });
    }

    const doc = await Registration.create({
      fullName,
      phone,
      dateOfBirth: dob,
      address,
      district,
      pincode,
      ...(age !== undefined ? { age } : {}),
      ...(fatherName ? { fatherName } : {}),
      ...(body.battingHand ? { battingHand: body.battingHand } : {}),
      wicketKeeper: body.wicketKeeper === true,
      ...(body.fastBowling
        ? { fastBowling: cleanString(body.fastBowling, 40) }
        : {}),
      ...(body.spinBowling
        ? { spinBowling: cleanString(body.spinBowling, 60) }
        : {}),
      ...(kitSize ? { kitSize } : {}),
      playerPhoto,
      feePaise: REGISTRATION_FEE_PAISE,
      consentAt: new Date()
    });

    return res.status(201).json({
      registrationId: publicRegistrationId(doc),
      status: 'pending',
      fee: 700,
      message: 'Registration saved. Complete payment to confirm.'
    });
  } catch (error) {
    console.error('Registration creation failed:', error.message);

    if (error.name === 'ValidationError') {
      console.error('Registration validation details:', error);
      return res.status(400).json({
        message: 'Validation failed: ' +
          Object.values(error.errors || {}).map(e => e.message).join(', ')
      });
    }

    return res.status(500).json({
      message: 'Could not save registration. Please try again.'
    });
  }
});

// Create Razorpay order
app.post('/api/payments/create-order', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database is not connected.' });
    }

    console.log('Key ID loaded:', Boolean(process.env.RAZORPAY_KEY_ID));
    console.log('Secret loaded:', Boolean(process.env.RAZORPAY_KEY_SECRET));

    const razorpay = getRazorpay();

    if (!razorpay) {
      return res.status(503).json({
        message: 'Online payment is not configured. Your registration remains pending.'
      });
    }

    const publicId = cleanString(req.body?.registrationId, 40);
    const suffix = publicId.replace(/^HCPL-/i, '');

    if (!/^[a-f\d]{24}$/i.test(suffix)) {
      return res.status(400).json({ message: 'Invalid registration ID.' });
    }

    const registration = await Registration.findById(suffix.toLowerCase());

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    if (registration.paymentStatus === 'paid') {
      return res.status(409).json({ message: 'Registration is already paid.' });
    }

    if (registration.razorpayOrderId) {
      return res.status(409).json({
        message: 'A payment order already exists. Verify its status before creating another.'
      });
    }

    const order = await razorpay.orders.create({
      amount: REGISTRATION_FEE_PAISE,
      currency: 'INR',
      receipt: `hcpl-${String(registration._id).slice(-12)}`,
      notes: {
        registrationId: publicRegistrationId(registration),
        event: 'HCPL Season 3'
      }
    });

    registration.razorpayOrderId = order.id;
    await registration.save();

    return res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Razorpay order creation failed:', {
      message: error.message,
      statusCode: error.statusCode,
      description: error.error?.description
    });

    return res.status(502).json({
      message: error.error?.description ||
        error.message ||
        'Could not create Razorpay payment order.'
    });
  }
});

// Verify payment signature
app.post('/api/payments/verify', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database is not connected.' });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        message: 'Payment verification is not configured.'
      });
    }

    const registrationId = cleanString(req.body?.registrationId, 40);
    const orderId = cleanString(req.body?.razorpay_order_id, 100);
    const paymentId = cleanString(req.body?.razorpay_payment_id, 100);
    const signature = cleanString(req.body?.razorpay_signature, 200);
    const suffix = registrationId.replace(/^HCPL-/i, '');

    if (!/^[a-f\d]{24}$/i.test(suffix) ||
      !orderId || !paymentId || !signature) {
      return res.status(400).json({
        message: 'Missing or invalid payment verification details.'
      });
    }

    const registration = await Registration.findById(suffix.toLowerCase());

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    if (registration.paymentStatus === 'paid') {
      return res.json({
        ok: true,
        status: 'paid',
        registrationId: publicRegistrationId(registration)
      });
    }

    if (registration.razorpayOrderId !== orderId) {
      return res.status(400).json({
        message: 'Payment order does not match this registration.'
      });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');

    if (sigBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return res.status(400).json({
        message: 'Payment signature could not be verified.'
      });
    }

    registration.paymentStatus = 'paid';
    registration.razorpayPaymentId = paymentId;
    await registration.save();

    return res.json({
      ok: true,
      status: 'paid',
      registrationId: publicRegistrationId(registration)
    });
  } catch (error) {
    console.error('Payment verification failed:', error.message);
    return res.status(500).json({
      message: 'Payment verification failed. Contact the organizer before retrying payment.'
    });
  }
});


function safeTextEqual(first, second) {
  const a = Buffer.from(String(first), 'utf8');
  const b = Buffer.from(String(second), 'utf8');

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post('/api/admin/login', (req, res) => {
  try {
    const username = cleanString(req.body?.username, 100);
    const password = req.body?.password;

    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;
    const secret = process.env.ADMIN_SESSION_SECRET;

    if (
      !expectedUsername ||
      !expectedPassword ||
      !secret ||
      secret.length < 32
    ) {
      return res.status(503).json({
        message: 'Admin login is not configured correctly.'
      });
    }

    const usernameMatches = safeTextEqual(username, expectedUsername);
    const passwordMatches =
      typeof password === 'string' &&
      safeTextEqual(password, expectedPassword);

    if (!usernameMatches || !passwordMatches) {
      return res.status(401).json({
        message: 'Invalid username or password.'
      });
    }

    const payload = Buffer.from(JSON.stringify({
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
    })).toString('base64url');

    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');

    return res.json({
      token: `${payload}.${signature}`
    });
  } catch (error) {
    console.error('Admin login failed:', error.message);

    return res.status(500).json({
      message: 'Could not sign in to the admin portal.'
    });
  }
});


/* ============ ADMIN PLAYER MANAGEMENT ============ */

// Add a player manually. Payment starts as pending.
function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    return res.status(503).json({
      message: 'Admin authentication is not configured.'
    });
  }

  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';

  const parts = token.split('.');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return res.status(401).json({
      message: 'Please sign in again.'
    });
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(parts[0])
    .digest('base64url');

  if (!safeTextEqual(parts[1], expectedSignature)) {
    return res.status(401).json({
      message: 'Invalid admin session.'
    });
  }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8')
    );

    if (
      payload.role !== 'admin' ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return res.status(401).json({
        message: 'Admin session expired. Please sign in again.'
      });
    }

    next();
  } catch {
    return res.status(401).json({
      message: 'Invalid admin session.'
    });
  }
}
app.post('/api/admin/registrations', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const fullName = cleanString(body.fullName, 100);
    const phone = cleanString(body.phone, 10);
    const fatherName = cleanString(body.fatherName, 100);
    const address = cleanString(body.address, 300);
    const district = cleanString(body.district, 50);
    const pincode = cleanString(body.pincode, 6);
    const dob = new Date(body.dateOfBirth);

    if (fullName.length < 2) {
      return res.status(400).json({ message: 'Enter the full name.' });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit phone number.' });
    }
    if (!body.dateOfBirth || Number.isNaN(dob.getTime()) || dob >= new Date()) {
      return res.status(400).json({ message: 'Enter a valid date of birth.' });
    }
    if (address.length < 8) {
      return res.status(400).json({ message: 'Enter a complete address.' });
    }
    if (district !== 'Hamirpur') {
      return res.status(400).json({ message: 'District must be Hamirpur.' });
    }
    if (pincode && !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ message: 'PIN code must contain 6 digits.' });
    }

    const age = body.age === undefined || body.age === ''
      ? undefined : Number(body.age);

    if (age !== undefined && (!Number.isInteger(age) || age < 1 || age > 100)) {
      return res.status(400).json({ message: 'Enter a valid age.' });
    }

    const allowedKitSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const kitSize = cleanString(body.kitSize, 3);
    const playerPhoto =
      typeof body.playerPhoto === 'string' &&
        body.playerPhoto.startsWith('data:image/webp;base64,')
        ? body.playerPhoto
        : '';
    if (kitSize && !allowedKitSizes.includes(kitSize)) {
      return res.status(400).json({ message: 'Invalid kit size.' });
    }

    const player = await Registration.create({
      fullName,
      phone,
      fatherName,
      dateOfBirth: dob,
      address,
      district,
      pincode,
      ...(age !== undefined ? { age } : {}),
      ...(body.battingHand ? { battingHand: body.battingHand } : {}),
      wicketKeeper: body.wicketKeeper === true,
      ...(body.fastBowling ? { fastBowling: cleanString(body.fastBowling, 40) } : {}),
      ...(body.spinBowling ? { spinBowling: cleanString(body.spinBowling, 60) } : {}),
      ...(kitSize ? { kitSize } : {}),
      playerPhoto,
      feePaise: REGISTRATION_FEE_PAISE,
      paymentStatus: 'pending',
      consentAt: new Date()
    });

    return res.status(201).json({
      message: 'Player added successfully.',
      registrationId: publicRegistrationId(player)
    });
  } catch (error) {
    console.error('Admin add player failed:', error.message);
    return res.status(500).json({ message: 'Could not add player.' });
  }
});

// Edit player details. Payment fields cannot be changed here.
app.patch('/api/admin/registrations/:id', requireAdmin, async (req, res) => {
  try {
    const id = cleanString(req.params.id, 40).replace(/^HCPL-/i, '');

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ message: 'Invalid registration ID.' });
    }

    const body = req.body || {};
    const updates = {};

    if (body.fullName !== undefined) {
      updates.fullName = cleanString(body.fullName, 100);
      if (updates.fullName.length < 2) {
        return res.status(400).json({ message: 'Enter the full name.' });
      }
    }

    if (body.phone !== undefined) {
      updates.phone = cleanString(body.phone, 10);
      if (!/^[6-9]\d{9}$/.test(updates.phone)) {
        return res.status(400).json({ message: 'Enter a valid 10-digit phone number.' });
      }
    }

    if (body.fatherName !== undefined) updates.fatherName = cleanString(body.fatherName, 100);
    if (body.address !== undefined) {
      updates.address = cleanString(body.address, 300);
      if (updates.address.length < 8) {
        return res.status(400).json({ message: 'Enter a complete address.' });
      }
    }
    if (body.district !== undefined) {
      updates.district = cleanString(body.district, 50);
      if (updates.district !== 'Hamirpur') {
        return res.status(400).json({ message: 'District must be Hamirpur.' });
      }
    }
    if (body.pincode !== undefined) {
      updates.pincode = cleanString(body.pincode, 6);
      if (updates.pincode && !/^\d{6}$/.test(updates.pincode)) {
        return res.status(400).json({ message: 'PIN code must contain 6 digits.' });
      }
    }
    if (body.dateOfBirth !== undefined) {
      const dob = new Date(body.dateOfBirth);
      if (!body.dateOfBirth || Number.isNaN(dob.getTime()) || dob >= new Date()) {
        return res.status(400).json({ message: 'Enter a valid date of birth.' });
      }
      updates.dateOfBirth = dob;
    }
    if (body.age !== undefined) {
      const age = body.age === '' ? undefined : Number(body.age);
      if (age !== undefined && (!Number.isInteger(age) || age < 1 || age > 100)) {
        return res.status(400).json({ message: 'Enter a valid age.' });
      }
      if (age === undefined) updates.$unset = { age: 1 };
      else updates.age = age;
    }

    for (const key of ['battingHand', 'fastBowling', 'spinBowling', 'kitSize']) {
      if (body[key] !== undefined) {
        updates[key] = cleanString(body[key], key === 'kitSize' ? 3 : 60);
      }
    }

    if (updates.kitSize && !['S', 'M', 'L', 'XL', 'XXL'].includes(updates.kitSize)) {
      return res.status(400).json({ message: 'Invalid kit size.' });
    }

    if (body.wicketKeeper !== undefined) {
      updates.wicketKeeper = body.wicketKeeper === true;
    }

    const player = await Registration.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!player) {
      return res.status(404).json({ message: 'Player not found.' });
    }

    return res.json({ message: 'Player updated successfully.' });
  } catch (error) {
    console.error('Admin edit player failed:', error.message);
    return res.status(500).json({ message: 'Could not update player.' });
  }
});

// Delete a registration. Requires authenticated admin.
app.delete('/api/admin/registrations/:id', requireAdmin, async (req, res) => {
  try {
    const id = cleanString(req.params.id, 40).replace(/^HCPL-/i, '');

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ message: 'Invalid registration ID.' });
    }

    const player = await Registration.findById(id);
    if (!player) {
      return res.status(404).json({ message: 'Player not found.' });
    }

    // Do not erase a verified payment record by accident.
    if (player.paymentStatus === 'paid') {
      return res.status(409).json({
        message: 'This registration has a verified payment. Keep the payment record and contact the tournament administrator before removing it.'
      });
    }

    await player.deleteOne();

    return res.json({ message: 'Registration deleted successfully.' });
  } catch (error) {
    console.error('Admin delete player failed:', error.message);
    return res.status(500).json({ message: 'Could not delete registration.' });
  }
});

/* ========== END ADMIN PLAYER MANAGEMENT ========== */

/* ===== HCPL ADMIN DASHBOARD API ===== */

app.get('/api/admin/summary', requireAdmin, async (_req, res) => {
  try {
    const [
      totalRegistrations,
      paidRegistrations,
      pendingRegistrations,
      paidTotal
    ] = await Promise.all([
      Registration.countDocuments(),
      Registration.countDocuments({ paymentStatus: 'paid' }),
      Registration.countDocuments({ paymentStatus: 'pending' }),
      Registration.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$feePaise' } } }
      ])
    ]);

    res.json({
      totalRegistrations,
      paidRegistrations,
      pendingRegistrations,
      totalCollectedPaise: paidTotal[0]?.total || 0
    });
  } catch (error) {
    console.error('Admin summary failed:', error);
    res.status(500).json({ message: 'Could not load dashboard summary.' });
  }
});

// Public, read-only image URL used by CricAuction's PHOTO column.
// Only the player's compressed photo is returned; no registration details are exposed.
app.get('/api/player-photo/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).end();
    }

    const player = await Registration.findById(req.params.id)
      .select('+playerPhoto')
      .lean();

    if (!player?.playerPhoto || !player.playerPhoto.startsWith('data:image/webp;base64,')) {
      return res.status(404).end();
    }

    const base64 = player.playerPhoto.slice('data:image/webp;base64,'.length);
    const image = Buffer.from(base64, 'base64');
    res.set({
      'Content-Type': 'image/webp',
      'Content-Length': String(image.length),
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.status(200).send(image);
  } catch (error) {
    console.error('Player photo endpoint failed:', error.message);
    return res.status(500).end();
  }
});

// Admin-only export data. PUBLIC_API_BASE_URL should be set to the deployed backend's
// public HTTPS origin (e.g. https://your-api.example.com), without a trailing slash.
app.get('/api/admin/cricauction-export', requireAdmin, async (req, res) => {
  try {
    const players = await Registration.find({})
      .select('+playerPhoto fullName phone dateOfBirth age fatherName battingHand wicketKeeper fastBowling spinBowling address district pincode kitSize createdAt')
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    const configuredBase = (process.env.PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '');
    const requestBase = `${req.protocol}://${req.get('host')}`;
    const baseUrl = configuredBase || requestBase;

    res.json({
      photoBaseUrl: baseUrl,
      players: players.map((p, index) => {
        const age = Number.isInteger(p.age) ? p.age : (p.dateOfBirth ? Math.max(0, Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / 31557600000)) : '');
        const hasPhoto = typeof p.playerPhoto === 'string' && p.playerPhoto.startsWith('data:image/webp;base64,');
        const isBowler = Boolean(p.fastBowling || p.spinBowling);
        const skill = p.wicketKeeper && !isBowler ? 'Wicket Keeper' : (isBowler && p.battingHand ? 'All Rounder' : (isBowler ? 'Bowler' : (p.battingHand ? 'Batsman' : '')));
        const bowling = [p.fastBowling, p.spinBowling].filter(Boolean).join(' / ');
        return {
          no: index + 1,
          name: p.fullName || '',
          phone: p.phone || '',
          photo: hasPhoto ? `${baseUrl}/api/player-photo/${p._id}` : '',
          age,
          skill,
          specification1: p.battingHand || '',
          specification2: bowling,
          specification3: p.wicketKeeper ? 'Wicket Keeper' : '',
          category: '',
          extraDetails: [p.fatherName ? `Father: ${p.fatherName}` : '', p.address || ''].filter(Boolean).join(' | '),
          jerseyName: '', jerseyNo: '', jerseySize: p.kitSize || '', trouserSize: '', baseValue: '', match: '', run: '', wicket: '',
          customData: [p.district || '', p.pincode || ''].filter(Boolean).join(' '),
          info1: '', info2: '', info3: '', info4: '', info5: '', info6: '', uploadImage1: '', uploadImage2: ''
        };
      })
    });
  } catch (error) {
    console.error('CricAuction export failed:', error.message);
    res.status(500).json({ message: 'Could not prepare CricAuction export.' });
  }
});

app.get('/api/admin/registrations', requireAdmin, async (req, res) => {
  try {
    const search = cleanString(req.query.search, 100);
    const status = cleanString(req.query.status, 20).toLowerCase();
    const filter = {};

    if (['paid', 'pending', 'failed'].includes(status)) {
      filter.paymentStatus = status;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      filter.$or = [
        { fullName: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } }
      ];

      const idPart = search.replace(/^HCPL-/i, '');
      if (/^[a-f\d]{24}$/i.test(idPart)) {
        filter.$or.push({
          _id: new mongoose.Types.ObjectId(idPart)
        });
      }
    }

    const registrations = await Registration.find(filter)
      .select(
        'fullName phone dateOfBirth address district pincode age fatherName battingHand wicketKeeper fastBowling spinBowling kitSize feePaise paymentStatus razorpayPaymentId createdAt'
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    res.json({
      registrations: registrations.map(player => ({
        ...player,
        registrationId: publicRegistrationId(player)
      }))
    });
  } catch (error) {
    console.error('Admin registrations query failed:', error);
    res.status(500).json({ message: 'Could not load registrations.' });
  }
});

/* ===== END HCPL ADMIN DASHBOARD API ===== */

app.post('/api/admin/registrations/:id/offline-payment', requireAdmin, async (req, res) => {
  try {
    const id = cleanString(req.params.id, 40).replace(/^HCPL-/i, '');

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ message: 'Invalid registration ID.' });
    }

    const method = String(req.body?.method || '').toLowerCase();
    const reference = cleanString(req.body?.reference, 100);

    if (!['cash', 'upi'].includes(method)) {
      return res.status(400).json({ message: 'Choose cash or UPI.' });
    }

    const player = await Registration.findById(id);

    if (!player) {
      return res.status(404).json({ message: 'Player not found.' });
    }

    if (player.paymentStatus === 'paid') {
      return res.status(409).json({ message: 'Already marked as paid.' });
    }

    player.paymentStatus = 'paid';
    player.offlinePaymentMethod = method;
    player.offlinePaymentMarkedAt = new Date();
    player.offlinePaymentMarkedBy =
      cleanString(process.env.ADMIN_USERNAME, 100) || 'admin';
    player.offlinePaymentReference = reference || undefined;

    await player.save();

    res.json({
      message: 'Offline payment recorded successfully.',
      paymentStatus: 'paid',
      method
    });
  } catch (error) {
    console.error('Offline payment recording failed:', error.message);
    res.status(500).json({ message: 'Could not record payment.' });
  }
});



// JSON 404 for unknown API routes


app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'API endpoint not found.' });
});

// General JSON error handler
app.use((err, _req, res, _next) => {
  console.error('API error:', err.message);
  res.status(err.status || 500).json({
    message: 'An unexpected server error occurred.'
  });
});

try {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected.');
  } else {
    console.warn('MONGODB_URI is not set.');
  }
} catch (error) {
  console.error('MongoDB connection failed:', error.message);
}

app.listen(PORT, () => {
  console.log(`HCPL API listening on port ${PORT}`);
});
