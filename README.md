# TrackLive (Local)

This is a small demo app that simulates vehicle tracking and shows real-time positions on Google Maps using a Node.js backend + Socket.IO.

Files:
- `index.html` - frontend UI
- `estilo.css` - styles
- `app.js` - frontend logic (connects to server via Socket.IO if available)
- `map-renderer.js` - canvas trajectory overlay
- `server.js` - Express + Socket.IO server that simulates vehicle positions
- `package.json` - dependencies and scripts

Quick start (Windows PowerShell):

1. Install Node.js (>=14) if you don't have it.
2. Install dependencies:

```powershell
cd "c:\Users\kenne\OneDrive\Escritorio\App Localizar Buses"
npm install
```

3. Start the server:

```powershell
npm start
```

4. Open your browser and go to: `http://localhost:3000`

Notes:
- The app loads the Google Maps JS API; replace the placeholder `YOUR_GOOGLE_MAPS_API_KEY` in `index.html` with your API key.
- If you open `index.html` directly from file system (file://) the Socket.IO client won't connect and the app will fall back to client-side simulation.
- To generate an API key, visit https://developers.google.com/maps/documentation/javascript/get-api-key

If you want, I can:
- Add an authentication layer on the server
- Persist tracks to a database
- Add controls to replay history
