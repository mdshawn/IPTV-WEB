const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const app = express();
const mysql = require('mysql2');
const bodyParser = require('body-parser');

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Create connection to MySQL database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2580123',
  database: 'iptv'
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

app.get('/allchannels', (req, res) => {  
  let q = 'SELECT * FROM channels';
  db.query(q, (err, channels) => {
    if (err) {
      throw err;
    }
    console.log(channels);
    res.render('channels', { channels });
  });
});

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

app.get('/dashboard/channels/add', (req, res) => {
  res.render('addChannel');
});

app.post('/dashboard/channels/add', (req, res) => {
  let { channel_name, stream, logo, category } = req.body;
  let data = [ channel_name, stream, logo, category];
  let q = 'INSERT INTO channels (name, stream, logo, category) VALUES (?, ?, ?, ?)';
  db.query(q, data, (err) => {
    if (err) {
      throw err;
    }
    res.redirect('/dashboard/channels/');
  });
});

app.get('/dashboard/channels/edit/:id', (req, res) => {
  let id = req.params.id;
  let q = 'SELECT * FROM channels Where id = ?';
  db.query(q, [id], (err, channel) => {
    if (err) {
      throw err;
    }
    res.render('editChannel', { channel: channel[0] });
  });
});

app.get('/dashboard/channels/test', (req, res) => {
  res.render('test');
});
app.post('/dashboard/channels/edit/:id', (req, res) => {
  let id = req.params.id;
  let { channel_name, stream, logo, category } = req.body;
  let data = [ channel_name, stream, logo, category, id ];
  console.log(req.body);
  let q = 'UPDATE channels SET name = ?, stream = ?, logo = ?, category = ? WHERE id = ?';
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