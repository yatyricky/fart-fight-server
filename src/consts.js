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

const IOTypes = {
    R_LOGIN: "login",
    R_LEAVE: "leave",
    R_CLOSE_RES: "close result",
    R_READY: "ready",
    R_CHARGE: "charge",
    R_SHOCK: "shock",
    R_BLOCK: "block",
    R_NUKE: "nuke",

    E_LINK_ESTABLISHED: "link established",
    E_UPDATE_PLAYERS: "update players",
    E_LOGIN_RESULT: "login result",
    E_PLAYER_LEFT: "player left",
    E_RUN_TIMER: "run timer",
    E_GAME_END: "game end",
};

const LoginMethod = {
    DEVICE: "dvc",
    GOOGLE_GAMES: "gpg",
    FACEBOOK: "fb",
    FB_INSTANT_GAMES: "fbig"
}

module.exports = {
    PlayerState,
    PlayerAction,
    PlayerFace,
    IOTypes,
    LoginMethod
};