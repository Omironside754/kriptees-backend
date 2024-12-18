const express = require("express");
const { 
  newOrder, 
  getSingleOrder, 
  myOrders, 
  getAllOrders, 
  updateOrder, 
  deleteOrder, 
  trackOrder,
  cancelOrder
} = require("../controller/orderController");
const { isAuthentictedUser, authorizeRoles } = require("../middleWare/auth");
const router = express.Router();

router.route("/order/new").post(isAuthentictedUser, newOrder);
router.route("/order/:id").get(isAuthentictedUser, getSingleOrder);
router.route("/orders/myOrders").get(isAuthentictedUser, myOrders);
router.route("/admin/orders").get(isAuthentictedUser, authorizeRoles("admin"), getAllOrders);
router.route("/admin/order/:id")
  .put(isAuthentictedUser, authorizeRoles("admin"), updateOrder)
  .delete(isAuthentictedUser, authorizeRoles("admin"), deleteOrder);
router.route("/order/track/:orderId").get(isAuthentictedUser, trackOrder);
router.route("/order/cancel/:orderId").post(isAuthentictedUser, cancelOrder);

module.exports = router;

// const SHIPROCKET_API_URL = 'https://apiv2.shiprocket.in/v1/external';

// async function getShiprocketToken() {
//   try {
//     const response = await axios.post(`${SHIPROCKET_API_URL}/auth/login`, {
//       email: process.env.SHIPROCKET_EMAIL,
//       password: process.env.SHIPROCKET_PASSWORD,
//     });
//     return response.data.token;
//   } catch (error) {
//     console.error('Error getting Shiprocket token:', error);
//     throw error;
//   }
// }

// router.route('/api/v1/track/:orderId').get(async (req, res) => {
//   try {
//     const token = await getShiprocketToken();
//     const { orderId } = req.params;

//     const response = await axios.get(`${SHIPROCKET_API_URL}/orders/show/${orderId}`, {
//       headers: {
//         'Authorization': `Bearer ${token}`,
//       },
//     });

//     res.json(response.data);
//   } catch (error) {
//     console.error('Error tracking order:', error);
//     res.status(500).json({ error: 'An error occurred while tracking the order' });
//   }
// });

// var axios = require('axios');

// var config = {
//     method: 'get',
//     maxBodyLength: Infinity,
//     url: 'https://apiv2.shiprocket.in/v1/external/orders',
//     headers: {
//         'Content-Type': 'application/json',
//         'Authorization': 'Bearer {{token}}'
//     }
// };

// axios(config).then(function (response) {
//         console.log(JSON.stringify(response.data));
//     }).catch(function (error) {
//         console.log(error);
//     });