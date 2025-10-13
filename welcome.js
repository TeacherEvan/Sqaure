let selectedGridSize = null;

// Grid size selection
document.querySelectorAll('.grid-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.grid-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedGridSize = parseInt(btn.dataset.size);
        document.getElementById('startGame').disabled = false;
    });
});

// Start game
document.getElementById('startGame').addEventListener('click', () => {
    const player1Color = document.getElementById('player1Color').value;
    const player2Color = document.getElementById('player2Color').value;

    document.getElementById('welcomeScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');

    // Force fullscreen on supported browsers
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Fullscreen not supported or denied');
        });
    }

    game = new DotsAndBoxesGame(selectedGridSize, player1Color, player2Color);
});

// Exit game
document.getElementById('exitGame').addEventListener('click', () => {
    if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
    }

    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('welcomeScreen').classList.add('active');
    game = null;
});

// Play again
document.getElementById('playAgain').addEventListener('click', () => {
    document.getElementById('winnerScreen').classList.remove('active');
    document.getElementById('welcomeScreen').classList.add('active');
});
