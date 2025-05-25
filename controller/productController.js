const ProductModel = require("../model/ProductModel");
const ErrorHandler = require("../utils/errorHandler");
const asyncWrapper = require("../middleWare/asyncWrapper");
const ApiFeatures = require("../utils/apiFeatures");
const cloudinary = require("cloudinary");

// Configure Cloudinary for optimisation of the images 
const optimizeCloudinaryUrl = (url, width = 600) => {
  if (!url.includes("res.cloudinary.com")) return url;
  const parts = url.split("/upload/");
  return `${parts[0]}/upload/q_auto,f_auto,w_${width}/${parts[1]}`;
};


// >>>>>>>>>>>>>>>>>>>>> createProduct Admin route  >>>>>>>>>>>>>>>>>>>>>>>>
exports.createProduct = asyncWrapper(async (req, res) => {

  const images = [];
  // console.log(req.body)
  const imagesLinks = [];

  if (req.body.images) {
    if (typeof req.body.images === "string") {
      images.push(req.body.images);
    } else {
      for (let image of req.body.images)
        images.push(image);
    }


  }
  for (let result of images) {
    imagesLinks.push({
      url: result,
    });
  }

  req.body.images = imagesLinks;


  if (!req.body.size || !req.body.color) {
    return next(new ErrorHandler("Please provide size and color", 400));
  }

  const data = await ProductModel.create(req.body);
  res.status(200).json({ success: true, data });
});

exports.getAllProducts = asyncWrapper(async (req, res) => {
  const resultPerPage = 12;

  const apiFeature = new ApiFeatures(ProductModel.find(), req.query)
    .search()
    .filter();

  let products = await apiFeature.query;

  products = products.map((product) => {
    product.images = product.images.map((img) => ({
      ...img,
      url: optimizeCloudinaryUrl(img.url),
    }));
    return product;
  });


  const totalProducts = await ProductModel.countDocuments();

  res.status(200).json({
    success: true,
    products,
    totalProducts,
  });

});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> get all product admin route>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

exports.getAllProductsAdmin = asyncWrapper(async (req, res) => {
  let products = await ProductModel.find();

  products = products.map((product) => {
    product.images = product.images.map((img) => ({
      ...img,
      url: optimizeCloudinaryUrl(img.url),
    }));
    return product;
  });


  res.status(201).json({
    success: true,
    products,
  });
});

//>>>>>>>>>>>>>>>>>> Update Admin Route >>>>>>>>>>>>>>>>>>>>>>>
exports.updateProduct = asyncWrapper(async (req, res, next) => {
  let product = await ProductModel.findById(req.params.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }
  const oldImg = await ProductModel.findById(req.params.id);

  let imagesLinks = oldImg.images
  for (let i = 0; i < imagesLinks.length; i++) {
    imagesLinks[i].url = req.body.images[i]
  }
  console.log("IMAGESLINKS:" + imagesLinks)

  // req.body.user = req.user.id;
  req.body.images = imagesLinks;
  product = await ProductModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  console.log(product)

  res.status(201).json({
    success: true,
    product: product,
  });

});


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  delete product --admin  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
exports.deleteProduct = asyncWrapper(async (req, res, next) => {
  let product = await ProductModel.findById(req.params.id);
  // console.log(product);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  await product.deleteOne();

  res.status(201).json({
    success: true,
    message: "Product delete successfully",
  });
});

//>>>>>>>>>>>>>>>>>>>>>>> Details of product >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
exports.getProductDetails = asyncWrapper(async (req, res, next) => {
  const id = req.params.id;
  let Product = await ProductModel.findById(id);
  if (Product) {
    Product.images = Product.images.map((img) => ({
      ...img,
      url: optimizeCloudinaryUrl(img.url),
    }));
  }

  if (!Product) {
    return next(new ErrorHandler("Product not found", 404));
  }
  res.status(201).json({
    succes: true,
    Product: Product,
  });
});

//>>>>>>>>>>>>> Create New Review or Update the review >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

exports.createProductReview = asyncWrapper(async (req, res, next) => {
  const { ratings, comment, productId, title, recommend } = req.body;
  const review = {
    userId: req.user._id,
    name: req.user.name,
    ratings: Number(ratings),
    title: title,
    comment: comment,
    recommend: recommend,
  };

  const product = await ProductModel.findById(productId);

  // check if user already reviewed
  const isReviewed = product.reviews.find((rev) => {
    return rev.userId.toString() === req.user._id.toString();
  });

  if (isReviewed) {
    // Update the existing review
    product.reviews.forEach((rev) => {
      if (rev.userId.toString() === req.user._id.toString()) {
        rev.ratings = ratings;
        rev.comment = comment;
        rev.recommend = recommend;

        rev.title = title;
        product.numOfReviews = product.reviews.length;
      }
    });
  } else {
    // Add a new review
    product.reviews.push(review);
    product.numOfReviews = product.reviews.length;
  }

  // Calculate average ratings
  let totalRatings = 0;
  product.reviews.forEach((rev) => {
    totalRatings += rev.ratings;
  });
  product.ratings = totalRatings / product.reviews.length;

  // Save to the database
  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
  });
});


// >>>>>>>>>>>>>>>>>>>>>> Get All Reviews of a product>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
exports.getProductReviews = asyncWrapper(async (req, res, next) => {
  // we need product id for all reviews of the product

  const product = await ProductModel.findById(req.query.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  res.status(200).json({
    success: true,
    reviews: product.reviews,
  });
});

//>>>>>>>>>>>>>>>>>>>>>> delete review >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
exports.deleteReview = asyncWrapper(async (req, res, next) => {
  // we have review id and product id here in req object
  // find thr product with product id

  const product = await ProductModel.findById(req.query.productId);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // check if ther any review avalible with given reviwe id. then filter the review array store inside reviews without that review
  const reviews = product.reviews.filter(
    (rev) => { return rev._id.toString() !== req.query.id.toString() }
  );
  // once review filterd then update new rating from prdoduct review
  let avg = 0;
  reviews.forEach((rev) => {

    avg += rev.ratings;
  });



  let ratings = 0;
  if (reviews.length === 0) {
    ratings = 0;
  } else {
    ratings = avg / reviews.length;
  }
  // also set  numOfReviews in product
  const numOfReviews = reviews.length;
  // now update the product schema with these values
  await ProductModel.findByIdAndUpdate(
    req.query.productId,
    {
      reviews,
      ratings,
      numOfReviews,
    },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );

  res.status(200).json({
    success: true,
  });
});
