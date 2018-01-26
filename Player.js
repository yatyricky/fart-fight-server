const {PlayerState, PlayerAction, PlayerFace} = require('./consts');

const nameKeeper = {};

class Player {

    constructor(name, socketId) {
        if (nameKeeper.hasOwnProperty(name)) {
            nameKeeper[name] += 1;
            name = name + nameKeeper[name];
        } else {
            nameKeeper[name] = 0;
        }
        this.name = name;
        this.power = 1;
        this.act = PlayerAction.NONE;
        this.score = 0;
        this.state = PlayerState.WAIT;
        this.socketId = socketId;
        this.room = null;
    }

    getFace() {
        if (this.state == PlayerState.DIED) {
            return PlayerFace.DIED;
        }
        if (this.power > 3) {
            return PlayerFace.EVIL;
        }
        return PlayerFace.SMILE;
    }

    setRoom(room) {
        this.room = room;
    }

    getRoom() {
        return this.room;
    }

    getSocketId() {
        return this.socketId;
    }

    getName() {
        return this.name;
    }

    setState(state) {
        this.state = state;
    }

    setAct(act) {
        this.act = act;
    }

    modPower(val) {
        this.power += val;
    }

    modScore(val) {
        this.score += val;
    }

    getData() {
        return {
            name: this.name,
            power: this.power,
            act: this.act,
            face: this.getFace(),
            score: this.score,
            state: this.state
        };
    }

}

module.exports = Player;