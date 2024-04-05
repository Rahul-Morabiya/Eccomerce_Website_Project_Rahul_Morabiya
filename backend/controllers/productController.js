const Product = require("../models/productModel");
const ErrorHandler = require("../utils/errorHandler");
const asyncErrorHandler = require("../middleware/catchAsyncError");
const ApiFeatures = require("../utils/apifeatures");

//Create Product -- Admin
exports.createProduct = asyncErrorHandler(async (req, res, next) => {
  req.body.user = req.user.id;

  const product = await Product.create(req.body);
  res.status(201).json({
    success: true,
    product,
  });
});

//Get All Products
exports.getAllProducts = asyncErrorHandler(async (req, res) => {
  const resultPerPage = 5;
  const productCount = await Product.countDocuments();

  const apiFeature = new ApiFeatures(Product.find(), req.query)
    .search()
    .filter()
    .pagination(resultPerPage);

  const products = await apiFeature.query;
  res.status(200).json({
    sucess: true,
    products,
    productCount,
  });
});

//Update Product -- Admin
exports.updateProduct = asyncErrorHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(500).json({
      success: false,
      message: "Product Not found",
    });
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    product,
  });
});

//Delete Product
exports.deleteProduct = asyncErrorHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(500).json({
      success: false,
      message: "Product Not Found",
    });
  }

  await Product.findByIdAndDelete(req.params.id);
  return res.status(200).json({
    success: true,
    message: "Product Deleted Successfully",
  });
});

//Get Single Product Details
exports.getProductDetails = asyncErrorHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandler("Product not Found", 404));
  }
  res.status(200).json({
    success: true,
    product,
  });
});
