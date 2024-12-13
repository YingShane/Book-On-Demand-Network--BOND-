


const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const cors = require('cors'); // Import the cors package
const authService = require('./auth.service');
const { Resend } = require('resend');


// Load environment variables from .env file
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const resend = new Resend(process.env.RESEND_API_KEY);

const flaskServerUrl = process.env.FLASK_SERVER_URL;
const supabase = createClient(supabaseUrl, supabaseKey);

const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage() });

const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/dist'));

app.all('*', (req, res) => {
  res.status(200).sendFile(__dirname + '/dist/index.html')
})

// Ensure the 'uploads' directory exists, create it if it doesn't
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Uploads directory created.');
} else {
  console.log('Uploads directory already exists.');
}

// Set up Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);  // Set the destination for uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); // Use a unique filename
  }
});

const upload = multer({ storage: storage });
// Route to get admin information
app.get('/api/dashboard', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.getUser();

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


// Route to add a new user
app.post('/api/newBook', async (req, res) => {
  const { title, author, genre, publisher, publication_year, meeting_location, meeting_coordinates } = req.body;
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
        status: 'available',
        meeting_location,
        meeting_coordinates
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
        status: 'available',
        meeting_location,
        meeting_coordinates
      }]);

    if (errorCopy) {
      console.error('Error inserting into public_books table:', errorCopy.message);
      throw errorCopy;
    }

    res.status(201).json({
      message: 'Book successfully added!',
      book: data // Assuming only one book is inserted
    });
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
  const { title, author, genre, publisher, publication_year, meeting_location, meeting_coordinates } = req.body; // Expecting these fields from the client

  try {
    const { data, error } = await supabase
      .from('books')
      .update({ title, author, genre, publisher, publication_year, meeting_location, meeting_coordinates })
      .eq('id', id); // Assuming 'id' is the primary key

    if (error) throw error;

    const { dataCopy, errorCopy } = await supabase
      .from('profile_books_testing')
      .update({ title, author, genre, publisher, publication_year, meeting_location, meeting_coordinates })
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
  const user_id = req.params.user_id;
  const { address, age, ic, phone_no } = req.body; // Get data from the request body

  // Update the book profile in the Supabase table
  const { data, error } = await supabase
    .from('profiles')
    .update({ address, age, ic, phone_no })
    .eq('id', user_id);

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
  const { email, password, firstName, lastName } = req.body;

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

app.get('/api/meeting-location', async (req, res) => {
  try {
    const { data: { user }, error: errorUser } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('books')
      .select('meeting_location')
      .eq('user_id', user.id);

    if (error) throw error;
    res.json(data);

  } catch (error) {
    res.status(500).send(error.message);
  }
})

app.get('/api/all-meeting-locations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profile_books_testing')
      .select('user_id, meeting_location');  // Get both user_id and meeting_location fields

    if (error) throw error;

    // Filter out any null values in meeting_location
    const validMeetingLocations = data.filter(location => location.meeting_location !== null)
      .map(location => ({
        user_id: location.user_id,
        meeting_location: location.meeting_location
      }));
    // Send the filtered list of valid meeting locations along with user_id
    res.json({ meeting_locations: validMeetingLocations });

  } catch (error) {
    res.status(500).send(error.message);
  }
});


app.get('/api/user-id-info', async (req, res) => {

  const user_id = req.query.user_id;

  if (!user_id) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    // Query Supabase to match the `address` column in `profiles` table
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(data[0]); // Return the first matching user profile
  } catch (err) {
    res.status(500).json({ error: 'An error occurred while fetching user info' });
  }
});

app.get('/api/user-info-address', async (req, res) => {

  const address = req.query.address;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    // Query Supabase to match the `address` column in `profiles` table
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('address', address);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'User not found for the provided address' });
    }

    res.json(data[0]); // Return the first matching user profile
  } catch (err) {
    res.status(500).json({ error: 'An error occurred while fetching user info' });
  }
});


app.get('/api/books-available/:id', async (req, res) => {
  try {
    // Query Supabase for books with status 'available'
    const userId = req.params.id;

    const { data, error } = await supabase
      .from('profile_books_testing')
      .select('*')
      .eq('status', 'available')
      .eq('user_id', userId);



    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while retrieving books' });
  }
});


app.post('/api/update-location', async (req, res) => {
  const { address, userId } = req.body;

  if (!address || !userId) {
    return res.status(400).json({ error: 'Address and userId are required' });
  }

  try {
    // Update the meeting_location column in profile_books_testing table
    const { data, error } = await supabase
      .from('profile_books_testing')
      .update({ meeting_location: address })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.status(200).json({ message: 'Location updated successfully', data });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});


app.get('/api/book-meeting-location/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('books')
      .select('meeting_location')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ meeting_location: data.meeting_location });
  } catch (error) {
    res.status(500).send(error.message);
  }
});


// app.post('/api/upload-cover', upload.single('image'), async (req, res) => {
//   try {
//       const { bookId } = req.body;  // Get bookId from the form data
//       const file = req.file;

//       if (!file) {
//           return res.status(400).send('No file uploaded');
//       }

//       const fileName = `${Date.now()}-${file.originalname}`;
//       const bucketName = 'book_covers';

//       // Upload the image to Supabase storage
//       const { data, error } = await supabase.storage
//           .from(bucketName)
//           .upload(fileName, file.buffer, {
//               contentType: file.mimetype,
//               upsert: false,
//           });
//       console.log(data)

//       if (error) {
//           console.error('Supabase upload error:', error);
//           return res.status(500).send('Error uploading image');
//       }

//       // Get the public URL for the uploaded image
//       const { data: publicUrl, error: urlError } = supabase.storage.from(bucketName).getPublicUrl(data.fullPath);

