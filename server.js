const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');

// Log uncaught exceptions and unhandled rejections so we can diagnose crashes
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION -', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED REJECTION at Promise', p, 'reason:', reason);
});

process.on('beforeExit', (code) => {
  console.log('process beforeExit, code=', code);
});
process.on('exit', (code) => {
  console.log('process exit, code=', code);
});
process.on('SIGINT', () => {
  console.log('Received SIGINT, exiting');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, exiting');
  process.exit(0);
});

const app = express();
const server = http.createServer(app);
const path = require('path');

// Limit allowed origin in production via env var; default to localhost for local testing
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

const io = new Server(server, {
  cors: {
    origin: allowedOrigin
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files from project root (index.html, scripts, css)
// Serve only the public folder to avoid exposing source files
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Simulation removed: this server now relays real connected clients' positions only.
// If you previously relied on a /api/objects endpoint, it now returns an empty object.
const objects = {};

// Basic API route (after objects are defined)
app.get('/api/objects', (req, res) => {
  res.json(objects);
});

// Geo IP endpoint: get client's IP and geocode it
const geoCache = {}; // Cache locations to avoid rate limiting

app.get('/api/geo-ip', (req, res) => {
  try {
    // Get client IP from request
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    clientIp = clientIp.split(',')[0].trim(); // Handle proxied IPs
    
    console.log(`Geolocation request from IP: ${clientIp}`);
    
    // Check cache first (very aggressive caching to avoid rate limiting)
    if (geoCache[clientIp] && Date.now() - geoCache[clientIp].timestamp < 600000) {
      // Cache valid for 10 minutes
      console.log(`Using cached location for ${clientIp}`);
      return res.json(geoCache[clientIp].data);
    }
    
    // If localhost, try to get the real public IP
    const isLocalhost = clientIp === '::1' || clientIp === '127.0.0.1' || clientIp === 'localhost';
    
    if (isLocalhost) {
      console.log('Localhost detected, attempting to get public IP...');
      // Use a different, more reliable service: ip-api.com (free tier, no key needed)
      return getPublicIpAndGeocode(res);
    }
    
    console.log(`Geocoding IP: ${clientIp}`);
    geocodeIp(clientIp, res);
  } catch (err) {
    console.error('Geo IP error:', err);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

function getPublicIpAndGeocode(res) {
  // Use a free IP geolocation service that includes both IP detection and geocoding
  // ip-api.com is more reliable than ipapi.co for localhost scenarios
  https.get('https://ip-api.com/json/?fields=status,country,city,lat,lon,isp,ip', { timeout: 5000 }, (geoRes) => {
    let body = '';
    geoRes.on('data', chunk => body += chunk);
    geoRes.on('end', () => {
      try {
        const geoData = JSON.parse(body);
        if (geoData.status === 'success' && typeof geoData.lat === 'number' && typeof geoData.lon === 'number') {
          const result = {
            lat: geoData.lat,
            lng: geoData.lon,
            city: geoData.city || 'Unknown',
            country: geoData.country || 'Unknown',
            ip: geoData.ip || 'unknown'
          };
          console.log('Got public IP location:', result);
          res.json(result);
        } else {
          console.error('Invalid response from ip-api.com:', geoData);
          res.status(400).json({ error: 'Unable to determine location' });
        }
      } catch (parseErr) {
        console.error('Failed to parse public IP response:', parseErr.message);
        res.status(500).json({ error: 'Unable to determine location' });
      }
    });
  }).on('error', (err) => {
    console.error('Public IP request failed:', err.message);
    res.status(500).json({ error: 'Unable to determine location' });
  });
}

function geocodeIp(ip, res) {
  // Use ip-api.com instead of ipapi.co (better uptime and rate limits)
  const url = `https://ip-api.com/json/${ip}?fields=status,country,city,lat,lon,isp`;
  https.get(url, { timeout: 5000 }, (geoRes) => {
    let body = '';
    geoRes.on('data', chunk => body += chunk);
    geoRes.on('end', () => {
      try {
        const geoData = JSON.parse(body);
        if (geoData.status === 'success' && typeof geoData.lat === 'number' && typeof geoData.lon === 'number') {
          const result = {
            lat: geoData.lat,
            lng: geoData.lon,
            city: geoData.city || 'Unknown',
            country: geoData.country || 'Unknown',
            ip: ip
          };
          // Cache the result (aggressive caching)
          geoCache[ip] = { data: result, timestamp: Date.now() };
          console.log('Geocoded IP', ip, ':', result);
          res.json(result);
        } else {
          console.error('Invalid response from ip-api.com:', geoData);
          res.status(400).json({ error: 'Unable to geocode IP' });
        }
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr.message);
        res.status(500).json({ error: 'Parse failed' });
      }
    });
  }).on('error', (err) => {
    console.error('Geo IP HTTPS error:', err.message);
    res.status(500).json({ error: 'Geocoding failed' });
  });
}

// Connected users (clients sending their own device locations)
const users = {};

const UPDATE_INTERVAL = 2000; // ms
const TRAJECTORY_LIMIT = 200;

// No movement simulation on server. Clients send their own device locations
// and the server simply relays the `users` object to all connected clients.

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  // send current known users
  socket.emit('users', users);

  // when a client sends its device location
  socket.on('user-location', (payload) => {
    // payload expected: { lat, lng, name? }
    // Basic validation to avoid malformed data
    if (!payload || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') return;
    const lat = payload.lat;
    const lng = payload.lng;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

    users[socket.id] = Object.assign({ id: socket.id, lastUpdate: new Date().toISOString() }, {
      lat: lat,
      lng: lng,
      name: typeof payload.name === 'string' ? payload.name : 'User'
    });
    console.log(`user-location from ${socket.id}: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    // broadcast updated users to all clients
    io.emit('users', users);
  });

  socket.on('track', (id) => {
    console.log(`client ${socket.id} tracking ${id}`);
  });

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id);
    // remove user location when client disconnects
    if (users[socket.id]) {
      delete users[socket.id];
      io.emit('users', users);
    }
  });
});

// No server-side simulation tick; server relays live user locations only.

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
