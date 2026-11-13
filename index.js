import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

const client = new MongoClient(process.env.MONGO_URI);
const dbName = 'portfolio';

const gameRooms = {};
const matchingPairsRooms = new Map();

const matchingPairsRoomKey = (roomID) => roomID.trim().toLowerCase();

const matchingPairsRoomSnapshot = (room) => ({
  roomID: room.roomID,
  rows: room.rows,
  cols: room.cols,
  state: room.state,
  gameId: room.gameId,
  players: Object.fromEntries(
    Object.entries(room.players).map(([playerID, player]) => [
      playerID,
      {
        nickname: player.nickname,
        powerUp: player.powerUp,
        status: player.status,
        score: player.score
      }
    ])
  )
});

const broadcastMatchingPairsRoom = (room) => {
  io.to(room.socketRoom).emit('matchingPairs:roomUpdate', matchingPairsRoomSnapshot(room));
};

const completeMatchingPairsGame = (room) => {
  room.state = 'Lobby';
  const snapshot = matchingPairsRoomSnapshot(room);
  io.to(room.socketRoom).emit('matchingPairs:roomUpdate', snapshot);
  io.to(room.socketRoom).emit('matchingPairs:gameComplete', snapshot);
};

const isValidMatchingPairsGrid = (rows, cols) =>
  Number.isInteger(rows) &&
  Number.isInteger(cols) &&
  rows >= 2 &&
  cols >= 2 &&
  rows <= 12 &&
  cols <= 12 &&
  rows * cols <= 144 &&
  (rows * cols) % 2 === 0;

const normalizeMatchingPairsPowerUp = (powerUp) => {
  if (!powerUp || powerUp.type === 'none') {
    return { type: 'none', value: 0 };
  }

  if (powerUp.type === 'icon-variety') {
    const value = Number(powerUp.value);
    if (Number.isInteger(value) && value >= -12 && value <= 12) {
      return { type: 'icon-variety', value };
    }
  }

  if (powerUp.type === 'score-multiplier') {
    const value = Number(powerUp.value);
    if (Number.isInteger(value) && value >= 1 && value <= 5) {
      return { type: 'score-multiplier', value };
    }
  }

  return null;
};

const removeMatchingPairsPlayer = (socket, roomKey, playerID) => {
  const room = matchingPairsRooms.get(roomKey);
  const player = room?.players[playerID];
  if (!room || !player || player.socketID !== socket.id) return;

  delete room.players[playerID];
  socket.leave(room.socketRoom);
  socket.data.matchingPairsRoomKey = null;
  socket.data.matchingPairsPlayerID = null;

  if (Object.keys(room.players).length === 0) {
    matchingPairsRooms.delete(roomKey);
    return;
  }

  if (room.state === 'In Game' && Object.values(room.players).every((p) => p.status === 'Finished')) {
    completeMatchingPairsGame(room);
  } else {
    broadcastMatchingPairsRoom(room);
  }
};

