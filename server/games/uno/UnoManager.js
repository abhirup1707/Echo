const rooms = {};

const COLORS = ["red", "blue", "green", "yellow"];
const VALUES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];

function generateDeck(playerCount = 4) {
    const deckCount = playerCount > 7 ? 2 : 1;
    const deck = [];
    let idCounter = 1;

    for (let d = 0; d < deckCount; d++) {
        for (const color of COLORS) {
            // One 0 per color
            deck.push({
                id: `card_${idCounter++}`,
                color,
                value: "0",
                type: "number"
            });

            // Two of 1-9 and actions per color
            for (let i = 1; i < VALUES.length; i++) {
                const val = VALUES[i];
                const type = isNaN(Number(val)) ? val : "number";
                deck.push({
                    id: `card_${idCounter++}`,
                    color,
                    value: val,
                    type
                });
                deck.push({
                    id: `card_${idCounter++}`,
                    color,
                    value: val,
                    type
                });
            }
        }

        // Exactly 5 Wild Color Change cards per deck set
        for (let i = 0; i < 5; i++) {
            deck.push({
                id: `card_${idCounter++}`,
                color: "wild",
                value: "wild",
                type: "wild"
            });
        }

        // Exactly 5 Wild Draw 4 (+4) cards per deck set
        for (let i = 0; i < 5; i++) {
            deck.push({
                id: `card_${idCounter++}`,
                color: "wild",
                value: "wild4",
                type: "wild4"
            });
        }
    }

    // Exactly 1 Swap Hands card in the game
    deck.push({
        id: `card_${idCounter++}`,
        color: "wild",
        value: "swap",
        type: "swap"
    });

    // Shuffle deck (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

function createRoom(roomCode) {
    rooms[roomCode] = {
        roomCode,
        players: [],
        deck: [],
        discardPile: [],
        currentTurnIndex: 0,
        direction: 1, // 1: clockwise, -1: counter-clockwise
        activeColor: null,
        status: "waiting", // waiting, playing, finished
        winner: null,
        pendingWild: null,
        lastAction: "Waiting for players to start game",
        gameId: 0,
        reshuffleCount: 0,
        createdAt: new Date()
    };
    return rooms[roomCode];
}

function getRoom(roomCode) {
    return rooms[roomCode] || null;
}

function deleteRoom(roomCode) {
    delete rooms[roomCode];
}

function startUnoGame(room) {
    if (room.players.length < 2) return false;

    room.gameId = (room.gameId || 0) + 1;
    room.reshuffleCount = 0;
    room.deck = generateDeck(room.players.length);
    room.discardPile = [];
    room.direction = 1;
    room.currentTurnIndex = 0;
    room.status = "playing";
    room.winner = null;
    room.pendingWild = null;

    // Deal 7 cards to each player
    room.players.forEach(player => {
        player.hand = room.deck.splice(0, 7);
        player.hasCalledUno = false;
    });

    // Flip first card for discard pile (ensure it's not wild, wild4, or swap)
    let firstCard = room.deck.pop();
    while (firstCard.type === "wild4" || firstCard.type === "wild" || firstCard.type === "swap") {
        room.deck.unshift(firstCard);
        firstCard = room.deck.pop();
    }

    room.discardPile.push(firstCard);
    room.activeColor = firstCard.color;
    room.lastAction = `Game started! Top card is ${firstCard.color.toUpperCase()} ${firstCard.value}`;

    // Apply first card effect if it's an action card
    if (firstCard.type === "skip") {
        advanceTurn(room, 1);
        room.lastAction += `. ${room.players[0].username} was skipped!`;
    } else if (firstCard.type === "reverse") {
        room.direction = -1;
        room.currentTurnIndex = room.players.length - 1;
        room.lastAction += `. Direction reversed!`;
    } else if (firstCard.type === "draw2") {
        const victim = room.players[0];
        giveCards(room, victim, 2);
        advanceTurn(room, 1);
        room.lastAction += `. ${victim.username} drew 2 and skipped!`;
    }

    return true;
}

function advanceTurn(room, steps = 1) {
    const total = room.players.length;
    if (total === 0) return;
    let nextIndex = (room.currentTurnIndex + (room.direction * steps)) % total;
    while (nextIndex < 0) {
        nextIndex += total;
    }
    room.currentTurnIndex = nextIndex;
}

function giveCards(room, player, count) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
        if (room.deck.length === 0) {
            // Reshuffle discard pile except top card
            if (room.discardPile.length > 1) {
                const topCard = room.discardPile.pop();
                room.deck = room.discardPile.map(c => ({ ...c }));
                for (let j = room.deck.length - 1; j > 0; j--) {
                    const k = Math.floor(Math.random() * (j + 1));
                    [room.deck[j], room.deck[k]] = [room.deck[k], room.deck[j]];
                }
                room.discardPile = [topCard];
                room.reshuffleCount = (room.reshuffleCount || 0) + 1;
                room.lastAction = "🔄 Draw pile exhausted! Reshuffled discard pile into draw deck.";
            }
        }
        if (room.deck.length > 0) {
            const card = room.deck.pop();
            player.hand.push(card);
            drawn.push(card);
        }
    }
    player.hasCalledUno = false;
    return drawn;
}

