// ─── Constants ───────────────────────────────────────────────────────────────
const MATCH_WIN_SCORE = 10;
const MAX_NAME_LENGTH = 20;

const winningCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// ─── Gameboard Module ─────────────────────────────────────────────────────────
const gameBoard = (function () {
    const positions = ["", "", "", "", "", "", "", "", ""];

    const getPosition = (index) => {
        if (index < 0 || index > 8) return null;
        return positions[index];
    };

    const setPosition = (index, marker) => {
        if (index < 0 || index > 8) return false;
        positions[index] = marker;
        return true;
    };

    const resetBoard = () => positions.fill("");
    const getPositions = () => [...positions]; //creates an copy so that the original can't be mutated

    return { getPosition, setPosition, resetBoard, getPositions };
})();

// ─── Display Controller Module ────────────────────────────────────────────────
// Defined BEFORE gameController so it exists when gameController references it.
const displayController = (function () {
    const setupDiv   = document.getElementById("setup");
    const gameDiv    = document.getElementById("game");
    const boardDiv   = document.getElementById("board");
    const messageDiv = document.getElementById("message");
    const startBtn   = document.getElementById("startBtn");
    const restartBtn = document.getElementById("restart");
    const player1Input = document.getElementById("player1");
    const player2Input = document.getElementById("player2");
    const scoreP1    = document.getElementById("score-p1");
    const scoreP2    = document.getElementById("score-p2");

    let boardLocked = false; //when false, the board is clickable
    // Callback wired up by gameController after it initialises.
    let onCellClick = null; //this will store a function

    //it will call whatever function is stored in onCellClick
    const registerCellClickHandler = (handler) => {
        onCellClick = handler;
    };

    const showSetup = () => {
        setupDiv.style.display = "flex";
        gameDiv.style.display  = "none";
        player1Input.value     = "";
        player2Input.value     = "";
    };

    const showGame = () => {
        setupDiv.style.display = "none";
        gameDiv.style.display  = "flex";
    };

    const renderBoard = () => {
        //resets the board
        boardLocked      = false; //board in new round is clickable
        boardDiv.innerHTML = ""; //resets existing HTML

        gameBoard.getPositions().forEach((marker, index) => {
            const cell = document.createElement("div"); //div for the board cells are created
            cell.classList.add("cell"); //a class "cell" added to each board cell
            if (marker) cell.classList.add(marker.toLowerCase()); // "x" or "o" class
            cell.textContent = marker; //the marker is seen on the cell

            // Keyboard accessibility
            cell.setAttribute("tabindex", "0"); //focusable via TAB key
            cell.setAttribute("role", "button"); //screen readers treats it as clickable
            cell.setAttribute("aria-label", `Cell ${index + 1}${marker ? `, ${marker}` : ""}`); //gives it a human-readable description

            const handleActivation = () => {
                if (!boardLocked && onCellClick) onCellClick(index); //checks if the board is not clickable and onCellClick callback exists
            };

            cell.addEventListener("click", handleActivation); //calls handleActivation func when clicked on board
            cell.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") { //calls handleActivation when "Enter" or "Space" is pressed
                    e.preventDefault(); //prevent space key from scrolling the page
                    handleActivation(); //works exactly as if the cell was clicked with a mouse
                }
            });

            boardDiv.appendChild(cell); //cells are placed into the board
        });
    };

    const lockBoard = () => { boardLocked = true; }; //func to make the board unclickable

    const highlightWinner = (combo) => {
        const cells = boardDiv.querySelectorAll(".cell");
        combo.forEach(index => cells[index].classList.add("winner")); //adds a class "winner" to the winning cells
    };

    const updateScoreboard = (players) => {
        scoreP1.textContent = `${players[0].name}: ${players[0].score}`;
        scoreP2.textContent = `${players[1].name}: ${players[1].score}`;
    };

    const showMessage = (msg) => { messageDiv.textContent = msg; };

    // ── Event listeners wired here; gameController registered via callbacks ──
    startBtn.addEventListener("click", () => {
        // Sanitize and limit name length
        const p1 = (player1Input.value.trim().slice(0, MAX_NAME_LENGTH)) || "Player 1"; //trim() removes the whitespaces
        const p2 = (player2Input.value.trim().slice(0, MAX_NAME_LENGTH)) || "Player 2";
        showGame(); //displays the game board
        gameController.startGame(p1, p2); //event listener calls when event is triggered
    });

    restartBtn.addEventListener("click", () => { showSetup(); }); //displays the start page

    return {
        renderBoard,
        showMessage,
        updateScoreboard,
        lockBoard,
        highlightWinner,
        registerCellClickHandler,
    };
})();

