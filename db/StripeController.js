const express = require('express');
// const { setTimeout } = require('timers/promises');

const router = express.Router();
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { Types } = require('mongoose');
const { daysBetween, formatSuccess, formatError } = require('../../src/utils');
const { verifyLoginToken } = require('../tokens/tokenManager');
const Receipt = require('../receipt/Receipt');
const User = require('../user/User');
const FlaggedUser = require('../user/FlaggedUser');
const {
  mlRemoveSubscriberFromGroup, mlAddSubscriberToGroup, CymasphereTrialId, CymashereProId, CymasphereProLifetimeId,
} = require('../MailerLiteApi');

router.use(bodyParser.json({
  limit: '1024mb',
  verify(req, res, buf) {
    if (req.originalUrl.startsWith('/webhook')) {
      req.rawBody = buf.toString();
    }
  },
}));

async function getOrCreateStripeSubscriber(email) {
  const customers = await stripe.customers.list({ email });
  const customer = customers.data.length > 0
    ? customers.data[0]
    : await stripe.customers.create({ email });

  return customer;
}

async function fetchSubscriptionStatus(userId) {
  // console.log('fetching user');
  let user = null;
  try {
    user = await User.findById(userId).select('+email +proML +proLifetimeML +custId').exec();
  } catch (e) {
    console.log(`error fetching user: ${JSON.stringify(e)}`);
    user = null;
  }
  if (user === null) {
    return {
      subscriptionStatus: 'none', subscriptionEnd: 0, trialStatus: 'expired', canceled: false,
    };
  }

  const today = new Date();

  // console.log('fetching payments');
  let payments = { data: [] };

  if (user.custId) {
    try {
      payments = await stripe.paymentIntents.list({ customer: user.custId, expand: ['data.latest_charge', 'data.invoice'] });
    } catch (e) {
      console.log(`error fetching payments from stripe: ${JSON.stringify(e)}`);
      return {
        subscriptionStatus: 'none', subscriptionEnd: 0, trialStatus: 'expired', canceled: false,
      };
    }
  }

  let lifetimePurchased = payments.data.some((p) => {
    if (!p.invoice || !p.latest_charge) return false;

    if (p.invoice.subscription) return false;

    const paid = p.latest_charge.paid && p.latest_charge.amount_refunded === 0;
    if (!paid) return false;

    return p.invoice.lines.data.some((li) => li.price.id === process.env.LIFETIME_PRICE_ID || li.price.id === process.env.LIFETIME_PRICE_ID_2);
  });

  // console.log('fetching subs');
  let subs = { data: [] };
  if (user.custId) {
    try {
      subs = await stripe.subscriptions.list({ customer: user.custId });
    } catch (e) {
      console.log(`error fetching subs from stripe: ${JSON.stringify(e)}`);
      return {
        subscriptionStatus: 'none', subscriptionEnd: 0, trialStatus: 'expired', canceled: false,
      };
    }
    subs.data.sort((a, b) => a.created - b.created);
  }

  // console.log('get the active sub');
  const sub = subs.data.length > 0 ? subs.data[subs.data.length - 1] : null;
  const stripeSub = sub != null && (sub.status === 'active' || sub.status === 'trialing');

  // override to enable pro for certain users
  if (userId.equals(new Types.ObjectId('6500f78e20d4a24fc74df094'))) {
    lifetimePurchased = true;
  }

  // console.log('check iap receipts');
  let subCanceled = false;
  let iap = false;
  let iapEndDate = new Date();
  if (!stripeSub && !lifetimePurchased) {
    try {
      const receipts = await Receipt.find({ owner: userId }).sort({ purchaseDate: -1 }).exec();
      if (receipts.length > 0) {
        const latest = receipts[0];
        // console.log(JSON.stringify(latest), null, '\t');
        if (today < latest.expirationDate) {
          iap = true;
          iapEndDate = latest.expirationDate;
          subCanceled = !!latest.cancellationDate;
        }
      }
    } catch (e) {
      console.log(`error checking reciepts: ${JSON.stringify(e)}`);
    }
  }

  // console.log('update ML groups');
  if (lifetimePurchased || iap || stripeSub) {
    try {
      if (lifetimePurchased && !user.proLifetimeML) {
        await mlRemoveSubscriberFromGroup(user.email, CymasphereTrialId);
        await mlRemoveSubscriberFromGroup(user.email, CymashereProId);
        await mlAddSubscriberToGroup(user.email, CymasphereProLifetimeId);
        await user.updateOne({ proLifetimeML: true }, { upsert: true, new: true });
        console.log(`moved ${user.email} to lifetime ML group`);
      } else if (!lifetimePurchased && !user.proML && !user.proLifetimeML) {
        await mlRemoveSubscriberFromGroup(user.email, CymasphereTrialId);
        await mlAddSubscriberToGroup(user.email, CymashereProId);
        await user.updateOne({ proML: true }, { upsert: true, new: true });
        console.log(`moved ${user.email} to pro ML group`);
      }
    } catch (e) {
      console.log(`error changing sub: ${JSON.stringify(e)}`);
    }
  } else {
    try {
      const canceledSubs = await stripe.subscriptions.list({ customer: user.custId, status: 'ended' });
      subCanceled = canceledSubs.data.length > 0;// .find((cs) => new Date(cs.current_period_end * 1000) > today);
    } catch (e) {
      console.log(`error finding cancelled subs: ${JSON.stringify(e)}`);
    }
  }

  const multipleSubs = subs.data.length > 1 || (subs.data.length > 0 && iap);
  const subAndLifetime = (subs.data.length > 0 || iap) && lifetimePurchased;
  if (multipleSubs || subAndLifetime) {
    try {
      const found = await FlaggedUser.findOne({ user: user._id });
      if (!found || (iap !== found.iap || subs.data.length !== found.subCount || lifetimePurchased !== found.lifetime)) {
        if (found) {
          await found.updateOne({
            iap, subCount: subs.data.length, lifetime: lifetimePurchased, fixed: false,
          });
        } else {
          await FlaggedUser.create({
            user: user._id, iap, subCount: subs.data.length, lifetime: lifetimePurchased, fixed: false,
          });
        }
      }
    } catch (e) {
      console.log(`error updating flagged user: ${JSON.stringify(e)}`);
    }
  }

  const iapDisplay = iap ? iapEndDate.toDateString() : false;
  // const trialDisplay = trial ? trialEndDate.toDateString() : false;
  console.log(`${user.email} | sub: ${stripeSub} | lifetime: ${lifetimePurchased} | IAP: ${iapDisplay} | cancelled: ${subCanceled}`);// | trial: ${trialDisplay}`);

  if (stripeSub || lifetimePurchased || iap) {
    const daysToCheck = 30;
    const maximumEndDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + daysToCheck,
      today.getHours(),
      today.getMinutes(),
      today.getSeconds(),
      today.getMilliseconds(),
    );

    let subType = '';
    const subscriptionStatus = 'active';
    let subEnd = maximumEndDate;
    if (lifetimePurchased) {
      subEnd = maximumEndDate;
      subType = 'lifetime';
    } else if (iap) {
      subEnd = iapEndDate;
      subType = 'iap';
    } else if (stripeSub) {
      subType = 'subscription';
      subEnd = new Date(sub.current_period_end * 1000);
    }

    const days = daysBetween(today, subEnd);
    const end = (days < daysToCheck) ? subEnd : maximumEndDate;

    const diffMs = (end - today);

    if (diffMs <= 0) return { subscriptionStatus: 'expired', subscriptionEnd: 0, canceled: subCanceled };

    const diffMins = Math.floor(diffMs / 60000);

    return {
      subType, subscriptionStatus, subscriptionEnd: diffMins, trialStatus: 'expired', canceled: subCanceled,
    };
  }

  return {
    subscriptionStatus: 'none', subscriptionEnd: 0, trialStatus: 'expired', canceled: subCanceled,
  };
}

