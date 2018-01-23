import express from 'express';
import path from 'path';

import webpack from 'webpack';
import webpackMiddleware from 'webpack-dev-middleware';
import webpackConfig from '../webpack.config.dev';

const app = express();

app.use(express.static(path.join(__dirname, '/../client/public')));
app.use(webpackMiddleware(webpack(webpackConfig)));

app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(3000, () => console.log('=== Running on 3000 ==='));
const io = require('socket.io').listen(server);

const allClients = {};
const nameKeeper = {};

const playerList = () => {
    const keys = Object.keys(allClients);
    const ret = [];
    for (let i = 0; i < keys.length; i++) {
        const element = allClients[keys[i]];
        ret.push({
            name: keys[i],
            power: element.power,
            act: element.act,
            face: element.face,
            score: element.score,
            status: element.status
        })
    }
    return ret;
}

class Looper {
    constructor() {
        this.intvObj = null
    }

    start(callback) {
        this.stop()
        this.intvObj = setInterval(callback, 5000)
    }

    stop() {
        clearInterval(this.intvObj)
        const keys = Object.keys(allClients)
        for (let i = 0; i < keys.length; i++) {
            const element = allClients[keys[i]]
            element.status = 'wait'
        }
    }
}

let loop = new Looper()
let gameRunning = false

io.on('connection', function(socket) {
    console.log('New client connected: ' + socket.id);
    // socket.emit(Events.CONNECTION_ESTABLISHED);

    socket.on('login', (data) => {
        console.log('login:' + JSON.stringify(data));
        
        // validate name
        let pname = data.name;
        if (nameKeeper.hasOwnProperty(pname)) {
            nameKeeper[pname] += 1;
            pname = pname + nameKeeper[pname];
        } else {
            nameKeeper[pname] = 0;
        }
        allClients[pname] = {
            socketId: socket.id,
            power: 0,
            act: '',
            face: 'alive', // alive, evil, died
            score: 0,
            status: 'wait' // wait, ready, game
        }

        io.emit('login', playerList());
        socket.emit('correct name', pname)
    })

    socket.on('ready', (data) => {
        allClients[data.name].status = 'ready'

        const keys = Object.keys(allClients)
        let allGood = true
        for (let i = 0; i < keys.length && allGood == true; i++) {
            const element = allClients[keys[i]]
            if (element.status != 'ready') {
                allGood = false
            }
        }

        if (allGood == true && keys.length > 1) {
            for (let i = 0; i < keys.length; i++) {
                const element = allClients[keys[i]]
                element.face = 'alive'
                element.act = ''
            }
        }
        io.emit('login', playerList())

        if (allGood == true && keys.length > 1 && gameRunning == false) {
            gameRunning = true
            console.log('about to start');
            
            loop.start(() => {
                console.log('5s passed');
                // result
                const nukes = [];
                const shocks = [];
                const lkeys = Object.keys(allClients)
                for (let i = 0; i < lkeys.length; i++) {
                    const element = allClients[lkeys[i]];
                    if (element.act == 'shock') {
                        element.power -= 1
                        shocks.push(lkeys[i]);
                    } else if (element.act == 'nuke') {
                        element.power -= 5
                        nukes.push(lkeys[i]);
                    } else if (element.act == 'charge') {
                        element.power += 1
                    } else {
                        element.act = 'block'
                    }
                    if (element.power > 3) {
                        element.face = 'evil'
                    }
                }
                if (nukes.length > 0) {
                    for (let i = 0; i < lkeys.length; i++) {
                        const element = allClients[lkeys[i]];
                        if (element.act != 'nuke') {
                            element.face = 'died'
                        }
                    }
                } else if (shocks.length > 0) {
                    for (let i = 0; i < lkeys.length; i++) {
                        const element = allClients[lkeys[i]];
                        if (element.act == 'charge') {
                            element.face = 'died'
                        }
                    }
                }

                io.emit('login', playerList())

                const deads = [];
                let winner = null;
                for (let i = 0; i < lkeys.length; i++) {
                    const element = allClients[lkeys[i]];
                    if (element.face == 'died' || element.status != 'game') {
                        deads.push(lkeys[i])
                    } else {
                        winner = lkeys[i]
                    }
                }
                if (lkeys.length - deads.length == 1) {
                    loop.stop()
                    gameRunning = false
                    allClients[winner].score += 1

                    for (let i = 0; i < lkeys.length; i++) {
                        const element = allClients[lkeys[i]];
                        element.power = 0
                        element.status = 'wait'
                    }
                    io.emit('login', playerList())
                } else {
                    io.emit('game start', {loop: true});
                    console.log('[E] game start');
    
                    for (let i = 0; i < lkeys.length; i++) {
                        const element = allClients[lkeys[i]];
                        element.act = 'block'
                    }
                }
            });
            let tkeys = Object.keys(allClients)
            for (let i = 0; i < tkeys.length; i++) {
                const element = allClients[tkeys[i]]
                element.status = 'game'
            }
            io.emit('login', playerList())
            io.emit('game start', {loop: false});
            console.log('[E] game start');
        }
    })

    socket.on('disconnect', (reason) => {
        console.log(`[I][O]Client disconnected: ${socket.id}, reason: ${JSON.stringify(reason)}`);
        const keys = Object.keys(allClients);
        let removed = 0;
        let removeName = "";
        for (let i = 0; i < keys.length; i++) {
            const element = allClients[keys[i]];
            if (element.socketId == socket.id) {
                delete allClients[keys[i]];
                removed += 1;
                removeName = keys[i];
            }
        }
        if (removed != 1) {
            console.error('Removing client error');
        } else {
            console.log(`player ${removeName} logged off successfully`);
        }
        io.emit('login', playerList())
        if (Object.keys(allClients).length < 2) {
            gameRunning = false
            loop.stop()
        }
    })

    socket.on('charge', (data) => {
        const player = allClients[data.name]
        player.act = 'charge'
    })

    socket.on('shock', (data) => {
        const player = allClients[data.name]
        player.act = 'shock'
    })

    socket.on('block', (data) => {
        const player = allClients[data.name]
        player.act = 'block'
    })

    socket.on('nuke', (data) => {
        const player = allClients[data.name]
        player.act = 'nuke'
    })
});