require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { setIO } = require('./workers/classificationWorker');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.set('io', io);
setIO(io); // pass io to worker

io.on('connection', (socket) => {
  console.log('Admin connected:', socket.id);
  socket.on('disconnect', () => console.log('Admin disconnected:', socket.id));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});