const express = require("express");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const {
  newOrder,
  getSingleOrder,
  myOrder,
  getAllOrders,
  updateOrder,
  deleteOrder,
} = require("../controllers/OrderController");
const router = express.Router();

router.route("/order/new").post(isAuthenticatedUser, newOrder);

router
  .route("/order/:id")
  .get(isAuthenticatedUser, authorizeRoles("admin"), getSingleOrder);

router.route("/order/me").get(isAuthenticatedUser, myOrder);

router
  .route("/admin/orders")
  .get(isAuthenticatedUser, authorizeRoles("admin"), getAllOrders);

router
  .route("/admin/order/:id")
  .put(isAuthenticatedUser, authorizeRoles("admin"), updateOrder)
  .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteOrder);

module.exports = router;
