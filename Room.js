const config = require('./config');
const {PlayerState, PlayerAction, PlayerFace, IOTypes} = require('./consts');

let guid = 100;

class Room {

    constructor(io) {
        this.guid = guid++;
        this.io = io;
        this.players = [];
        this.running = false;
        this.intvObj = null;
    }

    getId() {
        return this.guid;
    }

    numPlayers() {
        return this.players.length;
    }

    playerJoin(player) {
        this.players.push(player);
        player.setRoom(this);
    }

    playerLeave(player) {
        const index = this.players.indexOf(player);
        if (index != -1) {
            this.players.splice(index, 1);
        } else {
            console.error(`[E]Removing invalid player: ${JSON.stringify(player.getData())}`);
        }
    }

    playerReady(player) {
        player.setState(PlayerState.READY);

        const resps = [];
        let allGood = true;
        for (let i = 0; i < this.players.length && allGood == true; i++) {
            const element = this.players[i];
            if (element.getData().state != PlayerState.READY) {
                allGood = false;
            }
        }

        if (allGood == true && this.players.length > 1 && this.running == false) {
            for (let i = 0; i < this.players.length; i++) {
                const element = this.players[i];
                element.setState(PlayerState.GAME);
                element.setAct(PlayerAction.NONE);
            }
            this.startGame();
        }
        this.io.to(this.guid).emit(IOTypes.E_UPDATE_PLAYERS, {data: this.getPlayersData()});
    }

    startGame() {
        clearInterval(this.intvObj);
        this.running = true;
        this.intvObj = setInterval(() => {
            console.log(`[I]times up, start to check stuff`);
            const nukes = [];
            const shocks = [];
            for (let i = 0; i < this.players.length; i++) {
                const element = this.players[i];
                if (element.getData().act == PlayerAction.SHOCK) {
                    element.modPower(-1);
                    shocks.push(element);
                } else if (element.getData().act == PlayerAction.NUKE) {
                    element.modPower(-5);
                    nukes.push(element);
                } else if (element.getData().act == PlayerAction.CHARGE) {
                    element.modPower(1);
                } else {
                    element.setAct(PlayerAction.BLOCK);
                }
            }
            if (nukes.length > 0) {
                for (let i = 0; i < this.players.length; i++) {
                    const element = this.players[i];
                    if (element.getData().act != PlayerAction.NUKE) {
                        element.setState(PlayerState.DIED);
                    }
                }
            } else if (shocks.length > 0) {
                for (let i = 0; i < this.players.length; i++) {
                    const element = this.players[i];
                    if (element.getData().act == PlayerAction.CHARGE) {
                        element.setState(PlayerState.DIED);
                    }
                }
            }

            const deads = [];
            const winners = [];
            for (let i = 0; i < this.players.length; i++) {
                const element = this.players[i];
                if (element.getData().state != PlayerState.GAME) {
                    deads.push(element);
                    element.modPower(0 - element.getData().power);
                } else {
                    winners.push(element);
                }
            }
            if (winners.length == 1) {
                this.stopGame(winners[0]);
            } else {
                this.io.to(this.guid).emit(IOTypes.E_RUN_TIMER);
                console.log(`[I]>>>>run timer`);
            }
            this.io.to(this.guid).emit(IOTypes.E_UPDATE_PLAYERS, {data: this.getPlayersData()});
            if (winners.length != 1) {
                for (let i = 0; i < this.players.length; i++) {
                    const element = this.players[i];
                    element.setAct(PlayerAction.BLOCK);
                }
            }
        }, config.INTERVAL);
        this.io.to(this.guid).emit(IOTypes.E_RUN_TIMER);
    }

    stopGame(winner) {
        this.running = false;
        clearInterval(this.intvObj);

        if (winner == null) {
            if (this.players.length > 0) {
                winner = this.players[0];
            }
        }
        if (winner != null) {
            winner.modScore(1);
        }
        for (let i = 0; i < this.players.length; i++) {
            const element = this.players[i];
            element.modPower(1 - element.getData().power);
        }
        this.io.to(this.guid).emit(IOTypes.E_GAME_END, {data: this.getPlayersScore()});
        console.log(`[I]>>>>game end`);
    }

    playerCloseResult(player) {
        player.setState(PlayerState.WAIT);
        this.io.to(this.guid).emit(IOTypes.E_UPDATE_PLAYERS, {data: this.getPlayersData()});
    }

    canPlayerJoin() {
        return this.players.length < config.MAX_PLAYER;
    }

    getPlayersData() {
        const ret = [];
        for (let i = 0; i < this.players.length; i++) {
            const element = this.players[i];
            ret.push(element.getData());
        }
        return ret;
    }

    getPlayersScore() {
        const ret = [];
        for (let i = 0; i < this.players.length; i++) {
            const data = this.players[i].getData();
            ret.push({
                name: data.name,
                score: data.score
            });
        }
        return ret;
    }

}

module.exports = Room;