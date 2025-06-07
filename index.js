import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { availableParallelism } from 'node:os';
import cluster from 'node:cluster';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';

if (cluster.isPrimary) {
  const numCPUs = availableParallelism();
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i
    });
  }
  setupPrimary();
} else {
  const db = await open({
    filename: 'chat.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_offset TEXT UNIQUE,
      content TEXT
    );
  `);

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {},
    adapter: createAdapter()
  });

  const __dirname = dirname(fileURLToPath(import.meta.url));

  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
  });

  io.on('connection', async (socket) => {
    socket.on('chat message', async ({ username, message }, clientOffset, callback) => {
      try {
        // Store username + message as a single string for now
        const content = `${username}: ${message}`;
        const result = await db.run('INSERT INTO messages (content, client_offset) VALUES (?, ?)', content, clientOffset);
        io.emit('chat message', { username, message }, result.lastID);
        callback();
      } catch (e) {
        if (e.errno === 19 /* SQLITE_CONSTRAINT */) {
          callback();
        } else {
          // Ignore other errors, client will retry
        }
      }
    });

    if (!socket.recovered) {
      try {
        await db.each(
          'SELECT id, content FROM messages WHERE id > ?',
          [socket.handshake.auth.serverOffset || 0],
          (_err, row) => {
            // Split stored content back into username and message
            const splitIndex = row.content.indexOf(': ');
            let user = 'Anonymous', msg = row.content;
            if (splitIndex !== -1) {
              user = row.content.substring(0, splitIndex);
              msg = row.content.substring(splitIndex + 2);
            }
            socket.emit('chat message', { username: user, message: msg }, row.id);
          }
        );
      } catch (e) {
        // Error ignored here
      }
    }
  });

  const port = process.env.PORT || 3000;
  const host = '0.0.0.0';

  server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});


}
