import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

// Enable JSON parsing if needed
app.use(express.json());

// Health check endpoint for Cloud Run
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Serve static assets from dist
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    // Service worker and manifest should not be cached aggressively
    if (filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js') || filePath.endsWith('manifest.webmanifest')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// SPA fallback: send index.html for all non-static routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`EduTrack server listening on 0.0.0.0:${port}`);
});

// Graceful shutdown handling for Cloud Run container lifecycle
const shutdown = () => {
  server.close(() => {
    console.log('Server terminated gracefully');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;
