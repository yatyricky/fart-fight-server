const config = require('./config');
const {PlayerAction, IOTypes} = require('./consts');
const Player = require('./Player');
const Room = require('./Room');

const io = require('socket.io')(config.PORT, {
    transports: ['websocket']
});
console.log(`--- server running on ${config.PORT} ---`);

const allClients = {};
const allRooms = {};

io.on('connection', socket => {
    console.log(`[I]New client connected: ${socket.id}`);

    socket.emit(IOTypes.E_LINK_ESTABLISHED);
    console.log(`[I]>>${IOTypes.E_LINK_ESTABLISHED}`);

    socket.on(IOTypes.R_LOGIN, data => {
        console.log(`[I]login: ${JSON.stringify(data)}`);

        // player setups
        const player = new Player(data.name, socket.id);
        allClients[player.getName()] = player;
        socket.emit(IOTypes.E_CORRECT_NAME, {
            data: player.getName()
        });
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
        console.log(`[I]player ${data.name} request ready`);
        if (allClients.hasOwnProperty(data.name)) {
            const player = allClients[data.name];
            player.getRoom().playerReady(player);
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data.name}`);
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
                io.to(room.getId()).emit(IOTypes.E_UPDATE_PLAYERS, {data: room.getPlayersData()});
                if (room.numPlayers() == 1) {
                    room.stopGame(null);
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

    socket.on(IOTypes.R_LEAVE, data => {
        console.log(`[I]player request leave: ${data.name}`);
        if (allClients.hasOwnProperty(data.name)) {
            playerLeaveRoom(allClients[data.name]);
        } else {
            console.error(`[W]leave player doesnt exist, player name = ${data.name}`);
        }
    });

    socket.on(IOTypes.R_CLOSE_RES, data => {
        console.log(`[I]player closed result panel: ${data.name}`);
        if (allClients.hasOwnProperty(data.name)) {
            const room = allClients[data.name].getRoom();
            if (room != null) {
                room.playerCloseResult(allClients[data.name]);
            } else {
                console.error(`[W]close res player has no room, player name = ${data.name}`);
            }
        } else {
            console.error(`[W]close res player doesnt exist, player name = ${data.name}`);
        }
    });

    socket.on(IOTypes.R_CHARGE, data => {
        console.log(`[I]charge: ${data.name}`);
        if (allClients.hasOwnProperty(data.name)) {
            const player = allClients[data.name];
            player.setAct(PlayerAction.CHARGE);
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data.name}`);
        }
    });

    socket.on(IOTypes.R_SHOCK, data => {
        console.log(`[I]shock: ${data.name}`);
        if (allClients.hasOwnProperty(data.name)) {
            const player = allClients[data.name];
            if (player.getData().power >= config.SHOCK_COST) {
                player.setAct(PlayerAction.SHOCK);
            } else {
                player.setAct(PlayerAction.BLOCK);
            }
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data.name}`);
        }
    });

    socket.on(IOTypes.R_BLOCK, data => {
        console.log(`[I]block: ${data.name}`);
        if (allClients.hasOwnProperty(data.name)) {
            const player = allClients[data.name];
            player.setAct(PlayerAction.BLOCK);
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data.name}`);
        }
    });

    socket.on(IOTypes.R_NUKE, data => {
        console.log(`[I]nuke: ${data.name}`);
        if (allClients.hasOwnProperty(data.name)) {
            const player = allClients[data.name];
            if (player.getData().power >= config.NUKE_COST) {
                player.setAct(PlayerAction.NUKE);
            } else {
                player.setAct(PlayerAction.BLOCK);
            }
        } else {
            console.error(`[E]ready player doesnt exist, player name = ${data.name}`);
        }
    });
});