function isValidMove(card, topCard, activeColor) {
    if (card.color === "wild") return true;
    if (card.color === activeColor) return true;
    if (topCard && card.value === topCard.value) return true;
    return false;
}

function playCard(room, playerId, cardId, chosenColor = null, targetPlayerId = null) {
    if (room.status !== "playing") return { success: false, message: "Game not playing" };

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
        return { success: false, message: "Not your turn" };
    }

    if (room.pendingWild) {
        return { success: false, message: "Awaiting selection" };
    }

    const cardIndex = currentPlayer.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
        return { success: false, message: "Card not in hand" };
    }

    const card = currentPlayer.hand[cardIndex];
    const topCard = room.discardPile[room.discardPile.length - 1];

    if (!isValidMove(card, topCard, room.activeColor)) {
        return { success: false, message: "Invalid card played" };
    }

    // If card is wild/swap and no color was chosen yet, prompt color choice
    if (card.color === "wild" && !chosenColor) {
        room.pendingWild = { playerId, cardId, type: card.type };
        return { success: true, requireColor: true };
    }

    // Remove card from hand
    currentPlayer.hand.splice(cardIndex, 1);
    room.discardPile.push(card);
    room.pendingWild = null;

    const effectiveColor = card.color === "wild" ? chosenColor : card.color;
    room.activeColor = effectiveColor;

    // Handle SWAP HANDS: Rotates everyone's cards in the direction of play!
    if (card.type === "swap") {
        const N = room.players.length;
        const D = room.direction; // 1: clockwise, -1: counter-clockwise
        const currentHands = room.players.map(p => p.hand);

        // Each player i receives hand from previous player in direction of play:
        // Clockwise: player who played gets previous player's card, next player gets swap player's card
        for (let i = 0; i < N; i++) {
            const fromIndex = (i - D + N) % N;
            room.players[i].hand = currentHands[fromIndex];
            room.players[i].hasCalledUno = false;
        }

        const dirText = D === 1 ? "Clockwise ↻" : "Counter-Clockwise ↺";
        let actionMsg = `🔀 ${currentPlayer.username} played SWAP HANDS! Everyone passed their cards ${dirText}! New color: ${chosenColor.toUpperCase()}`;
        advanceTurn(room, 1);
        room.lastAction = actionMsg;

        // Check if any player won
        const emptyPlayer = room.players.find(p => p.hand.length === 0);
        if (emptyPlayer) {
            room.status = "finished";
            room.winner = emptyPlayer;
            room.lastAction = `🎉 ${emptyPlayer.username} won the UNO game!`;
            return { success: true, finished: true };
        }

        return { success: true };
    }

    // Check if player won
    if (currentPlayer.hand.length === 0) {
        room.status = "finished";
        room.winner = currentPlayer;
        room.lastAction = `🎉 ${currentPlayer.username} won the UNO game!`;
        return { success: true, finished: true };
    }

    let actionMsg = `${currentPlayer.username} played ${card.color === 'wild' ? (card.type === 'wild4' ? '+4 Wild' : 'Wild') : card.color.toUpperCase() + ' ' + card.value}`;
    if (chosenColor) {
        actionMsg += ` and chose ${chosenColor.toUpperCase()}`;
    }

    // Handle action cards
    if (card.type === "skip") {
        advanceTurn(room, 1);
        const skipped = room.players[room.currentTurnIndex];
        advanceTurn(room, 1);
        actionMsg += `. ${skipped.username} was skipped!`;
    } else if (card.type === "reverse") {
        if (room.players.length === 2) {
            advanceTurn(room, 2);
            actionMsg += `. Reversed (acts as skip in 2 players)!`;
        } else {
            room.direction *= -1;
            advanceTurn(room, 1);
            actionMsg += `. Turn order reversed!`;
        }
    } else if (card.type === "draw2") {
        advanceTurn(room, 1);
        const victim = room.players[room.currentTurnIndex];
        giveCards(room, victim, 2);
        advanceTurn(room, 1);
        actionMsg += `. ${victim.username} drew 2 cards and was skipped!`;
    } else if (card.type === "wild4") {
        advanceTurn(room, 1);
        const victim = room.players[room.currentTurnIndex];
        giveCards(room, victim, 4);
        advanceTurn(room, 1);
        actionMsg += `. ${victim.username} drew 4 cards and was skipped!`;
    } else {
        advanceTurn(room, 1);
    }

    room.lastAction = actionMsg;
    return { success: true };
}