const removeMinesPlayer = (socket, roomID, playerID) => {
  const room = gameRooms[roomID];
  const player = room?.players[playerID];
  if (!room || !player || player.socketID !== socket.id) return;

  delete room.players[playerID];
  socket.leave(roomID);
  socket.data.minesRoomID = null;
  socket.data.minesPlayerID = null;

  if (Object.keys(room.players).length === 0) {
    delete gameRooms[roomID];
    return;
  }

  const allPlayersFinished = Object.values(room.players).every((remainingPlayer) =>
    ["Blown Up", "Obliterated", "Victory", "Lobby"].includes(remainingPlayer.status)
  );
  if (room.state === "In Game" && allPlayersFinished) {
    room.state = "Lobby";
    io.to(roomID).emit('round_over', room);
  }
  io.to(roomID).emit('room_status_update', room);
};

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);

  socket.on('joinGame', ({ roomID, playerID, nickname, status, selectedPowerUp }, acknowledge) => {
    if (typeof roomID !== 'string' || !roomID.trim() ||
        typeof playerID !== 'string' || !playerID.trim() ||
        typeof nickname !== 'string' || !nickname.trim()) {
      if (typeof acknowledge === 'function') acknowledge({ ok: false, error: "Enter a room name and nickname." });
      return;
    }

    const previousRoomID = socket.data.minesRoomID;
    const previousPlayerID = socket.data.minesPlayerID;
    if (previousRoomID && previousPlayerID &&
        (previousRoomID !== roomID || previousPlayerID !== playerID)) {
      removeMinesPlayer(socket, previousRoomID, previousPlayerID);
    }

    socket.join(roomID);
    socket.data.minesRoomID = roomID;
    socket.data.minesPlayerID = playerID;

    if (!gameRooms[roomID]) {
      gameRooms[roomID] = {
        rows: 5,
        cols: 5,
        mines: 4, 
        rounds: 0,
        players: {},
        state: "Lobby"
      };
    }

    if (!gameRooms[roomID].players[playerID]) {
      gameRooms[roomID].players[playerID] = {
        rows: gameRooms[roomID].rows,
        cols: gameRooms[roomID].cols,
        mines: gameRooms[roomID].mines,
        nukes: 0,
        powerUp: selectedPowerUp || { type: "None", value: 0 }, 
        status: status || "Lobby",
        nickname: nickname,
        score: 0,
        socketID: socket.id
      };
    } else {
      gameRooms[roomID].players[playerID].nickname = nickname;
      gameRooms[roomID].players[playerID].powerUp = selectedPowerUp || gameRooms[roomID].players[playerID].powerUp;
      gameRooms[roomID].players[playerID].socketID = socket.id;
    }

    io.to(roomID).emit('room_settings_update', gameRooms[roomID]);
    if (typeof acknowledge === 'function') acknowledge({ ok: true });
  });

  socket.on('changeSettings', ({ rows, cols, mines, rounds, selectedPowerUp, roomID, playerID }) => {
    const room = gameRooms[roomID];
    if (!room || !room.players[playerID] ||
        room.players[playerID].socketID !== socket.id ||
        socket.data.minesRoomID !== roomID || socket.data.minesPlayerID !== playerID ||
        room.state !== "Lobby") return;

    // Synchronize base room settings
    room.rows = Number(rows);
    room.cols = Number(cols);
    room.mines = Number(mines);
    room.rounds = Number(rounds);

    if (selectedPowerUp) {
      room.players[playerID].powerUp = selectedPowerUp;
    }

    // Keep individual lobby player settings synced without zeroing out persistent values
    Object.keys(room.players).forEach((pid) => {
      room.players[pid].rows = room.rows;
      room.players[pid].cols = room.cols;
      room.players[pid].mines = room.mines;
    });

    io.to(roomID).emit('room_settings_update', room);
  });

  socket.on('startGame', ({ roomID, playerID }, acknowledge) => {
    const room = gameRooms[roomID];
    const fail = (message) => {
      if (typeof acknowledge === 'function') acknowledge({ ok: false, error: message });
    };
    if (!room || !room.players[playerID] || room.players[playerID].socketID !== socket.id ||
        socket.data.minesRoomID !== roomID || socket.data.minesPlayerID !== playerID) {
      fail("You are not a member of this Mines room.");
      return;
    }
    if (room.state !== "Lobby") {
      fail("This room is already playing.");
      return;
    }
    if (Object.values(room.players).some((player) => player.status !== "Lobby")) {
      fail("All players must return to the lobby before starting a new game.");
      return;
    }

    room.state = "In Game";

    // Calculate Extra Mines and Nukes across all players in the room
    let totalExtraMinesInRoom = 0;
    let totalNukesInRoom = 0;

    Object.values(room.players).forEach((p) => {
      if (p.powerUp?.type === "Extra Mines") {
        totalExtraMinesInRoom += Number(p.powerUp?.value) || 2;
      }
      if (p.powerUp?.type === "Nuke") {
        totalNukesInRoom += Number(p.powerUp?.value) || 1;
      }
    });

    Object.keys(room.players).forEach((pid) => {
      const p = room.players[pid];

      p.status = "In Game";
      p.score = 0;
      p.rows = Number(room.rows);
      p.cols = Number(room.cols);
      
      // Always add totalExtraMinesInRoom to the base room.mines setting
      p.mines = Number(room.mines) + totalExtraMinesInRoom;
      p.nukes = totalNukesInRoom; 
    });

    io.to(roomID).emit('start_game', { room });
    if (typeof acknowledge === 'function') acknowledge({ ok: true });
  });

  socket.on('endGame', ({ roomID, playerID, score, status }) => {
    const room = gameRooms[roomID];
    const player = room?.players[playerID];
    const numericScore = Number(score);
    if (!room || !player || player.socketID !== socket.id ||
        socket.data.minesRoomID !== roomID || socket.data.minesPlayerID !== playerID ||
        !Number.isFinite(numericScore) || numericScore < 0) return;

    player.score = numericScore;
    player.status = status;

    // Check if ALL players in the room have finished their round
    const allPlayersFinished = Object.values(room.players).every((p) => 
      p.status === "Blown Up" || p.status === "Obliterated" || p.status === "Victory" || p.status === "Lobby"
    );

    if (allPlayersFinished) {
      room.state = "Lobby";
      io.to(roomID).emit('round_over', room);
    }

    io.to(roomID).emit('room_status_update', room);
  });

  socket.on('statusUpdate', ({ roomID, playerID, status }) => {
    const room = gameRooms[roomID];
    const player = room?.players[playerID];
    if (player && player.socketID === socket.id &&
        socket.data.minesRoomID === roomID && socket.data.minesPlayerID === playerID) {
      player.status = status;
      if (status === "In Game") {
        room.state = "In Game";
      } else if (status === "Lobby" &&
          Object.values(room.players).every((roomPlayer) => roomPlayer.status === "Lobby")) {
        room.state = "Lobby";
      }
      io.to(roomID).emit('room_status_update', room);
    }
  });

  socket.on('leaveGameRoom', ({ roomID, playerID }, acknowledge) => {
    if (roomID === socket.data.minesRoomID && playerID === socket.data.minesPlayerID) {
      removeMinesPlayer(socket, roomID, playerID);
    }
    if (typeof acknowledge === 'function') acknowledge({ ok: true });
  });

  socket.on('matchingPairs:joinRoom', (payload = {}, acknowledge) => {
    const roomID = typeof payload.roomID === 'string' ? payload.roomID.trim() : '';
    const playerID = typeof payload.playerID === 'string' ? payload.playerID.trim() : '';
    const nickname = typeof payload.nickname === 'string' ? payload.nickname.trim() : '';
    const powerUp = normalizeMatchingPairsPowerUp(payload.powerUp);

    const fail = (message) => {
      const response = { ok: false, error: message };
      if (typeof acknowledge === 'function') acknowledge(response);
      else socket.emit('matchingPairs:error', response);
    };

    if (!roomID || roomID.length > 64 || !playerID || playerID.length > 128 ||
        !nickname || nickname.length > 32 || !powerUp) {
      fail('Enter a room name and nickname, and choose a valid power-up.');
      return;
    }

    const roomKey = matchingPairsRoomKey(roomID);
    let room = matchingPairsRooms.get(roomKey);
    const existingPlayer = room?.players[playerID];
    if (room?.state === 'In Game' && !existingPlayer) {
      fail('This room is already playing. Join again after the game is complete.');
      return;
    }

    const previousRoomKey = socket.data.matchingPairsRoomKey;
    const previousPlayerID = socket.data.matchingPairsPlayerID;
    const isRejoiningSamePlayer = previousRoomKey === roomKey && previousPlayerID === playerID;
    if (previousRoomKey && previousPlayerID && !isRejoiningSamePlayer) {
      removeMatchingPairsPlayer(socket, previousRoomKey, previousPlayerID);
      room = matchingPairsRooms.get(roomKey);
    }

    if (!room) {
      room = {
        roomID,
        socketRoom: `matching-pairs:${roomKey}`,
        rows: 5,
        cols: 4,
        state: 'Lobby',
        gameId: 0,
        players: {}
      };
      matchingPairsRooms.set(roomKey, room);
    }

    if (!room.players[playerID]) {
      room.players[playerID] = {
        nickname,
        powerUp,
        status: 'Lobby',
        score: 0,
        socketID: socket.id
      };
    } else {
      room.players[playerID].nickname = nickname;
      room.players[playerID].powerUp = powerUp;
      room.players[playerID].socketID = socket.id;
    }

    socket.join(room.socketRoom);
    socket.data.matchingPairsRoomKey = roomKey;
    socket.data.matchingPairsPlayerID = playerID;

    const snapshot = matchingPairsRoomSnapshot(room);
    if (typeof acknowledge === 'function') acknowledge({ ok: true, room: snapshot });
    io.to(room.socketRoom).emit('matchingPairs:roomUpdate', snapshot);
  });

  socket.on('matchingPairs:updateSettings', (payload = {}, acknowledge) => {
    const roomID = typeof payload.roomID === 'string' ? payload.roomID.trim() : '';
    const playerID = typeof payload.playerID === 'string' ? payload.playerID.trim() : '';
    const roomKey = roomID ? matchingPairsRoomKey(roomID) : '';
    const room = matchingPairsRooms.get(roomKey);
    const player = room?.players[playerID];
    const rows = Number(payload.rows);
    const cols = Number(payload.cols);
    const powerUp = normalizeMatchingPairsPowerUp(payload.powerUp);

    const fail = (message) => {
      const response = { ok: false, error: message };
      if (typeof acknowledge === 'function') acknowledge(response);
      else socket.emit('matchingPairs:error', response);
    };

    if (!room || !player || player.socketID !== socket.id ||
        socket.data.matchingPairsRoomKey !== roomKey ||
        socket.data.matchingPairsPlayerID !== playerID) {
      fail('You are not a member of this Matching Pairs room.');
      return;
    }
    if (room.state !== 'Lobby') {
      fail('Room settings can only be changed in the lobby.');
      return;
    }
    if (!isValidMatchingPairsGrid(rows, cols)) {
      fail('Choose rows and columns between 2 and 12 with an even total number of cards.');
      return;
    }
    if (!powerUp) {
      fail('Choose a valid power-up.');
      return;
    }

    room.rows = rows;
    room.cols = cols;
    player.powerUp = powerUp;

    if (typeof acknowledge === 'function') acknowledge({ ok: true, room: matchingPairsRoomSnapshot(room) });
    broadcastMatchingPairsRoom(room);
  });

  socket.on('matchingPairs:startGame', (payload = {}, acknowledge) => {
    const roomID = typeof payload.roomID === 'string' ? payload.roomID.trim() : '';
    const playerID = typeof payload.playerID === 'string' ? payload.playerID.trim() : '';
    const roomKey = roomID ? matchingPairsRoomKey(roomID) : '';
    const room = matchingPairsRooms.get(roomKey);
    const player = room?.players[playerID];

    const fail = (message) => {
      const response = { ok: false, error: message };
      if (typeof acknowledge === 'function') acknowledge(response);
      else socket.emit('matchingPairs:error', response);
    };

    if (!room || !player || player.socketID !== socket.id ||
        socket.data.matchingPairsRoomKey !== roomKey ||
        socket.data.matchingPairsPlayerID !== playerID) {
      fail('You are not a member of this Matching Pairs room.');
      return;
    }
    if (room.state !== 'Lobby') {
      fail('This room is already playing.');
      return;
    }
    if (!isValidMatchingPairsGrid(room.rows, room.cols)) {
      fail('Choose an even-sized grid before starting the game.');
      return;
    }

    room.state = 'In Game';
    room.gameId += 1;
    Object.values(room.players).forEach((roomPlayer) => {
      roomPlayer.status = 'In Game';
      roomPlayer.score = 0;
    });

    const snapshot = matchingPairsRoomSnapshot(room);
    if (typeof acknowledge === 'function') acknowledge({ ok: true, room: snapshot });
    io.to(room.socketRoom).emit('matchingPairs:gameStarted', snapshot);
    broadcastMatchingPairsRoom(room);
  });

  socket.on('matchingPairs:finishGame', (payload = {}, acknowledge) => {
    const roomID = typeof payload.roomID === 'string' ? payload.roomID.trim() : '';
    const playerID = typeof payload.playerID === 'string' ? payload.playerID.trim() : '';
    const roomKey = roomID ? matchingPairsRoomKey(roomID) : '';
    const room = matchingPairsRooms.get(roomKey);
    const player = room?.players[playerID];
    const score = Number(payload.score);
    const gameId = Number(payload.gameId);

    const fail = (message) => {
      const response = { ok: false, error: message };
      if (typeof acknowledge === 'function') acknowledge(response);
      else socket.emit('matchingPairs:error', response);
    };

    if (!room || !player || player.socketID !== socket.id ||
        socket.data.matchingPairsRoomKey !== roomKey ||
        socket.data.matchingPairsPlayerID !== playerID) {
      fail('You are not a member of this Matching Pairs room.');
      return;
    }
    if (room.state !== 'In Game' || player.status !== 'In Game' || gameId !== room.gameId) {
      fail('There is no active game for this player.');
      return;
    }
    if (!Number.isFinite(score) || score < 0 || score > 1_000_000_000) {
      fail('The final score must be a nonnegative finite number.');
      return;
    }

    player.score = score;
    player.status = 'Finished';
    if (typeof acknowledge === 'function') acknowledge({ ok: true, room: matchingPairsRoomSnapshot(room) });

    if (Object.values(room.players).every((roomPlayer) => roomPlayer.status === 'Finished')) {
      completeMatchingPairsGame(room);
    } else {
      broadcastMatchingPairsRoom(room);
    }
  });

  socket.on('matchingPairs:leaveRoom', (payload = {}, acknowledge) => {
    const playerID = typeof payload.playerID === 'string' ? payload.playerID.trim() : '';
    const roomKey = socket.data.matchingPairsRoomKey;
    if (roomKey && playerID === socket.data.matchingPairsPlayerID) {
      removeMatchingPairsPlayer(socket, roomKey, playerID);
    }
    if (typeof acknowledge === 'function') acknowledge({ ok: true });
  });

  socket.on('disconnect', () => {
    const minesRoomID = socket.data.minesRoomID;
    const minesPlayerID = socket.data.minesPlayerID;
    if (minesRoomID && minesPlayerID) {
      removeMinesPlayer(socket, minesRoomID, minesPlayerID);
    }

    const roomKey = socket.data.matchingPairsRoomKey;
    const playerID = socket.data.matchingPairsPlayerID;
    if (roomKey && playerID) {
      removeMatchingPairsPlayer(socket, roomKey, playerID);
    }
  });
});

