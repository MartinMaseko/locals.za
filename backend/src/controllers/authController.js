// backend/src/controllers/authController.js
// Import the Supabase client to interact with the database
const supabase = require('../utils/supabaseClient');

// Import the JSON Web Token library for creating tokens
const jwt = require('jsonwebtoken');

// Controller functions for handling user registration and login
exports.register = async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data.user });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: error.message });

  const token = jwt.sign({ id: data.user.id, email: data.user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ user: data.user, token });
};