function playerDrawCard(room, playerId) {
    if (room.status !== "playing") return { success: false, message: "Game not playing" };

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
        return { success: false, message: "Not your turn" };
    }

    const drawn = giveCards(room, currentPlayer, 1);
    room.lastAction = `${currentPlayer.username} drew a card`;
    advanceTurn(room, 1);

    return { success: true, drawnCard: drawn[0] };
}

function playerCallUno(room, playerId) {
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    if (player.hand.length <= 2) {
        player.hasCalledUno = true;
        room.lastAction = `📢 ${player.username} called UNO!`;
        return true;
    }
    return false;
}

function getPublicUnoRoom(room, forPlayerId = null) {
    const topCard = room.discardPile[room.discardPile.length - 1] || null;
    const currentTurnPlayer = room.players[room.currentTurnIndex] || null;

    return {
        roomCode: room.roomCode,
        status: room.status,
        gameId: room.gameId || 0,
        reshuffleCount: room.reshuffleCount || 0,
        direction: room.direction,
        activeColor: room.activeColor,
        topCard,
        deckCount: room.deck.length,
        currentTurn: currentTurnPlayer ? currentTurnPlayer.id : null,
        currentTurnUsername: currentTurnPlayer ? currentTurnPlayer.username : null,
        lastAction: room.lastAction,
        winner: room.winner ? { id: room.winner.id, username: room.winner.username } : null,
        pendingWild: room.pendingWild ? { playerId: room.pendingWild.playerId, type: room.pendingWild.type } : null,
        players: room.players.map(p => ({
            id: p.id,
            username: p.username,
            cardCount: p.hand ? p.hand.length : 0,
            hasCalledUno: p.hasCalledUno,
            isHost: room.players[0] && room.players[0].id === p.id,
            hand: p.id === forPlayerId ? p.hand : []
        }))
    };
}

module.exports = {
    rooms,
    createRoom,
    getRoom,
    deleteRoom,
    startUnoGame,
    playCard,
    playerDrawCard,
    playerCallUno,
    getPublicUnoRoom
};
