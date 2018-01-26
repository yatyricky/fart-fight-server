const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, '/../client/stylesheets')));
app.use(express.static(path.join(__dirname, '/../node_modules/bootstrap/dist/css')));
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, '/../client/index.html'));
});

const server = app.listen(3000, () => console.log('=== Running on 3000 ==='));
const io = require('socket.io').listen(server);

const {PlayerAction} = require('./consts');
const config = require('./config');
const Player = require('./Player');
const Room = require('./Room');

const allClients = {};
const allRooms = {};

io.on('connection', function(socket) {
    console.log('[I]New client connected: ' + socket.id);

    socket.on('login', data => {
        console.log(`[I]login: ${JSON.stringify(data)}`);

        // player setups
        const player = new Player(data.name, socket.id);
        allClients[player.getName()] = player;
        socket.emit('correct name', player.getName());
        console.log(`[I]>>player: ${data.name} should change name, new name: ${player.getName()}`);

        // room setups
        let room = null;
        if (data.roomId == "") {
            room = new Room(io);
            allRooms[room.getId()] = room;
        } else {
            if (allRooms.hasOwnProperty(data.roomId)) {
                room = allRooms[data.roomId];
            }
        }

        if (room != null) {
            if (room.canPlayerJoin()) {
                socket.join(room.getId());
                room.playerJoin(player);
                io.to(room.getId()).emit('update players', room.getPlayersData());
                console.log(`[I]>>>>update players`);
                socket.emit('login result', {
                    res: 'success',
                    roomId: room.getId()
                });
                console.log(`[I]>>Login successful, player ${player.getData().name} joined room ${room.getId()}`);
            } else {
                socket.emit('login result', {
                    res: 'fail',
                    reason: 'room is full'
                });
                console.log(`[I]>>Login failed, room is full`);
            }
        } else {
            socket.emit('login result', {
                res: 'fail',
                reason: 'no such room'
            });
            console.log(`[I]>>Login failed, no such room ${data.roomId} or new Room failed`);
        }
    });

    socket.on('ready', data => {
        console.log(`[I]player ${data} request ready`);
        if (allClients.hasOwnProperty(data)) {
            const player = allClients[data];
            player.getRoom().playerReady(player);
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data}`);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`[I]Client disconnected: ${socket.id}, reason: ${JSON.stringify(reason)}`);
        const keys = Object.keys(allClients);
        let removed = 0;
        let removedPlayer = null;
        let room = null;
        for (let i = 0; i < keys.length; i++) {
            const element = allClients[keys[i]];
            if (element.getSocketId() == socket.id) {
                room = element.getRoom();
                if (room != null) {
                    room.playerLeave(element);
                    if (room.numPlayers() == 0) {
                        delete allRooms[room.getId()];
                    }
                }
                removed += 1;
                removedPlayer = element;
                delete allClients[keys[i]];
            }
        }
        if (removed != 1) {
            console.error(`[W]socket disconnected but no players removed, removed = ${removed}`);
        } else {
            console.log(`player ${removedPlayer.getData().name} logged off successfully`);
        }
        if (room != null) {
            io.to(room.getId()).emit('update players', room.getPlayersData());
            if (Object.keys(allClients).length < 2) {
                room.stopGame();
            }
        }
    })

    socket.on('charge', data => {
        console.log(`[O]charge: ${data}`);
        if (allClients.hasOwnProperty(data)) {
            const player = allClients[data];
            player.setAct(PlayerAction.CHARGE);
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data}`);
        }
    })

    socket.on('shock', data => {
        console.log(`[O]shock: ${data}`);
        if (allClients.hasOwnProperty(data)) {
            const player = allClients[data];
            if (player.getData().power >= config.SHOCK_COST) {
                player.setAct(PlayerAction.SHOCK);
            } else {
                player.setAct(PlayerAction.BLOCK);
            }
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data}`);
        }
    })

    socket.on('block', data => {
        console.log(`[O]block: ${data}`);
        if (allClients.hasOwnProperty(data)) {
            const player = allClients[data];
            player.setAct(PlayerAction.BLOCK);
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data}`);
        }
    })

    socket.on('nuke', data => {
        console.log(`[O]nuke: ${data}`);
        if (allClients.hasOwnProperty(data)) {
            const player = allClients[data];
            if (player.getData().power >= config.NUKE_COST) {
                player.setAct(PlayerAction.NUKE);
            } else {
                player.setAct(PlayerAction.BLOCK);
            }
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data}`);
        }
    })
});