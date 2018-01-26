const PlayerState = {
    WAIT: 'wait',
    READY: 'ready',
    GAME: 'game',
    DIED: 'died'
};

const PlayerAction = {
    NONE: 'none',
    CHARGE: 'charge',
    SHOCK: 'shock',
    BLOCK: 'block',
    NUKE: 'nuke'
};

const PlayerFace = {
    SMILE: 'smile',
    EVIL: 'evil',
    DIED: 'died'
};

module.exports = {
    PlayerState,
    PlayerAction,
    PlayerFace
};