const express = require("express");
const {
  processPayment,
  sendStripeApiKey,
} = require("../controller/paymentController");
const { isAuthentictedUser } = require("../middleWare/auth");
const router = express.Router();
const { Cashfree } = require("cashfree-pg");

router.route("/payment/createOrder").post(async (req, res) => {
  Cashfree.XClientId = process.env.X_ID;
  Cashfree.XClientSecret = process.env.X_SECRET;
  Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;

  var request = {
    order_amount: req.body.itemsPrice,
    order_currency: "INR",
    order_id: req.body.ID,
    customer_details: {
      customer_id: req.body.shippingInfo.firstName,
      customer_phone: req.body.shippingInfo.phoneNo,
      customer_name:
        req.body.shippingInfo.firstName + " " + req.body.shippingInfo.lastName,
      customer_email: req.body.shippingInfo.email,
    },
    order_meta: {
      return_url: "https://kriptees.com/success",
      notify_url:
        "https://www.cashfree.com/devstudio/preview/pg/webhooks/24210234",
      payment_methods: "cc,dc,upi",
    },
    order_note: "Sample Order Note",
    order_tags: {
      name: "Developer",
      company: "Cashfree",
    },
  };

  Cashfree.PGCreateOrder("2023-08-01", request)
    .then((response) => {
      console.log("Order created successfully:", response.data);
      res.send(response.data);
    })
    .catch((error) => {
      console.error('Error:', error.response?.data?.message || error.message);
      res.status(500).send({
        message: error.response?.data?.message || "An error occurred while creating the order.",
      });
    });
});

router.route("/payment/check").post(async (req, res) => {
  Cashfree.XClientId = process.env.X_ID;
  Cashfree.XClientSecret = process.env.X_SECRET;
  Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;
  const orderID = req.body.orderId;

  Cashfree.PGOrderFetchPayments("2023-08-01", orderID)
    .then((response) => {
      res.send(response.data);
      console.log("Order fetched successfully:", response.data);
    })
    .catch((error) => {
      console.error("Error:", error.response?.data?.message || error.message);
      res.status(500).send({
        message: error.response?.data?.message || "An error occurred while fetching the order.",
      });
    });
});


// router.route("/payment/process").post(isAuthentictedUser, processPayment);
// router.route("/stripeapikey").get(sendStripeApiKey);

module.exports = router;
