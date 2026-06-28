const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const mongoose = require('mongoose');

const User = mongoose.model('User', {
  name: String,
 phone: { type: String, unique: true },
  username: String,
  password: String
});

router.post('/register', async (req, res) => {
  const { name, phone, username, password } = req.body;

  const exist = await User.findOne({ phone });
if (exist) {
  return res.json({
    success: false,
    message: "Phone already exists"
  });
}
  try {
  const hashedPassword = await bcrypt.hash(password, 10);

const user = new User({
  name,
  phone,
  username,
  password: hashedPassword
});

await user.save();
  res.json({ success: true });

} catch (err) {

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Phone number already registered"
    });
  }

  return res.status(500).json({
    success: false,
    message: "Server error"
  });
}
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user) return res.json({ success: false });

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) return res.json({ success: false });

  res.json({ success: true, user });
});

module.exports = router;