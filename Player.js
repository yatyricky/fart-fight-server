const {PlayerState, PlayerAction, PlayerFace, LoginMethod} = require('./consts');

const allPlayers = {};
const loginMethodKeys = Object.keys(LoginMethod);
for (let i = 0; i < loginMethodKeys.length; i++) {
    allPlayers[LoginMethod[loginMethodKeys[i]]] = {};
}

class Player {

    constructor(method, pid, name, avatar) {
        this.name = name;
        this.power = 1;
        this.act = PlayerAction.NONE;
        this.score = 0;
        this.state = PlayerState.WAIT;
        this.room = null;

        this.loginMethod = method;
        this.pid = pid;
        this.avatar = avatar;
        allPlayers[method][pid] = this;
    }

    static findPlayer(method, pid) {
        if (allPlayers.hasOwnProperty(method)) {
            if (allPlayers[method].hasOwnProperty(pid)) {
                return allPlayers[method][pid];
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    static removePlayer(player) {
        const playerGroup = allPlayers[player.loginMethod];
        delete playerGroup[player.pid];
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
            loginMethod: this.loginMethod,
            pid: this.pid,
            name: this.name,
            avatar: this.avatar,
            power: this.power,
            act: this.act,
            face: this.getFace(),
            score: this.score,
            state: this.state
        };
    }

}

module.exports = Player;