// ─── Game Controller Module ───────────────────────────────────────────────────
// Defined AFTER displayController — safe to reference it here.
const gameController = (function () {
    const createPlayer = (name, marker) => ({ name, marker, score: 0 }); //creates a new player object that stores the name, marker and the score

    let players           = []; //empty array to store player names
    let currentPlayerIndex = 0;
    let movesCount        = 0;
    let roundOver         = false;
    let matchOver         = false;

    //checkwinner function takes the winningCombos array as an reference and then checks for each individual position on the game board to check whether
    //the game board positions specified by those arrays all contain the player's marker
    const checkWinner = (marker) =>
        winningCombos.find(combo => //loops through each winning combination and returns the first one that satisfies the condition below
            combo.every(index => gameBoard.getPosition(index) === marker) //every() method asks if "every" element satisfy this condition
        ) || null; //if game is drawn it return null instead of undefined (null communicates intent better: 'there is no winner')

    const checkDraw = () => movesCount === 9; //if 9 moves are played without any winner, game is drawn

    const checkRoundOver = () => {
        const current      = players[currentPlayerIndex];
        const winningCombo = checkWinner(current.marker); //contains the winning array elements or "null" if drawn

        if (winningCombo) {
            current.score++;
            displayController.highlightWinner(winningCombo);
            displayController.updateScoreboard(players);

            if (current.score >= MATCH_WIN_SCORE) {
                matchOver = true;
                displayController.lockBoard(); //cells are unclickable
                displayController.showMessage(`🏆 ${current.name} wins the match!`);
            } else {
                displayController.showMessage(`🎉 ${current.name} wins the round! Starting next round…`);
                setTimeout(startRound, 1500);
            }
            return true;
        }

        if (checkDraw()) {
            displayController.showMessage("It's a draw! Starting next round…");
            setTimeout(startRound, 1500);
            return true;
        }

        return false;
    };

    const swapMarkers = () => {
        //Swap markers between players so each round they alternate X and O
        [players[0].marker, players[1].marker] = [players[1].marker, players[0].marker];
    };

    const startRound = () => {
        swapMarkers();
        currentPlayerIndex = players.findIndex(p => p.marker === "X"); //The player who now holds X always goes first (X starts by convention)
        movesCount         = 0;
        roundOver          = false;
        gameBoard.resetBoard();
        displayController.renderBoard();
        const starter = players[currentPlayerIndex];
        displayController.showMessage(`${starter.name}'s turn (${starter.marker})`); //name of the player with marker X
    };

    const startGame = (player1Name, player2Name) => { //player1 is defined as "p1" that will taken from the display menu, same for player2
        players = [
            createPlayer(player1Name, "X"),
            createPlayer(player2Name, "O"),
        ];
        currentPlayerIndex = 0;
        movesCount         = 0;
        roundOver          = false;
        matchOver          = false;
        gameBoard.resetBoard();
        displayController.updateScoreboard(players);
        displayController.renderBoard();
        displayController.showMessage(`${players[0].name}'s turn (X)`);
    };

    //this function is called everytime a player clicks on the board cell
    const playTurn = (index) => {
        if (roundOver || matchOver) return; //move is ignored if the round or match has already ended
        if (gameBoard.getPosition(index) !== "") return; //move is ignored on cell that is already marked

        const current = players[currentPlayerIndex];
        gameBoard.setPosition(index, current.marker); //places the marker
        movesCount++;
        displayController.renderBoard(); //updates the display with newly placed marker

        //if true new round is started, else round is continued
        if (checkRoundOver()) {
            roundOver = true;
            return;
        }

        // Switch player using arithmetic instead of ternary
        currentPlayerIndex = 1 - currentPlayerIndex;
        //shorter for -
        // if(currentPlayerIndex === 0) {
        //     currentPlayerIndex = 1;
        // } else {
        //     currentPlayerIndex = 0
        // }
        const next = players[currentPlayerIndex];
        displayController.showMessage(`${next.name}'s turn (${next.marker})`);
    };

    // Wire the cell-click callback into displayController
    // (breaks the direct circular call — displayController never calls gameController by name)
    displayController.registerCellClickHandler(playTurn);

    return { startGame, playTurn };
})();