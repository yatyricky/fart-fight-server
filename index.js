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

io.on('connection', socket => {
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

    const playerLeaveRoom = player => {
        const name = player.getName();
        const room = player.getRoom();
        if (room != null) {
            room.playerLeave(player);
            if (room.numPlayers() == 0) {
                delete allRooms[room.getId()];
            } else {
                io.to(room.getId()).emit('update players', room.getPlayersData());
                if (room.numPlayers() == 1) {
                    room.stopGame();
                }
            }
            console.log(`[I]player ${name} left room successfully`);
        } else {
            console.error(`[W]player ${name} trying to leave but no room joined`);
        }
        delete allClients[name];
    };

    socket.on('disconnect', (reason) => {
        console.log(`[I]Client disconnected: ${socket.id}, reason: ${JSON.stringify(reason)}`);
        const keys = Object.keys(allClients);
        let removed = 0;
        let removedPlayer = null;
        let room = null;
        for (let i = 0; i < keys.length; i++) {
            const element = allClients[keys[i]];
            if (element.getSocketId() == socket.id) {
                playerLeaveRoom(element);
                removed ++;
                removedPlayer = element;
            }
        }
        if (removed != 1) {
            console.error(`[W]socket disconnected but no players removed, removed = ${removed}`);
        } else {
            console.log(`[I]player ${removedPlayer.getName()} logged off successfully`);
        }
    });

    socket.on('leave', data => {
        console.log(`[I]player request leave: ${data}`);
        if (allClients.hasOwnProperty(data)) {
            playerLeaveRoom(allClients[data]);
        } else {
            console.error(`[W]leave player doesnt exist, player name = ${data}`);
        }
    });

    socket.on('close result', data => {
        console.log(`[I]player closed result panel: ${data}`);
        if (allClients.hasOwnProperty(data)) {
            const room = allClients[data].getRoom();
            if (room != null) {
                room.playerCloseResult(allClients[data]);
            } else {
                console.error(`[W]close res player has no room, player name = ${data}`);
            }
        } else {
            console.error(`[W]close res player doesnt exist, player name = ${data}`);
        }
    });

    socket.on('charge', data => {
        console.log(`[I]charge: ${data}`);
        if (allClients.hasOwnProperty(data)) {
            const player = allClients[data];
            player.setAct(PlayerAction.CHARGE);
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data}`);
        }
    });

    socket.on('shock', data => {
        console.log(`[I]shock: ${data}`);
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
    });

    socket.on('block', data => {
        console.log(`[I]block: ${data}`);
        if (allClients.hasOwnProperty(data)) {
            const player = allClients[data];
            player.setAct(PlayerAction.BLOCK);
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data}`);
        }
    });

    socket.on('nuke', data => {
        console.log(`[I]nuke: ${data}`);
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
    });
});