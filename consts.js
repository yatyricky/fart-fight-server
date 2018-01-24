const PlayerState = {
    WAIT: 100,
    READY: 200,
    GAME: 300,
    DIED: 400
};

const PlayerAction = {
    NONE: 10,
    CHARGE: 100,
    SHOCK: 200,
    BLOCK: 300,
    NUKE: 400
};

const PlayerFace = {
    SMILE: 100,
    EVIL: 200,
    DIED: 300
};

module.exports = {
    PlayerState,
    PlayerAction,
    PlayerFace
};