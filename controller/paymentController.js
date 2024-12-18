const asyncWrapper = require("../middleWare/asyncWrapper");
exports.processPayment = async (req, res) => {

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // asigning key as well
  try {
    const intent = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: 'inr', // Or your desired currency
      payment_method_types: ['card'],
    });

    // res.status(200).send({ clientSecret: intent.client_secret });
    res
      .status(200)
      .json({ sucess: true, client_secret: intent.client_secret });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).send({ error: error.message });
  }
}



// asyncWrapper(async (req, res, next) => {

//   const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // asigning key as well

//   const myPayment = await stripe.paymentIntents.create({
//     amount: req.body.amount,
//     currency: "inr",
//     metadata: {
//       company: "Ecommerce",
//     },
//   });

//   res
//     .status(200)
//     .json({ sucess: true, client_secret: myPayment.client_secret });

// });

// send STRIPE_API_KEY to user =>

exports.sendStripeApiKey = asyncWrapper(async (req, res, next) => {
  res.status(200).json({ stripeApiKey: process.env.STRIPE_API_KEY });
});

// const crypto = require('crypto');
// const Razorpay = require('razorpay');

// const config = (req, res) =>
//   res.send({
//     razorpayKeyId: process.env.RAZORPAY_KEY_ID,
//     razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET
//   });

// const order = async (req, res, next) => {
//   try {
//     const razorpay = new Razorpay({
//       key_id: process.env.RAZORPAY_KEY_ID,
//       key_secret: process.env.RAZORPAY_KEY_SECRET
//     });

//     const options = req.body;

//     const order = await razorpay.orders.create(options);

//     if (!order) {
//       res.statusCode = 500;
//       throw new Error('No order');
//     }
//     res.status(201).json(order);
//   } catch (error) {
//     next(error);
//   }
// };

// const validate = (req, res) => {
//   const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
//     req.body;

//   const generatedSignature = crypto
//     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//     .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//     .digest('hex');
//   // console.log(generatedSignature, razorpay_signature);

//   if (generatedSignature !== razorpay_signature) {
//     res.statusCode = 400;
//     throw new Error('payment is not legit!');
//   }
//   res.status(201).json({
//     id: razorpay_payment_id,
//     status: 'success',
//     message: 'payment is successful',
//     updateTime: new Date().toLocaleTimeString()
//   });
// };

// module.exports={ config, order, validate };
