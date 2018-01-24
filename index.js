const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, '/../client/stylesheets')));
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
const room = new Room(io); // for test purpose

io.on('connection', function(socket) {
    console.log('[I]New client connected: ' + socket.id);

    socket.on('login', (data) => {
        console.log(`[I]login: ${JSON.stringify(data)}`);
        const player = new Player(data.name, socket.id);
        allClients[player.getName()] = player;
        if (room.canPlayerJoin()) {
            socket.join(room.getId());
            room.playerJoin(player);
            io.to(room.getId()).emit('update players', room.getPlayersData());
            socket.emit('login result', 'success');
        } else {
            socket.emit('login result', 'room is full');
        }
        if (player.getName() != data.name) {
            console.log(`[I]player should change name, new name: ${player.getName()}`);
            socket.emit('correct name', player.getName());
        }
    });

    socket.on('ready', data => {
        if (allClients.hasOwnProperty(data)) {
            const player = allClients[data];
            room.playerReady(player);
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data}`);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`[I]Client disconnected: ${socket.id}, reason: ${JSON.stringify(reason)}`);
        const keys = Object.keys(allClients);
        let removed = 0;
        let removeName = "";
        for (let i = 0; i < keys.length; i++) {
            const element = allClients[keys[i]];
            if (element.getSocketId() == socket.id) {
                room.playerLeave(element);
                removed += 1;
                removeName = keys[i];
                delete allClients[keys[i]];
            }
        }
        if (removed != 1) {
            console.error('Removing client error');
        } else {
            console.log(`player ${removeName} logged off successfully`);
        }
        io.to(room.getId()).emit('update players', room.getPlayersData());
        if (Object.keys(allClients).length < 2) {
            room.stopGame();
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