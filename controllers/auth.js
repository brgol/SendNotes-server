const ErrorResponse = require("../utils/ErrorResponse");
const asyncHandler = require("../middleware/async");
const { json } = require("express");
const User = require("../models/User");

//@desc    Register User
//@route   POST /api/v1/auth/register
//@access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;
  //create user
  const user = await User.create({
    name,
    email,
    password,
  });
  sendTokenResponse(user, 200, res);
});
//@desc    Login User
//@route   POST /api/v1/auth/login
//@access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  console.log(req.body);

  //validate email and password
  if (!email || !password) {
    return next(new ErrorResponse("Please provide email and password", 400));
  }

  //Check for user existance
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    res.status(401).json({
      success: false,
      msg: "invalid credentials",
    });
  }
  //Check if password matches
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401).json({
      success: false,
      msg: "invalid credentials",
    });
  }

  sendTokenResponse(user, 200, res);
});
//@desc Get current logged in user
//@route POST /api/v1/auth/me
//@access Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: user,
  });
});
//@desc  Logout
//@route GET api/v1/auth/logout
//@access Private

exports.logout = asyncHandler(async (req, res, next) => {
  res.status(200).clearCookie("token").json({
    success: true,
    data: "logout success",
  });
});

//@desc Forgot Password
//@route POST api/v1/auth/forgotpassword
//@access Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    res.status(404).json({
      success: false,
      msg: "The email does not exist",
    });
  }
  //Get Reset Token
  const resetToken = user.getResetPasswordToken();
  //Save the token and Expiry in database
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    data: user,
  });
});

//Get the token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  //create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ), //calculate it to 30 days.
    sameSite: "strict",
    path: "/",
    httpOnly: true,
  };
  //make it https when it is in production.
  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
  });
};
