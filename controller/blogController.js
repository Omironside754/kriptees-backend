const Blog = require("../model/blogModel");
const ErrorHandler = require("../utils/errorHandler");
const asyncWrapper = require("../middleWare/asyncWrapper");


// Create a new blog post
exports.createBlog = asyncWrapper(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new ErrorHandler("Only admin can create blog", 403));
  }

  const { title, sections } = req.body;

  const blog = await Blog.create({
    title,
    sections,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    blog,
  });
});

// Get all blog posts
exports.getAllBlogs = asyncWrapper(async (req, res, next) => {
  const blogs = await Blog.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    blogs,  // ✅ Should be an array
  });
});



// Get a single blog post by ID
exports.getSingleBlog = asyncWrapper(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) {
    return next(new ErrorHandler("Blog not found", 404));
  }

  res.status(200).json({
    success: true,
    blog,
  });
});

// Update a blog post
exports.updateBlog = asyncWrapper(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new ErrorHandler("Only admin can update blog", 403));
  }

  const blog = await Blog.findById(req.params.id);
  if (!blog) {
    return next(new ErrorHandler("Blog not found", 404));
  }

  if (req.body.title !== undefined) blog.title = req.body.title;
  if (req.body.sections !== undefined) blog.sections = req.body.sections;

  await blog.save();

  res.status(200).json({
    success: true,
    message: "Blog updated successfully",
    blog,
  });
});
``
// Delete a blog post
exports.deleteBlog = asyncWrapper(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new ErrorHandler("Only admin can delete blog", 403));
  }

  const blog = await Blog.findById(req.params.id);
  if (!blog) {
    return next(new ErrorHandler("Blog not found", 404));
  }

  await blog.deleteOne();

  res.status(200).json({
    success: true,
    message: "Blog deleted successfully",
  });
});