//       if (urlError) {
//           console.error('Error getting public URL:', urlError);
//           return res.status(500).send('Error fetching public URL');
//       }


//       console.log(bookId)
//       // Optional: Store the image URL in your Supabase database (books table)
//       const { data: dbData, error: dbError } = await supabase
//           .from('profile_books_testing')  // Assuming 'books' is the table storing book information
//           .update({ cover_url: publicUrl })  // Update the cover image URL for the book
//           .eq( 'id', bookId );  // Match the book ID to update the correct entry

//       if (dbError) {
//           console.error('Database update error:', dbError);
//           return res.status(500).send('Error saving image URL to database');
//       }

//       // Respond with the public URL of the uploaded image
//       res.status(200).json({ message: 'Upload successful', imageUrl: publicUrl });
//   } catch (err) {
//       console.error('Error:', err.message);
//       res.status(500).json({ error: err.message });
//   }
// });

app.post('/api/upload-cover', uploadMemory.single('image'), async (req, res) => {
  try {
    const { bookId } = req.body; // Get bookId from the form data
    const file = req.file;

    if (!file) {
      return res.status(400).send('No file uploaded');
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const bucketName = 'book_covers';

    // Upload the image to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).send('Error uploading image');
    }

    // Get the public URL for the uploaded image
    const { data: publicUrl, error: urlError } = supabase.storage.from(bucketName).getPublicUrl(data.fullPath);

    if (urlError) {
      console.error('Error getting public URL:', urlError);
      return res.status(500).send('Error fetching public URL');
    }

    // Optional: Store the image URL in your Supabase database (books table)
    const { data: dbData, error: dbError } = await supabase
      .from('profile_books_testing') // Assuming 'profile_books_testing' is the table storing book information
      .update({ cover_url: publicUrl, image_name: fileName }) // Update the cover image URL for the book
      .eq('id', bookId); // Match the book ID to update the correct entry

    if (dbError) {
      console.error('Database update error:', dbError);
      return res.status(500).send('Error saving image URL to database');
    }

    // Respond with the public URL of the uploaded image
    res.status(200).json({ message: 'Upload successful', imageUrl: publicUrl });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// API route to compare the uploaded image with book2.jpg
app.post('/api/compare-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const filePath = req.file.path;
    // console.log('File saved to:', filePath); // Log the file path for debugging

    // Create a FormData object to send the image
    const formData = new FormData();
    const fileStream = fs.createReadStream(filePath);

    // Append the file stream to FormData
    formData.append('file', fileStream, req.file.originalname);

    // Get headers from FormData
    const headers = formData.getHeaders();

    // Send the image to the Flask server for processing
    const flaskResponse = await axios.post(flaskServerUrl, formData, { headers });

    // Clean up the uploaded file from the server
    fs.unlinkSync(filePath); // Delete the file after processing

    // Return the response from Flask back to the frontend
    return res.json(flaskResponse.data);
  } catch (error) {
    console.error('Error in comparing images:', error);
    return res.status(500).json({ error: 'An error occurred while processing the image' });
  }
});

app.post('/api/compare-images', upload.single('image'), async (req, res) => {
  try {
    const { file } = req;
    const imageUrls = JSON.parse(req.body.imageUrls);

    console.log(imageUrls)

    if (!file) {
      return res.status(400).send({ error: 'No file uploaded' });
    }

    if (!imageUrls || imageUrls.length === 0) {
      return res.status(400).send({ error: 'No image URLs provided' });
    }

    // Prepare data for Flask
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path)); // Send the image
    formData.append('imageUrls', JSON.stringify(imageUrls)); // Add URLs

    console.log(formData.getHeaders());
    // Send request to Flask
    const flaskResponse = await axios.post(flaskServerUrl, formData, {
      headers: formData.getHeaders(),
    });

    // Cleanup uploaded file
    fs.unlinkSync(file.path);

    // Return Flask results to Angular
    res.json(flaskResponse.data);
  } catch (error) {
    console.error('Error communicating with Flask:', error);
    res.status(500).send({ error: 'Error comparing images' });
  }
});


app.post('/api/borrowBook', async (req, res) => {
  const { userId, book } = req.body;

  // Step 1: Retrieve the lender's email from Supabase profiles table
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('user_id', userId)
    .single();  // Get the first matching profile

  if (profileError || !profiles) {
    return res.status(400).json({ success: false, message: 'Lender not found.' });
  }

  // Step 2: Insert a borrow ticket into the profile_books_testing table
  const { data: borrowTicket, error: borrowError } = await supabase
    .from('profile_books_testing')
    .insert([
      {
        user_id: userId,
        book_id: book.id,
        status: 'pending', // Set the status to 'pending' for approval
        requested_at: new Date(),
      },
    ]);

  if (borrowError) {
    return res.status(500).json({ success: false, message: 'Error creating borrow ticket.' });
  }

  // Step 3: Send an email to the lender
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your preferred email service
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-email-password', // Make sure to use environment variables for security
    },
  });

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: profiles.email,
    subject: `Borrow Request for Book: ${book.title}`,
    text: `You have received a borrow request for your book titled "${book.title}". Please approve or deny the request.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Request sent successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error sending email.' });
  }
});


//Email
app.post('/api/sendMail', async (req, res) => {
  try {
    // Extract email details from request body
    const { to, subject, text, html } = req.body;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'yys1111q@gmail.com',
      to: 'yeo3316@gmail.com',
      subject: 'HELLO',
      text: 'HELLO',
      html: '<p>hi</p>'
    });

    if (error) {
      console.error('Email sending error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    res.status(200).json({ message: 'Email sent successfully', data });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Start the server
// app.listen(port, () => {
//   console.log(`Server is running at http://localhost:${port}`);
// });


app.listen(process.env.PORT || 3000);