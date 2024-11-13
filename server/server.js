const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const cors = require('cors'); // Import the cors package
const authService = require('./auth.service');

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

// Route to get admin information
app.get('/api/dashboard', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/api/books', async (req, res) => {
  try {
      const { data, error } = await supabase
          .from('books')
          .select('*');

      if (error) throw error;

      res.json(data);
  } catch (error) {
      res.status(500).send(error.message);
  }
});

app.get('/api/public_books', async (req, res) => {
  try {
      const { data, error } = await supabase
          .from('profile_books_testing')
          .select('*');

      if (error) throw error;

      res.json(data);
  } catch (error) {
      res.status(500).send(error.message);
  }
});

app.get('/api/books_borrowed', async (req, res) => {
  try {
      const { data: borrower, error: getUserError } = await supabase.auth.getUser();

      const { data, error } = await supabase
          .from('profile_books_testing')
          .select('*')
          .eq('borrower_id', borrower.user.id)

      if (error) throw error;

      res.json(data);
  } catch (error) {
      res.status(500).send(error.message);
  }
});

app.get('/api/user', async (req, res) => {
  try {
    const { data: { user }, errorUser } = await supabase.auth.getUser();

    const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id);
    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).send(error.message);
  }
})

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

// Route to add a new user
app.post('/api/newBook', async (req, res) => {
  const { title, author, genre, publisher, publication_year } = req.body;
  const { data: { user }, error: errorUser } = await supabase.auth.getUser();
   
  try {
      // Step 2: Check if user is authenticated
      if (errorUser || !user) {
        return res.status(401).json({ error: 'User not authenticated.' });
      }

      // Step 3: Insert the book into `books` table
      const { data, error } = await supabase
          .from('books')
          .insert([{ 
              user_id: user.id,
              title, 
              author, 
              genre, 
              publisher, 
              publication_year,
              status: 'available'
          }]);

      if (error) {
        console.error('Error inserting into books table:', error.message);
        throw error;
      }

      // Step 4: Insert a copy into `public_books` table
      const { data: dataCopy, error: errorCopy } = await supabase
          .from('profile_books_testing')
          .insert([{ 
              user_id: user.id, 
              title, 
              author, 
              genre, 
              publisher, 
              publication_year,
              status: 'available'
          }]);

      if (errorCopy) {
        console.error('Error inserting into public_books table:', errorCopy.message);
        throw errorCopy;
      }

      res.status(201).json({ data, dataCopy });
  } catch (error) {
      console.error('Error inserting book:', error.message); // Log the error
      res.status(500).json({ error: error.message });
  }
});


app.delete('/api/deleteBook/:id', async (req, res) => {
  const { id } = req.params; // Get the book ID from the URL
  try {
      const { data, error } = await supabase
          .from('books')
          .delete()
          .eq('id', id); // Replace 'id' with the actual field name if different

      if (error) throw error;


      const { dataCopy, errorCopy } = await supabase
          .from('profile_books_testing')
          .delete()
          .eq('id', id); // Replace 'id' with the actual field name if different

      if (errorCopy) throw errorCopy;


      res.status(200).json(data); // Respond with the deleted data
  } catch (error) {
      console.error('Error deleting book:', error); // Log the error
      res.status(500).send(error.message);
  }
});

app.put('/api/editBook/:id', async (req, res) => {
  const id = req.params.id;
  const { title, author, genre, publisher, publication_year } = req.body; // Expecting these fields from the client

  try {
      const { data, error } = await supabase
          .from('books')
          .update({ title, author, genre, publisher, publication_year })
          .eq('id', id); // Assuming 'id' is the primary key

      if (error) throw error;

      const { dataCopy, errorCopy } = await supabase
          .from('profile_books_testing')
          .update({ title, author, genre, publisher, publication_year })
          .eq('id', id); 

      if (errorCopy) throw errorCopy;


      res.status(200).json(data); // Assuming data is an array, return the first element
  } catch (error) {
      console.error('Error updating book:', error);
      res.status(500).send(error.message);
  }
});

app.get('/api/books/:id', async (req, res) => {
    const bookId = req.params.id;
    
    try {
        const { data, error } = await supabase
            .from('books') // Replace with your table name
            .select('*')
            .eq('id', bookId);

        if (error || !data) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json(data); // Send back the book object
    } catch (error) {
        console.error('Error fetching book details', error);
        res.status(500).json({ error: 'Server error' });
    }
});


