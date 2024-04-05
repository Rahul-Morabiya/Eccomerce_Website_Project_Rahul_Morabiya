const ErrorHandler = require("../utils/errorHandler");
const asyncErrorHandler = require("../middleware/catchAsyncError");
const User = require("../models/userModel");
const catchAsyncError = require("../middleware/catchAsyncError");
const comparePassword = require("../models/userModel");
const sendToken = require("../utils/jwtToken");
const getResetPasswordToken = require("../models/userModel");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const Product = require("../models/productModel");

//Register a User
exports.registerUser = catchAsyncError(async (req, res, next) => {
  const { name, email, password } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    avatar: {
      public_id: "This is Sample iD",
      url: "profilepicUrl",
    },
  });

  sendToken(user, 201, res);
});

//Login User
exports.loginUser = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler("Please Enter Valid Email & Password", 400));
  }

  try {
    const user = await User.findOne({ email }).select("+password").exec();
    if (!user) {
      return next(new ErrorHandler("Invalid Email or Password", 401));
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      return next(new ErrorHandler("Invalid Email or Password", 401));
    }

    sendToken(user, 200, res);
  } catch (error) {
    return next(error); // Pass any caught errors to the error handling middleware
  }
});

//Logout User
exports.logout = catchAsyncError(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged Out",
  });
});

//Forgot Password
exports.forgotPassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorHandler("User Not Found"), 404);
  }

  //Get ResetPassword Token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${req.protocol}:${req.get(
    "host"
  )}/api/v1/password/reset/${resetToken}`;

  const message = `Your Password Reset Token is :- \n\n ${resetPasswordUrl} \n\n If you have not requested this email then
    ,please ignore it`;

  try {
    await sendEmail({
      email: user.email,
      subject: `Ecommerce Website Password Recovery`,
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully `,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler(error.message, 500));
  }
});

//Reset Password
exports.resetPassword = catchAsyncError(async (req, res, next) => {
  //creating token hash

  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new ErrorHandler(
        "Reset Password Token is invalid or has been expired",
        400
      )
    );
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Password does not password", 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();
  sendToken(user, 200, res);
});

//Get User Details
exports.getUserDetails = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    succes: true,
    user,
  });
});

//Update User password
exports.updatePassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Old Password is incorrect", 400));
  }
  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new ErrorHandler("Password Does Not Match", 400));
  }
  user.password = req.body.newPassword;

  await user.save();
  sendToken(user, 200, res);
});

//Update User Profile
exports.updateProfile = catchAsyncError(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  //We will add Cloudinary later

  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({
    success: true,
  });
});

//Get All Users --Admin
exports.getAllUsers = catchAsyncError(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    success: true,
    users,
  });
});

//Get Single User --Admin
exports.getSingleUser = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorHandler(`User with Id:${req.params.id} does not exist.`)
    );
  }

  res.status(200).json({
    success: true,
    user,
  });
});

//Update User Role --Admin
exports.updateUserRole = catchAsyncError(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };

  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});

//Delete User --Admin
exports.deleteUser = catchAsyncError(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };

  //We will remove Cloudinary later

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorHandler(`User with Id : ${req.params.id} does not exist`)
    );
  }
  await User.deleteOne({ _id: user._id });

  res.status(200).json({
    success: true,
    message: "User Deleted Successfully",
  });
});

//Create New Review Or Update the Review
exports.createProductReview = catchAsyncError(async (req, res, next) => {
  const { rating, comment, productId } = req.body;
  const review = {
    user: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    comment,
  };

  const product = await Product.findById(productId);

  const isReviewed = product.reviews.find(
    (rev) => rev.user.toString() === req.user._id.toString()
  );

  if (isReviewed) {
    product.reviews.forEach((rev) => {
      if (rev.user.toString() === req.user_id.toString()) {
        (rev.rating = rating), (rev.comment = comment);
      }
    });
  } else {
    product.reviews.push(review);
    product.numOfReviews = product.reviews.length;
  }
  
  const sumOfRatings = product.reviews.reduce((total, review) => total + review.rating, 0);
  product.ratings = sumOfRatings / product.reviews.length;

  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
  });
});

//Get All reviews of a Product
exports.getProductReviews = catchAsyncError(async (req,res,next)=>{
  const product = await Product.findById(req.query.id);

  if(!product){
    return next(new ErrorHandler("Product not found",404));
  }

  res.status(200).json({
    success:true,
    reviews:product.reviews,
  });
});

//Delete Review
exports.deleteReview = catchAsyncError(async (req,res,next)=>{
  const product = await Product.findById(req.query.productId);
  if(!product){
    return next(new ErrorHandler("Product not found",404));
  }
  
  const reviews = product.reviews.filter(
    (rev) => rev._id.toString() !== req.query.id.toString()
  ); 
  const sumOfRatings =reviews.reduce((total, review) => total + review.rating, 0);
  product.ratings = reviews.length>0 ? sumOfRatings /reviews.length : 0;
  product.numOfReviews=reviews.length;
  product.reviews=reviews;
  await product.save({ validateBeforeSave: false });
  res.status(200).json({
    success:true,
  });
});


