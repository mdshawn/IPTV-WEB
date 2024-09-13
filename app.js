const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const app = express();
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const readline = require('readline');
const bcrypt = require('bcrypt');
const session = require('express-session');

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'fuckifyoutrytohack', // Change this to a secure key
  resave: false,
  saveUninitialized: true
}));

// Create connection to MySQL database
const db = mysql.createConnection({
  host: '173.252.167.70',
  user: 'mujahidu_iptvadmin',
  password: 'Mujahidul0@', // Replace with your actual password
  database: 'mujahidu_iptv'
});

// Connect to MySQL database
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to database');
});

// Set view engine
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('public'));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Route for rendering index page
app.get('/', (req, res) => {
  let q = 'SELECT * FROM channels';
  db.query(q, (err, results) => {
    if (err) {
      throw err;
    }
    console.log(results);
    res.render('index', { channels: results });
  });
});
app.get('/play/:id', (req, res) => {
  let id = req.params.id;
  let streamQuery = 'SELECT * FROM channels WHERE id = ?';
  let channelsQuery = 'SELECT * FROM channels';

  db.query(streamQuery, [id], (err, streamResults) => {
    if (err) {
      throw err;
    }
    db.query(channelsQuery, (err, channelsResults) => {
      if (err) {
        throw err;
      }
      console.log(streamResults);
      console.log(channelsResults);
      res.render('playChannel', { stream: streamResults[0], channels: channelsResults });
    });
  });
});

// Route for rendering login page
app.get('/login', (req, res) => {
  res.render('login'); // Create a login.ejs template
});

// Handle login form submission
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  let q = 'SELECT * FROM admin WHERE username = ?';
  db.query(q, [username], (err, results) => {
    if (err) {
      console.error('Error during login:', err);
      res.status(500).send('Error during login');
    } else if (results.length > 0) {
      // Compare hashed password
      bcrypt.compare(password, results[0].password, (err, match) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          res.status(500).send('Error during login');
        } else if (match) {
          req.session.user = { username: results[0].username };
          res.redirect('/dashboard');
        } else {
          res.status(401).send('Invalid username or password');
        }
      });
    } else {
      res.status(401).send('Invalid username or password');
    }
  });
});


// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}
// Route to render signup page
app.get('/getlost', (req, res) => {
  res.render('signup');
});

// Route to handle signup form submission
// Handle signup form submission
app.post('/signup', (req, res) => {
  const saltRounds = 10; // Define saltRounds for bcrypt hashing
  const { username, password, fullName } = req.body;

  // Hash the password before storing it
  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).send('Internal Server Error'); // Handle errors
    }

    // Query to insert the new admin into the database
    const query = 'INSERT INTO admin (username, password, full_name) VALUES (?, ?, ?)';
    db.query(query, [username, hashedPassword, fullName], (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Internal Server Error'); // Handle errors
      }

      // Redirect to login page after successful signup
      res.redirect('/login');
    });
  });
});

// Protect routes that start with /dashboard
app.use('/dashboard', isAuthenticated);

app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

app.get('/dashboard/channels', (req, res) => {
  let q = 'SELECT * FROM channels';
  db.query(q, (err, channels) => {
    if (err) {
      throw err;
    }
    console.log(channels);
    res.render('manageChannels', { channels });
  });
});
app.get('/dashboard/channels/test', (req, res) => {
  res.render('test');
});

app.get('/dashboard/channels/add', (req, res) => {
  res.render('addChannel');
});

app.post('/dashboard/channels/add', (req, res) => {
  let { channel_name, stream, logo, category, unique_name } = req.body;
  let data = [ channel_name, stream, logo, category, unique_name ];
  let q = 'INSERT INTO channels (name, stream, logo, category, uniqe_name) VALUES (?, ?, ?, ?, ?)';
  db.query(q, data, (err) => {
    if (err) {
      throw err;
    }
    res.redirect('/dashboard/channels/');
  });
});

app.get('/dashboard/channels/multiupload', (req, res) => {
  res.render('multiUpload');
});

// Multer setup for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Specify the upload folder
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Keep the original filename
  }
});

const upload = multer({ storage: storage });

