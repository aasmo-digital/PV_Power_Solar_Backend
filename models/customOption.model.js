const mongoose = require('mongoose');

const customOptionSchema = new mongoose.Schema({
    fieldName: {
        type: String,
        required: true,
        index: true,
    },
    value: {
        type: String,
        required: true,
    },
    uniqueIdentifier: {
        type: String,
        unique: true,
    }
});

customOptionSchema.pre('save', function (next) {
    this.uniqueIdentifier = `${this.fieldName}-${this.value.toLowerCase()}`;
    next();
});


module.exports = mongoose.model('CustomOption', customOptionSchema);