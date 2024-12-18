const asyncWrapper = require("../middleWare/asyncWrapper");
const orderModel = require("../model/orderModel");
const productModel = require("../model/ProductModel");
const ErrorHandler = require("../utils/errorHandler");
const axios = require('axios');
const SHIPROCKET_API_URL = 'https://apiv2.shiprocket.in/v1/external';

let shiprocketToken = null;
let tokenExpirationTime = null;

async function getShiprocketToken() {
  if (shiprocketToken && tokenExpirationTime > Date.now()) {
    return shiprocketToken;
  }

  try {
    const response = await axios.post(`${SHIPROCKET_API_URL}/auth/login`, {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    });
    shiprocketToken = response.data.token;
    tokenExpirationTime = Date.now() + 24 * 60 * 60 * 1000; // Token valid for 24 hours
    return shiprocketToken;
  } catch (error) {
    console.error('Error getting Shiprocket token:', error);
    throw new ErrorHandler("Unable to authenticate with Shiprocket", 500);
  }
}

exports.newOrder = asyncWrapper(async (req, res, next) => {
  console.log("req.user:", req.user); // Debug req.user
  if (!req.user) {
    return next(new ErrorHandler("User is not authenticated", 401));
  }
  const {
    ID,
    shippingInfo,
    orderItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  // Check if an order with this ID already exists
  const existingOrder = await orderModel.findOne({ ID: ID });
  if (existingOrder) {
    return next(new ErrorHandler("An order with this ID already exists", 400));
  }

  let order;
  try {
    order = await orderModel.create({
      ID,
      shippingInfo,
      orderItems,
      paymentInfo,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      user: req.user._id,
      paidAt: Date.now(),
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return next(new ErrorHandler("Failed to create order", 500));
  }

  let token;
  try {
    token = await getShiprocketToken();
  } catch (error) {
    return next(new ErrorHandler("Failed to get Shiprocket token", 500));
  }

  const shiprocketOrderData = {
    order_id: order._id.toString(),
    order_date: new Date().toISOString().split('T')[0],
    pickup_location: "Primary",
    channel_id: "",
    comment: "Kriptees Order",
    billing_customer_name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
    billing_last_name: shippingInfo.lastName,
    billing_address: shippingInfo.address,
    billing_address_2: "",
    billing_city: shippingInfo.city,
    billing_pincode: shippingInfo.pinCode,
    billing_state: shippingInfo.state,
    billing_country: shippingInfo.country,
    billing_email: shippingInfo.email,
    billing_phone: shippingInfo.phoneNo,
    shipping_is_billing: true,
    shipping_customer_name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
    shipping_last_name: shippingInfo.lastName,
    shipping_address: shippingInfo.address,
    shipping_address_2: "",
    shipping_city: shippingInfo.city,
    shipping_pincode: shippingInfo.pinCode,
    shipping_state: shippingInfo.state,
    shipping_country: shippingInfo.country,
    shipping_email: shippingInfo.email,
    shipping_phone: shippingInfo.phoneNo,
    order_items: orderItems.map((item) => ({
      name: item.name,
      sku: item.productId.toString(),
      units: item.quantity,
      selling_price: item.price,
      discount: "",
      tax: "",
    })),
    payment_method: paymentInfo.status === "Paid" ? "Prepaid" : "COD",
    shipping_charges: shippingPrice,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: itemsPrice,
    length: 10,
    breadth: 15,
    height: 20,
    weight: 1.5,
  };

  try {
    const shiprocketResponse = await axios.post(`${SHIPROCKET_API_URL}/orders/create/adhoc`, shiprocketOrderData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Shiprocket API Response:", JSON.stringify(shiprocketResponse.data, null, 2));

    if (shiprocketResponse.data.status_code === 1) {
      order.shiprocketOrderId = shiprocketResponse.data.order_id;
      order.shiprocketShipmentId = shiprocketResponse.data.shipment_id;

    //  console.log("Shiprocket Order ID:", shiprocketResponse.data.order_id);
      
      await order.save();
      
      console.log("Retrieved Order:", order);
      res.status(201).json({
        success: true,
        order,
        shiprocket_order_id: shiprocketResponse.data.order_id,
        shiprocket_shipment_id: shiprocketResponse.data.shipment_id,

        
      });
      console.log("Shiprocket Shipment ID:", order.shiprocketShipmentId);
    } else {
      // If Shiprocket order creation fails, delete the order from our database
      await orderModel.findByIdAndDelete(order._id);
      console.error("Shiprocket order creation failed:", shiprocketResponse.data);
      throw new Error(JSON.stringify(shiprocketResponse.data));
    }
  } catch (error) {
    // If there's an error with Shiprocket, delete the order from our database
    if (order) {
      await orderModel.findByIdAndDelete(order._id);
    }
    console.error("Error creating Shiprocket order:", error.response ? error.response.data : error.message);
    return next(new ErrorHandler(`Failed to create order in Shiprocket: ${error.message}`, 500));
  }
});

exports.trackOrder = asyncWrapper(async (req, res, next) => {
  const token = await getShiprocketToken();
  const { orderId } = req.params;

  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    if (!order.shiprocketOrderId) {
      return next(new ErrorHandler("No Shiprocket order ID associated with this order", 400));
    }
    console.log("Shiprocket Order ID:", order.shiprocketOrderId);

    // First, check the order status
    const statusResponse = await axios.get(`${SHIPROCKET_API_URL}/orders/show/${order.shiprocketOrderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Full Shiprocket Response:", JSON.stringify(statusResponse.data, null, 2));

    // Safely access the order status
    const orderStatus = statusResponse.data && statusResponse.data.data && statusResponse.data.data.status;
    console.log("Order Status:", orderStatus);

    if (!orderStatus) {
      return next(new ErrorHandler("Unable to retrieve order status from Shiprocket", 500));
    }

    if (orderStatus === "NEW" || orderStatus === "PENDING") {
      return res.status(200).json({
        success: true,
        message: "Order has been received but not yet shipped. Tracking information will be available once the order is processed.",
        orderStatus: orderStatus
      });
    }

    // If the order has been processed, attempt to get tracking information
    const trackingResponse = await axios.get(`${SHIPROCKET_API_URL}/courier/track/shipment/${order.shiprocketShipmentId}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });

    console.log("Full Tracking Response:", JSON.stringify(trackingResponse.data, null, 2));

    res.status(200).json({
      success: true,
      trackingDetails: trackingResponse.data,
      orderStatus: orderStatus
    });

  } catch (error) {
    console.error("Error tracking Shiprocket order:", error.response ? error.response.data : error.message);
    return next(new ErrorHandler("Failed to retrieve order information from Shiprocket", 500));
  }
});

exports.getSingleOrder = asyncWrapper(async (req, res, next) => {
  const order = await orderModel
    .findById(req.params.id)
    .populate({ path: "user", select: "name email" });
  if (!order) {
    return next(new ErrorHandler("Order not found with this Id", 404));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

exports.myOrders = asyncWrapper(async (req, res) => {
  const userOrders = await orderModel.find({ user: req.user._id });

  res.status(200).json({
    success: true,
    userOrders,
  });
});

exports.getAllOrders = asyncWrapper(async (req, res, next) => {
  const orders = await orderModel.find();

  let totalAmount = 0;
  orders.forEach((order) => {
    totalAmount += order.totalPrice;
  });

  res.status(200).json({
    success: true,
    totalAmount,
    orders,
  });
});

exports.updateOrder = asyncWrapper(async (req, res, next) => {
  const order = await orderModel.findById(req.params.id);

  if (!order) {
    return next(new ErrorHandler("Order not found with this id", 400));
  }
  if (order.orderStatus === "Delivered") {
    return next(new ErrorHandler("You have already delivered this order", 400));
  }

  if (req.body.status === "Shipped") {
    order.orderItems.forEach(async (orderItem) => {
      await updateStock(orderItem.productId, orderItem.quantity);
    });
  }

  order.orderStatus = req.body.status;

  if (order.orderStatus === "Delivered") {
    order.deliveredAt = Date.now();
  }

  await order.save({ validateBeforeSave: false });
  res.status(200).json({
    success: true,
  });
});

async function updateStock(id, quantity) {
  const product = await productModel.findById(id);

  if (!product) {
    throw new ErrorHandler("Product not found", 404);
  }

  product.Stock -= quantity;
  await product.save({ validateBeforeSave: false });
}

exports.deleteOrder = asyncWrapper(async (req, res, next) => {
  const order = await orderModel.findById(req.params.id);

  if (!order) {
    return next(new ErrorHandler("Order not found with given Id", 400));
  }

  await order.deleteOne();

  res.status(200).json({
    success: true,
    message: "Order deleted successfully",
  });
});



exports.cancelOrder = asyncWrapper(async (req, res, next) => {
  const { orderId } = req.params;
  const token = await getShiprocketToken();

  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    if (order.orderStatus === "Delivered") {
      return next(new ErrorHandler("Cannot cancel a delivered order", 400));
    }

    const response = await axios.post(
      `${SHIPROCKET_API_URL}/orders/cancel`,
      { ids: [order.shiprocketOrderId] },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.status === 1) {
      order.orderStatus = "Cancelled";
      await order.save();

      res.status(200).json({
        success: true,
        message: "Order cancelled successfully",
      });
    } else {
      throw new Error(response.data.message || "Failed to cancel order in Shiprocket");
    }
  } catch (error) {
    console.error("Error cancelling Shiprocket order:", error.response ? error.response.data : error.message);
    return next(new ErrorHandler("Failed to cancel order", 500));
  }
});