app.put('/api/update-profile/:book_id', async (req, res) => {
  const book_id = req.params.book_id; // Get book_id from URL parameters
  const { genre, published_year, isbn, author_contact } = req.body; // Get data from the request body

  // Update the book profile in the Supabase table
  const { data, error } = await supabase
    .from('books') // Change 'book_profiles' to your actual table name
    .update({ genre, published_year, isbn, author_contact }) // Update the relevant fields
    .eq('id', book_id); // Use the book_id from the URL

  if (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Error updating profile' });
  }

  res.json({ message: 'Profile updated successfully', data });
});

app.put('/api/update-user-profile/:user_id', async (req, res) => {
  const user_id = req.params.user_id; // Get book_id from URL parameters
  const { address, age, ic, phone_no } = req.body; // Get data from the request body

  // Update the book profile in the Supabase table
  const { data, error } = await supabase
    .from('profiles') // Change 'book_profiles' to your actual table name
    .update({ address, age, ic, phone_no }) // Update the relevant fields
    .eq('id', user_id); // Use the book_id from the URL

  if (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Error updating profile' });
  }

  res.json({ message: 'Profile updated successfully', data });
});

//AUTH
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { user, error } = await supabase.auth.signInWithPassword({ email, password });
    const { data: existingUser, error: getUserError } = await supabase.auth.getUser();
    const userId = existingUser.user.user_metadata.sub; // Access the sub field

    const { data: userData, error: fetchError } = await supabase
      .from('profiles')
      .select('first_login')
      .eq('id', userId) // Use the userId obtained from user_metadata
      .single();

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    const isFirstLogin = userData?.first_login || false;
    if (isFirstLogin) {
      await supabase
        .from('profiles')
        .update({ first_login: false })
        .eq('id', userId);
    }

    // Respond with user info and first login status
    res.status(200).json({ user: { id: userId, email: existingUser.user.user_metadata.email }, isFirstLogin });

    res.status(200).json(user);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});
  
app.post('/api/register', async (req, res) => {
  const { email, password, firstName, lastName} = req.body;

  try {
    // Step 1: Register the user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        },
      },
    });

    if (signUpError) {
      throw signUpError;
    }

    // Get the user ID from the response
    const userId = data.user.id;

    // Step 2: Insert into the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update([
        { id: userId, email: email, first_name: firstName, last_name: lastName, first_login: true }
      ])
      .eq('id', userId);

    if (profileError) {
      throw profileError;
    }

    // Respond with success
    res.status(201).json({ message: 'User registered successfully', user: data.user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});


  
  app.post('/api/logout', async (req, res) => {
    try {
      // Assuming you have already initialized your Supabase client
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error; // If there's an error, throw it to be caught in the catch block
      }
      
      // Respond with success message
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/borrow', async (req, res) => {
    const { bookId } = req.body;
    const { data: { user }, error: errorUser } = await supabase.auth.getUser();
    if (errorUser || !user) {
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    try {
        // Update `profile_books_testing` table
        const { data: updatedProfileBook, error: publicBooksError } = await supabase
            .from('profile_books_testing')
            .update({ status: 'pending', borrower_id: user.id })
            .eq('id', bookId)
            .select('*');  // Fetch the updated row

        if (publicBooksError) {
            console.error('Error updating profile_books_testing:', publicBooksError);
            return res.status(500).json({ error: 'Failed to update profile_books_testing' });
        }

        // Update `books` table
        const { data: updatedBook, error: booksError } = await supabase
            .from('books')
            .update({ status: 'pending', borrower_id: user.id })
            .eq('id', bookId)
            .select('*');  // Fetch the updated row

        if (booksError) {
            console.error('Error updating books:', booksError);
            return res.status(500).json({ error: 'Failed to update books' });
        }

        // Respond with only the updated rows
        return res.status(200).json({
            updatedProfileBook,
            updatedBook,
        });
    } catch (error) {
        console.error('Unexpected error:', error.message);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
});

app.get('/api/address', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('address', null);  // Filter where address is not NULL

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/api/user-address', async (req, res) => {
  try {
    const { data: { user }, error: errorUser } = await supabase.auth.getUser();
    const { data, error }  = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id);

    if (error) throw error;
    res.json(data);

  } catch (error) {
    res.status(500).send(error.message);
  }
})