// router.get('/test-sub', async (req, res) => {
//   res.send(formatSuccess(await fetchSubscriptionStatus(new Types.ObjectId('65a5ee9963e098a7c254dd08'))));
// });

// Fetch the Checkout Session to display the JSON result on the success page
router.get('/checkout-session', async (req, res) => {
  const { sessionId } = req.query;
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  res.send(session);
});

async function beginPortalSession(custId) {
  const returnUrl = process.env.DOMAIN || 'https://nnaud.io';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: custId,
    return_url: returnUrl,
  });

  return portalSession.url;
}

async function createCheckoutSession(priceId, custId, subscription) {
  try {
    if (!custId) {
      return formatError('custId required');
    }

    // const user = await User.findOne({ custId }).exec();
    // const sub = await fetchSubscriptionStatus(user._id);

    // if (sub.subscriptionStatus === 'active' && sub.subType) {
    //   return JSON.stringify({ url: await beginPortalSession(custId) });
    // }

    const session = await stripe.checkout.sessions.create({
      mode: subscription ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      customer: custId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      invoice_creation: subscription ? undefined : { enabled: true },
      allow_promotion_codes: true,
      success_url: `${process.env.DOMAIN || 'https://nnaud.io'}/payment-success`,
      cancel_url: `${process.env.DOMAIN || 'https://nnaud.io'}/plans`,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
      subscription_data: !subscription ? undefined : { trial_period_days: 14 },
    });

    return JSON.stringify({ url: session.url });
    // return res.redirect(303, session.url);
  } catch (e) {
    return formatError(e.message);
  }
}