// Helper function to parse M3U file
function parseM3U(filePath) {
  return new Promise((resolve, reject) => {
    const channels = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });

    let currentChannel = {};
    
    rl.on('line', (line) => {
      // Extract data from lines that contain channel information
      if (line.startsWith('#EXTINF')) {
        const tvgNameMatch = /tvg-name="([^"]+)"/.exec(line);
        const tvgLogoMatch = /tvg-logo="([^"]+)"/.exec(line);
        const tvgUnMatch = /tvg-unique_name="([^"]+)"/.exec(line);
        const groupTitleMatch = /group-title="([^"]+)"/.exec(line);
        
        currentChannel.name = tvgNameMatch ? tvgNameMatch[1] : '';
        currentChannel.logo = tvgLogoMatch ? tvgLogoMatch[1] : '';
        currentChannel.unique_name = tvgUnMatch ? tvgUnMatch[1] : '';
        currentChannel.category = groupTitleMatch ? groupTitleMatch[1] : '';
      } else if (line.startsWith('http')) {
        currentChannel.stream = line.trim(); // Save the stream link
        channels.push({ ...currentChannel }); // Push the channel object to the list
        currentChannel = {}; // Reset for the next channel
      }
    });

    rl.on('close', () => resolve(channels));
    rl.on('error', (err) => reject(err));
  });
}

// Route for handling M3U file upload
app.post('/dashboard/channels/multiupload', upload.single('m3u_file'), (req, res) => {
  const filePath = req.file.path;

  parseM3U(filePath)
    .then((channels) => {
      // Insert each channel into the database if it doesn't already exist
      const query = 'INSERT INTO channels (name, stream, logo, category, uniqe_name) VALUES (?, ?, ?, ?, ?)';
      const checkQuery = 'SELECT COUNT(*) AS count FROM channels WHERE uniqe_name = ?';

      channels.forEach((channel) => {
        db.query(checkQuery, [channel.unique_name], (err, results) => {
          if (err) {
            console.error('Error checking channel:', err);
            return;
          }

          if (results[0].count === 0) {
            db.query(query, [channel.name, channel.stream, channel.logo, channel.category, channel.unique_name], (err) => {
              if (err) {
                console.error('Error inserting channel:', err);
              }
            });
          } else {
            console.log(`Channel with unique_name ${channel.unique_name} already exists. Skipping...`);
          }
        });
      });

      // Redirect after processing
      res.redirect('/dashboard/channels/');
    })
    .catch((err) => {
      console.error('Error parsing M3U file:', err);
      res.status(500).send('Failed to process file.');
    });
});

app.get('/dashboard/channels/delete/:id', (req, res) => {
  let id = req.params.id;
  let q = 'DELETE FROM channels WHERE id = ?';
  db.query(q, [id], (err) => {
    if (err) {
      throw err;
    }
    res.redirect('/dashboard/channels/');
  });
});

app.get('/dashboard/channels/edit/:id', (req, res) => {
  let id = req.params.id;
  let q = 'SELECT * FROM channels WHERE id = ?';
  db.query(q, [id], (err, channel) => {
    if (err) {
      throw err;
    }
    res.render('editChannel', { channel: channel[0] });
  });
});

app.post('/dashboard/channels/edit/:id', (req, res) => {
  let id = req.params.id;
  let { channel_name, stream, logo, category, unique_name } = req.body;
  let data = [ channel_name, stream, logo, category, unique_name, id ];
  let q = 'UPDATE channels SET name = ?, stream = ?, logo = ?, category = ?, uniqe_name = ? WHERE id = ?';
  db.query(q, data, (err) => {
    if (err) {
      throw err;
    }
    res.redirect('/dashboard/channels/edit/' + id);
  });
});

// Proxy setup for handling CORS
app.use('/stream', createProxyMiddleware({
    target: 'https://livess.jagobd.com.bd',
    changeOrigin: true,
    pathRewrite: {
        '^/stream': '', // Remove "/stream" from the URL
    },
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('Origin', ''); // Remove origin header to prevent CORS issues
    }
}));

// Start the server
app.listen(4000, () => {
  console.log('Server is running on http://localhost:4000');
});
