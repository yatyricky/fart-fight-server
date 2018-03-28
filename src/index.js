const config = require('./config');
const fs = require('fs');
const https = require('https')
const { PlayerAction, IOTypes } = require('./consts');
const Player = require('./Player');
const Logger = require('./Logger');
const Room = require('./Room');

const server = https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/g.nefti.me/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/g.nefti.me/fullchain.pem')
}).listen(config.PORT, () => {
    Logger.i(`--- server running on ${config.PORT} ---`);
});

const io = require('socket.io')(server, {
    transports: ['websocket']
});

io.on('connection', socket => {
    Logger.i(`[I]<<New client connected: ${socket.id}`);
    socket.loginMethod = "";
    socket.pid = "";

    socket.emit(IOTypes.E_LINK_ESTABLISHED);
    Logger.i(`[I]>>Link established`);

    socket.on('logi', data => {
        console.log(`[CLOGI]${JSON.stringify(data.data)}`);
    });

    socket.on('loge', data => {
        console.log(`[CLOGE]${JSON.stringify(data.data)}`);
    });

    socket.on(IOTypes.R_LOGIN, data => {
        Logger.i(`[I]<<login: ${JSON.stringify(data)}`);

        socket.loginMethod = data.method;
        socket.pid = data.pid;
        // player setups
        const player = Player.create(data.method, data.pid, data.name, data.avatar);
        if (player != null) {
            // room setups
            const room = Room.create(io, data.roomId);
            if (room.canPlayerJoin()) {
                socket.join(room.getId());
                room.playerJoin(player);
                io.to(room.getId()).emit(IOTypes.E_UPDATE_PLAYERS, { data: room.getPlayersData() });
                Logger.i(`[I]>>>>update players`);
                socket.emit(IOTypes.E_LOGIN_RESULT, {
                    res: 'success',
                    roomId: room.getId()
                });
                Logger.i(`[I]>>Login successful, player ${player.getData().name} joined room ${room.getId()}`);
            } else {
                socket.emit(IOTypes.E_LOGIN_RESULT, {
                    res: 'fail',
                    reason: 'room is full'
                });
                Logger.i(`[I]>>Login failed, room is full`);
            }
        } else {
            socket.emit(IOTypes.E_LOGIN_RESULT, {
                res: 'fail',
                reason: 'bad player'
            });
            Logger.i(`[I]>>Login failed, create player failed`);
        }
    });

    socket.on(IOTypes.R_READY, data => {
        Logger.i(`[I]<<ready: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            player.getRoom().playerReady(player);
        } else {
            Logger.e(`[W]ready player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    const playerLeaveRoom = (sok, player) => {
        const name = player.getName();
        const room = player.getRoom();
        if (room != null) {
            sok.leave(room.getId());
            room.playerLeave(player);
            if (room.numPlayers() == 0) {
                Room.destroy(room);
            } else {
                io.to(room.getId()).emit(IOTypes.E_UPDATE_PLAYERS, { data: room.getPlayersData() });
                if (room.numPlayers() == 1) {
                    room.stopGame(null);
                }
            }
            Logger.i(`[I]player ${name} left room successfully`);
        } else {
            Logger.e(`[W]player ${name} trying to leave but no room joined`);
        }
        Player.removePlayer(player);
    };

    socket.on('disconnect', reason => {
        Logger.i(`[I]<<Client disconnected: ${socket.id}, reason: ${JSON.stringify(reason)}`);
        const player = Player.findPlayer(socket.loginMethod, socket.pid);
        if (player == null) {
            Logger.e(`[W]socket disconnected but no players removed, player null`);
        } else {
            playerLeaveRoom(socket, player);
            Logger.i(`[I]player ${player.getName()} logged off successfully`);
        }
    });

    socket.on(IOTypes.R_LEAVE, data => {
        Logger.i(`[I]<<leave: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            playerLeaveRoom(socket, player);
        } else {
            Logger.e(`[W]leave player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    socket.on(IOTypes.R_CLOSE_RES, data => {
        Logger.i(`[I]<<leave: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            const room = player.getRoom();
            if (room != null) {
                room.playerCloseResult(player);
            } else {
                Logger.e(`[W]close res player has no room, player data = ${JSON.stringify(data)}`);
            }
        } else {
            Logger.e(`[W]close res player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    socket.on(IOTypes.R_CHARGE, data => {
        Logger.i(`[I]charge: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            player.setAct(PlayerAction.CHARGE);
        } else {
            Logger.e(`[E]ready player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    socket.on(IOTypes.R_SHOCK, data => {
        Logger.i(`[I]shock: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            if (player.getData().power >= config.SHOCK_COST) {
                player.setAct(PlayerAction.SHOCK);
            } else {
                player.setAct(PlayerAction.BLOCK);
            }
        } else {
            Logger.e(`[E]ready player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    socket.on(IOTypes.R_BLOCK, data => {
        Logger.i(`[I]block: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            player.setAct(PlayerAction.BLOCK);
        } else {
            Logger.e(`[E]ready player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    socket.on(IOTypes.R_NUKE, data => {
        Logger.i(`[I]nuke: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            if (player.getData().power >= config.NUKE_COST) {
                player.setAct(PlayerAction.NUKE);
            } else {
                player.setAct(PlayerAction.BLOCK);
            }
        } else {
            Logger.e(`[E]ready player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });
});