router.post('/create-checkout-session', async (req, res) => {
  // const domainURL = process.env.DOMAIN;

  // Create new Checkout Session for the order
  // Other optional params include:
  // [billing_address_collection] - to display billing address details on the page
  // [customer] - if you have an existing Stripe Customer ID
  // [customer_email] - lets you prefill the email input in the form
  // [automatic_tax] - to automatically calculate sales tax, VAT and GST in the checkout page
  // For full details see https://stripe.com/docs/api/checkout/sessions/create
  const { priceId, custId, subscription } = req.body;

  res.send(await createCheckoutSession(priceId, custId, subscription));
});

router.post('/v2/create-checkout-session', async (req, res) => {
  // Create new Checkout Session for the order
  // Other optional params include:
  // [billing_address_collection] - to display billing address details on the page
  // [customer] - if you have an existing Stripe Customer ID
  // [customer_email] - lets you prefill the email input in the form
  // [automatic_tax] - to automatically calculate sales tax, VAT and GST in the checkout page
  // For full details see https://stripe.com/docs/api/checkout/sessions/create
  try {
    const { priceId, custId, subscription } = req.body;

    const user = await User.findOne({ custId }).exec();
    const sub = await fetchSubscriptionStatus(user._id);

    if (sub.subscriptionStatus === 'active') {
      return res.send(JSON.stringify({ url: await beginPortalSession(custId) }));
    }

    return res.send(await createCheckoutSession(priceId, custId, subscription));
  } catch (e) {
    return res.send(JSON.stringify({ error: e.message }));
  }
});

router.post('/v3/create-checkout-session', verifyLoginToken, async (req, res) => {
  // Create new Checkout Session for the order
  // Other optional params include:
  // [billing_address_collection] - to display billing address details on the page
  // [customer] - if you have an existing Stripe Customer ID
  // [customer_email] - lets you prefill the email input in the form
  // [automatic_tax] - to automatically calculate sales tax, VAT and GST in the checkout page
  // For full details see https://stripe.com/docs/api/checkout/sessions/create
  const { product } = req.body;

  if (product === 'monthly') {
    res.send(await createCheckoutSession(process.env.MONTHLY_PRICE_ID, req.custId, true));
  } else if (product === 'annual') {
    res.send(await createCheckoutSession(process.env.ANNUAL_PRICE_ID, req.custId, true));
  } else if (product === 'lifetime') {
    res.send(await createCheckoutSession(process.env.LIFETIME_PRICE_ID, req.custId, false));
  } else {
    res.send(formatError('product must be specified'));
  }
});

// router.get('/config', async (req, res) => {
//   const monthlyPrice = await stripe.prices.retrieve(process.env.MONTHLY_PRICE_ID);
//   const annualPrice = await stripe.prices.retrieve(process.env.ANNUAL_PRICE_ID);
//   const lifetimePrice = await stripe.prices.retrieve(process.env.LIFETIME_PRICE_ID);

//   res.send({
//     publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
//     monthlyPrice,
//     annualPrice,
//     lifetimePrice,
//   });
// });

router.post('/customer-portal', async (req, res) => {
  const { custId } = req.body;

  if (!custId) {
    return res.status(500).send(formatError('custId required'));
  }

  const url = await beginPortalSession(custId);
  res.redirect(303, url);
});

router.get('/customer-portal-url', verifyLoginToken, async (req, res) => {
  const { custId } = req;

  if (!custId) {
    return res.status(500).send(formatError('custId required'));
  }

  res.send(formatSuccess(await beginPortalSession(custId)));
});

// Webhook handler for asynchronous events.
router.post('/webhook', async (req, res) => {
  let data;
  let eventType;
  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    const signature = req.headers['stripe-signature'];

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.log('⚠️  Webhook signature verification failed.');
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  console.log(`webhook event: ${eventType}: ${data}`);

  if (eventType === 'checkout.session.completed') {
    console.log('🔔  Payment received!');
  }

  res.sendStatus(200);
});

async function deleteStripeUser(custId) {
  return stripe.customers.del(custId);
}

// router.delete('/delete_stripe_user', verifyLoginToken, async (req, res) => {
//   res.send(await deleteStripeUser(req.custId));
// });

module.exports = {
  router,
  stripe,
  fetchSubscriptionStatus,
  getOrCreateStripeSubscriber,
  deleteStripeUser,
};
