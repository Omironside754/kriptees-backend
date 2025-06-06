const mongoose = require('mongoose');   
const { createIndexes } = require('./userModel');

const sectionSchema = new mongoose.Schema({
    type:{
        type: String,
        enum: ['content', 'image'],
        required: true,
    },
    value: {
        type: String,
        required: true,
    },
});

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "blog title is required"],
    },
    sections: [sectionSchema],
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});
module.exports = mongoose.model("Blog", blogSchema);
