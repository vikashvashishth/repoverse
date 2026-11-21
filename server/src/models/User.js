const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, select: false },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: { createdAt: true, updatedAt: false } });

userSchema.set('toJSON', {
  transform: (_doc, value) => { delete value.password; return value; }
});

module.exports = mongoose.model('User', userSchema);
