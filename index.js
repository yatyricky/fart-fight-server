const config = require('./config');
const {PlayerAction, IOTypes} = require('./consts');
const Player = require('./Player');
const Room = require('./Room');

const io = require('socket.io')(config.PORT, {
    transports: ['websocket']
});
console.log(`--- server running on ${config.PORT} ---`);

const allRooms = {};

io.on('connection', socket => {
    console.log(`[I]<<New client connected: ${socket.id}`);
    socket.loginMethod = "";
    socket.pid = "";

    socket.emit(IOTypes.E_LINK_ESTABLISHED);
    console.log(`[I]>>Link established`);

    socket.on(IOTypes.R_LOGIN, data => {
        console.log(`[I]<<login: ${JSON.stringify(data)}`);
        socket.loginMethod = data.method;
        socket.pid = data.pid;
        // player setups
        const player = new Player(data.method, data.pid, data.name);

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
                io.to(room.getId()).emit(IOTypes.E_UPDATE_PLAYERS, {data: room.getPlayersData()});
                console.log(`[I]>>>>update players`);
                socket.emit(IOTypes.E_LOGIN_RESULT, {
                    res: 'success',
                    roomId: room.getId()
                });
                console.log(`[I]>>Login successful, player ${player.getData().name} joined room ${room.getId()}`);
            } else {
                socket.emit(IOTypes.E_LOGIN_RESULT, {
                    res: 'fail',
                    reason: 'room is full'
                });
                console.log(`[I]>>Login failed, room is full`);
            }
        } else {
            socket.emit(IOTypes.E_LOGIN_RESULT, {
                res: 'fail',
                reason: 'no such room'
            });
            console.log(`[I]>>Login failed, no such room ${data.roomId} or new Room failed`);
        }
    });

    socket.on(IOTypes.R_READY, data => {
        console.log(`[I]<<ready: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            player.getRoom().playerReady(player);
        } else {
            console.error(`[W]ready player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    const playerLeaveRoom = (sok, player) => {
        const name = player.getName();
        const room = player.getRoom();
        if (room != null) {
            sok.leave(room.getId());
            room.playerLeave(player);
            if (room.numPlayers() == 0) {
                delete allRooms[room.getId()];
            } else {
                io.to(room.getId()).emit(IOTypes.E_UPDATE_PLAYERS, {data: room.getPlayersData()});
                if (room.numPlayers() == 1) {
                    room.stopGame(null);
                }
            }
            console.log(`[I]player ${name} left room successfully`);
        } else {
            console.error(`[W]player ${name} trying to leave but no room joined`);
        }
        Player.removePlayer(player);
    };

    socket.on('disconnect', reason => {
        console.log(`[I]<<Client disconnected: ${socket.id}, reason: ${JSON.stringify(reason)}`);
        const player = Player.findPlayer(socket.loginMethod, socket.pid);
        if (player == null) {
            console.error(`[W]socket disconnected but no players removed, player null`);
        } else {
            playerLeaveRoom(socket, player);
            console.log(`[I]player ${player.getName()} logged off successfully`);
        }
    });

    socket.on(IOTypes.R_LEAVE, data => {
        console.log(`[I]<<leave: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            playerLeaveRoom(socket, player);
        } else {
            console.error(`[W]leave player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    socket.on(IOTypes.R_CLOSE_RES, data => {
        console.log(`[I]<<leave: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            const room = player.getRoom();
            if (room != null) {
                room.playerCloseResult(player);
            } else {
                console.error(`[W]close res player has no room, player data = ${JSON.stringify(data)}`);
            }
        } else {
            console.error(`[W]close res player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    socket.on(IOTypes.R_CHARGE, data => {
        console.log(`[I]charge: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            player.setAct(PlayerAction.CHARGE);
        } else {
            console.error(`[E]ready player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    socket.on(IOTypes.R_SHOCK, data => {
        console.log(`[I]shock: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            if (player.getData().power >= config.SHOCK_COST) {
                player.setAct(PlayerAction.SHOCK);
            } else {
                player.setAct(PlayerAction.BLOCK);
            }
        } else {
            console.error(`[E]ready player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    socket.on(IOTypes.R_BLOCK, data => {
        console.log(`[I]block: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            player.setAct(PlayerAction.BLOCK);
        } else {
            console.error(`[E]ready player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });

    socket.on(IOTypes.R_NUKE, data => {
        console.log(`[I]nuke: ${JSON.stringify(data)}`);
        const player = Player.findPlayer(data.method, data.pid);
        if (player != null) {
            if (player.getData().power >= config.NUKE_COST) {
                player.setAct(PlayerAction.NUKE);
            } else {
                player.setAct(PlayerAction.BLOCK);
            }
        } else {
            console.error(`[E]ready player doesnt exist, player data = ${JSON.stringify(data)}`);
        }
    });
});