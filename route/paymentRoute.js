const express = require("express");
const { Cashfree } = require("cashfree-pg");
const router = express.Router();

router.route("/payment/createOrder").post(async (req, res) => {
  try {
    Cashfree.XClientId = process.env.X_ID;
    Cashfree.XClientSecret = process.env.X_SECRET;
    Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;

    const orderId = req.body.ID;
    const returnUrl = `https://kriptees.com/success?orderId=${encodeURIComponent(orderId)}`;
    const orderAmount = (
      Number(req.body.itemsPrice) + Number(req.body.shippingPrice)
    ).toFixed(2).toString();
    var request = {
      order_amount: orderAmount,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: (
          req.body.shippingInfo.firstName + "_" + req.body.shippingInfo.phoneNo
        ).replace(/\W+/g, "_"),
        customer_phone: req.body.shippingInfo.phoneNo,
        customer_name:
          req.body.shippingInfo.firstName + " " + req.body.shippingInfo.lastName,
        customer_email: req.body.shippingInfo.email,
      },
      order_meta: {
        return_url: returnUrl,
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

    console.log("Creating order with request:", request);

    const response = await Cashfree.PGCreateOrder("2023-08-01", request);
    console.log("Order created successfully:", response.data);
    res.send(response.data);
  } catch (error) {
    console.error("Error creating order:", error.response?.data || error.message);
    res.status(500).send({
      message: error.response?.data?.message || "An error occurred while creating the order.",
    });
  }
});

router.route("/payment/check").post(async (req, res) => {
  try {
    Cashfree.XClientId = process.env.X_ID;
    Cashfree.XClientSecret = process.env.X_SECRET;
    Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;

    const orderID = req.body.orderId || req.body.cfOrderId;

    console.log("Attempting to fetch payment details for order:", orderID);

    if (!orderID) {
      console.error("No order ID provided");
      return res.status(400).send({ message: "Order ID is required" });
    }

    const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderID);
    //  console.log("Raw payment details response:", response);

    if (response && response.data) {
      console.log("Payment details fetched successfully:", response.data);
      return res.send(response.data);
    } else {
      console.error("No data in payment details response");
      return res.status(404).send({ message: "Payment details not found" });
    }

  } catch (error) {
    console.error("Full error object:", error);
    console.error("Error message:", error.message);
    console.error("Error response:", error.response?.data);

    return res.status(500).send({
      message: "Error fetching payment details",
      error: error.response?.data?.message || error.message
    });
  }
});

module.exports = router;
