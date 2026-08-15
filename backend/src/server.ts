import express, { Application, Request, Response } from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/config';
import { connectDB } from './config/db';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { setupLiveLyricsSocket, initLiveStateFromDB } from './sockets/liveLyricsSocket';

const app: Application = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: config.clientOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Save io reference on Express application
app.set('io', io);

// Middleware
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Serve static Web Admin Dashboard & Projection Console
import fs from 'fs';
const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '../src/public');
app.use(express.static(publicDir));

// Mount REST API
app.use('/api', apiRoutes);

// Dynamic Smart TV Live Lyrics route
app.get('/tv', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'tv.html'));
});

// Catch-all for Web Admin SPA
app.get('*', (req: Request, res: Response) => {
  // If request is not an API call, return dashboard
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'Endpoint not found.' });
  }
});

// Global Error Handler
app.use(errorHandler);

// Setup Socket.IO real-time handlers
setupLiveLyricsSocket(io);

import { autoSyncChannelVideosJob } from './controllers/liveVideoController';

// Start Server & Connect Database
const startServer = async () => {
  await connectDB();
  
  await initLiveStateFromDB();

  server.listen(config.port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 SFGC Backend Server Running!`);
    console.log(`📡 REST API Base:        http://localhost:${config.port}/api`);
    console.log(`📊 Web Admin Dashboard:  http://localhost:${config.port}`);
    console.log(`🔌 Socket.IO Real-time:  ws://localhost:${config.port}`);
    console.log(`⚡ Environment:          ${config.nodeEnv}`);
    console.log(`======================================================\n`);
  });

  // 24/7 Background YouTube Channel Auto-Sync (polls every 30 seconds for instant new video detection)
  setInterval(async () => {
    try {
      await autoSyncChannelVideosJob(io);
    } catch (syncErr) {
      console.error('Background YouTube Channel Auto-Sync Error:', syncErr);
    }
  }, 30 * 1000);

  // Initial sync check 10 seconds after startup
  setTimeout(() => {
    autoSyncChannelVideosJob(io).catch(console.error);
  }, 10000);
};

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
});

export { app, server, io };
