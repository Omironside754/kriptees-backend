const express = require("express");
const app = express();
const errorMiddleware = require("./middleWare/error");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload"); // used for image and other files
const path = require("path");
const cors = require("cors");
require("dotenv").config({ path: "./config/config.env" });

// routes
const user = require("./route/userRoute");
const order = require("./route/orderRoute");
const product = require("./route/productRoute");
const payment = require("./route/paymentRoute");
// for req.cookie to get token while autentication
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(fileUpload());
app.use(errorMiddleware);
const corsOptions = {
  origin: ['http://localhost:3000', 'https://www.kriptees.com','http://localhost:5000'],
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use("/api/v1", product);
app.use("/api/v1", user);
app.use("/api/v1", order);
app.use("/api/v1", payment);
const __dirname1 = path.resolve();

app.use(express.static(path.join(__dirname1, "/client/build")));

app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname1, "/client/build/index.html"))
);

module.exports = app;