// ROUTES
app.get('/api/events/:sortOrder', async (req, res) => {
  try {
    const sortOrder = req.params.sortOrder;
    const db = client.db(dbName);
    const events = await db.collection('Projects')
      .find()
      .sort({ sortDate: sortOrder })
      .toArray();

    res.json(events);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.put('/api/events/:id', async (req, res) => {
  const db = client.db(dbName);
  try {
    const eventId = req.params.id;
    const updatedSortDate = new Date(`${req.body.date}, ${req.body.year}`);

    const result = await db.collection('Projects').updateOne(
      { _id: new ObjectId(eventId) },
      {
        $set: {
          date: req.body.date,
          year: req.body.year,
          shortDesc: req.body.shortDesc,
          fullTitle: req.body.fullTitle,
          story: req.body.story,
          image: req.body.image,
          sortDate: updatedSortDate
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "No project found with that ID" });
    }

    res.json({ success: true, message: "Project updated successfully", result });
  } catch (err) {
    console.error("❌ Backend PUT Error:", err);
    res.status(500).json({ error: "Failed to update project", details: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const db = client.db(dbName);
    const actualDate = new Date(`${req.body.date}, ${req.body.year}`);
    const result = await db.collection('Projects')
      .insertOne({ ...req.body, sortDate: actualDate, createdAt: new Date() });

    res.json(result);
  } catch (err) {
    console.error("Error saving event:", err);
    res.status(500).json({ error: "Failed to save event" });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  const db = client.db(dbName);
  try {
    const eventId = req.params.id;

    const result = await db.collection('Projects').deleteOne({
      _id: new ObjectId(eventId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "No project found with that ID" });
    }

    res.json({ success: true, message: "Project deleted successfully!" });
  } catch (err) {
    console.error("❌ Backend DELETE Error:", err);
    res.status(500).json({ error: "Failed to delete project", details: err.message });
  }
});

// SERVER START & PORT LOGIC
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is live on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
}

start();