const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const cors = require('cors'); // Import the cors package

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors()); // Enable CORS for all routes
app.use(express.json());

const authService = {
  async login(email, password) {
    const { user, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
    return user;
  },

  async register(email, password) {
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }
    return user;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    return true;
  },

  getCurrentUser() {
    return supabase.auth.user();
  },
};

module.exports = authService;
