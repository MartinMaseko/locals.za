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

// Sign out the current user (requires Supabase access token from frontend)
exports.signOut = async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: 'Access token required' });

  const { error } = await supabase.auth.signOut(access_token);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Signed out successfully' });
};

// Helper to get the current user session (requires Supabase access token from frontend)
exports.getSession = async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: 'Access token required' });

  const { data, error } = await supabase.auth.getUser(access_token);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data.user });
};