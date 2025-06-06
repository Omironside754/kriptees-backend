const express = require('express');
const router = express.Router();
const { createBlog , getAllBlogs , getSingleBlog , updateBlog , deleteBlog } = require('../controller/blogController');
const { isAuthentictedUser, authorizeRoles } = require('../middleWare/auth');

//public routes
router.route('/blogs').get(getAllBlogs);
router.route('/blog/:id').get(getSingleBlog);

//admin routes
router.route('/admin/blog/new').post(isAuthentictedUser, authorizeRoles('admin'), createBlog);
router.route('/admin/blog/:id')
    .put(isAuthentictedUser, authorizeRoles('admin'), updateBlog)
    .delete(isAuthentictedUser, authorizeRoles('admin'), deleteBlog);

module.exports = router;
