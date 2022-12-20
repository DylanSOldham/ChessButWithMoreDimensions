document.body.style = "background: darkslategray";

let contentdiv = document.createElement("div");
document.body.appendChild(contentdiv);
contentdiv.style = "display: flex; direction: row"

let canvas = document.createElement("canvas");
contentdiv.appendChild(canvas);
canvas.width = 600;
canvas.height = 600;
canvas.oncontextmenu = (e) => e.preventDefault();

let ctx = canvas.getContext("2d");


let inputdiv = document.createElement("div");
contentdiv.append(inputdiv);
inputdiv.style = "display: block; direction: column"

let turnIndicator = document.createElement("h3");
inputdiv.appendChild(turnIndicator);
turnIndicator.textContent = "White's Turn";
turnIndicator.style = "padding-left: 5px; margin-left: 5px; color: white; background: black; height: 25px";

let addSquareButton = document.createElement("button");
addSquareButton.textContent = "Add Square";
addSquareButton.style = "display: flex; margin: 5px;"
inputdiv.append(addSquareButton);

let addConnectionButton = document.createElement("button");
addConnectionButton.textContent = "Add Connection";
addConnectionButton.style = "display: flex; margin: 5px; background: gray;"
inputdiv.append(addConnectionButton);

spritesheet = new Image();
spritesheet.src = 'assets/sprites.png';

const keystate = {};
let leftMouseDown = false;
let leftMouseJustUp = false;
let rightMouseDown = false;
let mousePos = {x: 0, y: 0};
document.addEventListener("keydown", (event) => {
    keystate[event.key] = true;
});
document.addEventListener("keyup", (event) => {
    keystate[event.key] = false;
    leftMouseJustUp = true;
});
document.addEventListener("mousedown", (event) => {
    event.button === 0 && (leftMouseDown = true);
    event.button === 2 && (rightMouseDown = true);
});
document.addEventListener("mouseup", (event) => {
    event.button === 0 && (leftMouseDown = false, leftMouseJustUp = true);
    event.button === 2 && (rightMouseDown = false);
    event.preventDefault();
});
document.addEventListener("mousemove", (event) => {
    mousePos.x = event.clientX - 8;
    mousePos.y = event.clientY - 7;
});

let camera = {x: -105, y: -100};
let cameraSpeed = 5;

let cameraTransform = (p) => {
    return {x: p.x - camera.x, y: p.y - camera.y};
}

const board = [];
const squareSize = 45;
let selectedSquare = null;
let whiteTurn = true;
let turnNum = 0;
let whiteCheck = false;
let blackCheck = false;
let kingSquareW = null;
let kingSquareB = null;
let whiteHasWon = null;

let addingConnection = false;
let newConn1 = null;
let newConn2 = null;

addSquareButton.addEventListener("mousedown", (event) => {
    makeSquare({x: -80, y: -80}, "rgb(" + (Math.random()*155 + 100) + "," + (Math.random()*155 + 100) + "," + (Math.random()*155 + 100) + ")");
});

addConnectionButton.addEventListener("mousedown", () => {

    if (turnNum > 5) {
        if (!addingConnection) {
            addConnectionButton.style = "background: gold; display: flex; margin: 5px;";
            addConnectionButton.textContent = "Select a Square to Start At";
            addingConnection = true;
        } else {
            addingConnection = false;
            addConnectionButton.textContent = "Add Connection";
            addConnectionButton.style = "display: flex; margin: 5px;";
            newConn1 = null;
            newConn2 = null;
        }
    }
})

let newSquareId = 0;
const makeSquare = (position, color) => {
    let newSquare = {
        id: newSquareId,
        position: position,
        color: color,
        connections: [],
        piece: null,
    }
    newSquareId += 1;

    board[newSquare.id] = newSquare;

    return newSquare.id;
}

const makeConnection = (square1, square2, d) => {
    let newConnection = {to: square2.id, d: d};
    let backConnection = {to: square1.id, d: -d};

    board[square1.id].connections.push(newConnection);
    board[square2.id].connections.push(backConnection);
}

const makePiece = (name) => {
    return {
        name: name, 
        numMoves: 0,
    };
}

const initializeBoard = () => {
    let previous = null;
    let previousRow = [];
    let workingRow = [];

    for (let i = 0; i < 8; ++i) {
        previousRow = workingRow;
        workingRow = [];
        for (let j = 0; j < 8; ++j) {
            let myId = makeSquare({x: 20 + i*squareSize, y: 20 + j*squareSize}, ((i+j)%2 == 0) ? "white" : "gray");

            if (j == 6) board[myId].piece = makePiece("WhitePawn");
            else if (j == 7) {
                if (i%7 == 0) board[myId].piece = makePiece("WhiteRook");
                else if (i%5 == 1) board[myId].piece = makePiece("WhiteKnight");
                else if (i%3 == 2) board[myId].piece = makePiece("WhiteBishop");
                else if (i == 3) board[myId].piece = makePiece("WhiteQueen");
                else if (i == 4) {
                    board[myId].piece = makePiece("WhiteKing");
                    kingSquareW = board[myId];
                }
            }
            else if (j == 1) board[myId].piece = makePiece("BlackPawn");
            else if (j == 0) {
                if (i%7 == 0) board[myId].piece = makePiece("BlackRook");
                else if (i%5 == 1) board[myId].piece = makePiece("BlackKnight");
                else if (i%3 == 2) board[myId].piece = makePiece("BlackBishop");
                else if (i == 3) board[myId].piece = makePiece("BlackQueen");
                else if (i == 4) {
                    board[myId].piece = makePiece("BlackKing");
                    kingSquareB = board[myId];
                }
            }

            if (j > 0) {
                makeConnection(previous, board[myId], 2);
            }

            workingRow[j] = board[myId];
            if (i > 0) {
                makeConnection(board[myId], board[previousRow[j].id], 1);
            }

            previous = board[myId];
        }
    }
}

const squareContainsPoint = (square, pos) => {
    sp = cameraTransform(square.position);

    if (pos.x > sp.x && pos.x < sp.x + squareSize && 
        pos.y > sp.y && pos.y < sp.y + squareSize) 
    {
        return true;
    }

    return false;
}

const cachedvalue = {id: null, result: null};
const drawSquare = (square) => {
    let sp = cameraTransform(square.position);

    ctx.fillStyle = square.color;
    if (selectedSquare && selectedSquare.piece) {

        let accessible = false;
        if (cachedvalue.id === square.id) {
            accessible = cachedvalue.result;
            setTimeout(() => cachedvalue = {id: null, result: null}, 1000);
        } else {
            accessible = moveIsValid(selectedSquare, square, false);
            cachedvalue.id = square.id;
            cachedvalue.result = accessible;
        }

        if (selectedSquare.id === square.id) ctx.fillStyle = "gold";
        else if (accessible) ctx.fillStyle = "pink";
    }
    ctx.fillRect(sp.x+1, sp.y+1, squareSize-2, squareSize-2);

    if (square.piece) {
        switch(square.piece.name) {
            case "WhitePawn":
                ctx.drawImage(spritesheet, 532, 0, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            case "WhiteRook":
                ctx.drawImage(spritesheet, 427, 0, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            case "WhiteKnight":
                ctx.drawImage(spritesheet, 322, 0, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            case "WhiteBishop":
                ctx.drawImage(spritesheet, 212, 0, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            case "WhiteQueen":
                ctx.drawImage(spritesheet, 108, 0, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            case "WhiteKing":
                ctx.drawImage(spritesheet, 0, 0, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            case "BlackPawn":
                ctx.drawImage(spritesheet, 532, 110, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            case "BlackRook":
                ctx.drawImage(spritesheet, 427, 110, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            case "BlackKnight":
                ctx.drawImage(spritesheet, 322, 110, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            case "BlackBishop":
                ctx.drawImage(spritesheet, 212, 110, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            case "BlackQueen":
                ctx.drawImage(spritesheet, 108, 110, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            case "BlackKing":
                ctx.drawImage(spritesheet, 0, 110, 105, 110, sp.x, sp.y, squareSize, squareSize);
                break;
            default:
                break;
        }
    }
}

const drawConnection = (connection, sp) => {
    const otherSquare = board[connection.to];
    const op = cameraTransform(otherSquare.position);

    let color = "white";
    switch (connection.d) {
        case -1:
        case 1: 
            color = "red";
            break;
        case -2:
        case 2:
            color = "blue";
            break;
        default:
            break;
    }

    const visualOffset = Math.abs(connection.d);

    let p1 = {x: sp.x + squareSize/2 + visualOffset, y: sp.y + squareSize/2 + visualOffset};
    let p2 = {x: op.x + squareSize/2 + visualOffset, y: op.y + squareSize/2 + visualOffset};

    let vp1 = {x: (13*p1.x + p2.x)/14, y: (13*p1.y + p2.y)/14};
    let vp2 = {x: (13*p2.x + p1.x)/14, y: (13*p2.y + p1.y)/14};

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(vp1.x, vp1.y);
    ctx.lineTo(vp2.x, vp2.y);
    ctx.save();
    ctx.translate(vp2.x, vp2.y);
    ctx.rotate(2*Math.PI/3 + Math.atan2(vp2.y-vp1.y, vp2.x-vp1.x));
    ctx.moveTo(0, 0);
    ctx.lineTo(5, 0);
    ctx.restore();
    ctx.stroke();
    ctx.closePath();
}

const advanceTurn = () => {
    whiteTurn = !whiteTurn; turnNum++;
    if (turnNum > 5) {
        addConnectionButton.style = "display: flex; margin: 5px;"
    }

    turnIndicator.style = whiteTurn 
        ? "margin-left: 10px; color: white; background: black; height: 25px" 
        : "margin-left: 10px; color: black; background: white; height: 25px";
    turnIndicator.textContent = whiteTurn ? "White's Turn" : "Black's Turn";
    if ((whiteTurn && whiteCheck) || (!whiteTurn && blackCheck)) turnIndicator.textContent += " (IN CHECK)";
}

const whitePawnMoveValid = (s1, s2, update) => {

    // The pawns are limited to the original dimensions

    for (const connection1 of s1.connections) {
        if (connection1.d === -2) {
            if (!s2.piece && connection1.to === s2.id) {
                if (update) { 
                    s1.piece.numMoves += 1;
                    if (s1.piece.numMoves === 6) s1.piece.name = "WhiteQueen";
                }
                return true;
            }

            let nextSquare = board[connection1.to];
            for (const connection2 of nextSquare.connections) {
                if (!s2.piece && s1.piece.numMoves === 0 && connection2.d === -2) {
                    if (connection2.to === s2.id) {
                        if (update) {
                            s1.piece.numMoves = 2;
                        }
                        return true;
                    }
                } else if (s2.piece && (connection2.d === 1 || connection2.d === -1)) {
                    if (connection2.to === s2.id) {
                        if (update) {
                            s1.piece.numMoves += 1;
                        }
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

const blackPawnMoveValid = (s1, s2, update) => {

    // The pawns are limited to the original dimensions

    for (const connection1 of s1.connections) {
        if (connection1.d === 2) {
            if (!s2.piece && connection1.to === s2.id) {
                if (update) { 
                    s1.piece.numMoves += 1;
                    if (s1.piece.numMoves === 6) s1.piece.name = "WhiteQueen";
                }
                return true;
            }

            let nextSquare = board[connection1.to];
            for (const connection2 of nextSquare.connections) {
                if (!s2.piece && s1.piece.numMoves === 0 && connection2.d === 2) {
                    if (connection2.to === s2.id) {
                        if (update) s1.piece.numMoves = 2;
                        return true;
                    }
                } else if (s2.piece && (connection2.d === 1 || connection2.d === -1)) {
                    if (connection2.to === s2.id) {
                        if (update) s1.piece.numMoves += 1;
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

const rookMoveValid = (s1, s2, update) => {
    const _rookMoveValid = (current, end, direction, counter) => {
        if (counter <= 0) return false;
        if (current.id === end.id) return true;

        if (!current.piece) {
            for (const conn of current.connections) {
                if (conn.d === direction) {
                    if (_rookMoveValid(board[conn.to], end, direction, counter - 1)) return true;
                }
            }
        }  

        return false;
    }

    if (s1.id === s2.id) return false;
    for (const con1 of s1.connections) {
        if (_rookMoveValid(board[con1.to], s2, con1.d, 50)) {
            return true;
        }
    }

    return false;
}

const bishopMoveValid = (s1, s2) => {
    if (s1.id === s2.id) return false;

    const _bishopMoveValid = (current, end, d1, d2, off, counter) => {

        if (counter <= 0) return false;
        if (!off) {
            if (current.id === end.id) return true;
            if (current.piece) return false;
        }

        for (const conn of current.connections) {
            if (conn.d === d1) {
                if (_bishopMoveValid(board[conn.to], end, d2, conn.d, !off, counter - 1)) return true;
            }
        }

        return false;
    };

    for (const conn1 of s1.connections) {
        const currSquare = board[conn1.to];
        for (const conn2 of currSquare.connections) {
            if (conn1.d != conn2.d) {
                if (_bishopMoveValid(board[conn2.to], s2, conn1.d, conn2.d, false, 50)) return true;
            }
        }
    }

    return false;
}

const knightMoveValid = (s1, s2) => {
    if (s1.id === s2.id) return false;

    for (const conn1 of s1.connections) {
        const nextSquare = board[conn1.to];

        const longdir = conn1.d;
        for (const conn2 of nextSquare.connections) {
            if (conn2.d === longdir) {
                const neaxtSquare = board[conn2.to];
                for (const conn3 of neaxtSquare.connections) {
                    if (conn3.d !== longdir && board[conn3.to].id !== nextSquare.id) {
                        if (board[conn3.to].id === s2.id) return true;
                    }
                }
            }
        }
    }

    return false;
}

const kingMoveValidRaw = (s1, s2) => {
    for (const connection1 of s1.connections) {
        if (connection1.to === s2.id) return true;

        const dimensionsMoved = [];
        dimensionsMoved[connection1.d] = true;

        const newSquare = board[connection1.to];

        for (const connection2 of newSquare.connections) {
            if (!dimensionsMoved[connection2.d] && connection2.to === s2.id) return true;
        }
    }

    return false;
}

const squareIsCheck = (s1, kingsquare) => {
    for (const square of board) {
        if (square.piece && square.piece.name[0] != kingsquare.piece.name[0])
        {
            if (square.piece.name.includes("King")){
                if (kingMoveValidRaw(square, s1)) {
                    return true;
                }
            }
            else {
                let result = false;
                let pieceHolderK = kingsquare.piece;
                let pieceHolder1 = s1.piece;
                kingsquare.piece = null;
                s1.piece = pieceHolderK;

                if (pieceMoveIsValid(square, s1, false, false)) {
                    result = true;
                }

                kingsquare.piece = pieceHolderK;
                s1.piece = pieceHolder1;
                if (result === true) return result;
            }
        }
    }

    return false;
}

const kingMoveValid = (s1, s2) => {
    // The king can move one square in each dimension per turn

    const result = kingMoveValidRaw(s1, s2);
    if (!result) return false;

    return result;
}

const pieceMoveIsValid = (s1, s2, update, checkChecks) => {
    if (s1.id === s2.id) return false;

    let res = false; 

    switch (s1.piece.name) {
        case "WhitePawn":
            res = whitePawnMoveValid(s1, s2, update);
            break;
        case "BlackPawn":
            res = blackPawnMoveValid(s1, s2, update);
            break;
        case "WhiteBishop":
        case "BlackBishop":
            res = bishopMoveValid(s1, s2);
            break;
        case "WhiteRook":
        case "BlackRook":
            res = rookMoveValid(s1, s2, update);
            break;
        case "WhiteKnight":
        case "BlackKnight":
            res = knightMoveValid(s1, s2);
            break;
        case "WhiteQueen":
        case "BlackQueen":
            res = rookMoveValid(s1, s2, false) || bishopMoveValid(s1, s2);
            break;
        case "WhiteKing":
        case "BlackKing":
            res = kingMoveValid(s1, s2);
            break;
        default:
            res = false;
            break;
    }

    if (checkChecks) {
        if (s1.piece.name === "WhiteKing") kingSquareW = s2;
        else if (s1.piece.name === "BlackKing") kingSquareB = s2;
        let pieceHolder1 = s1.piece;
        let pieceHolder2 = s2.piece;
        s1.piece = null;
        s2.piece = pieceHolder1;

        if (res === true){
            if (pieceHolder1.name[0] === "W") {
                res = !squareIsCheck(kingSquareW, kingSquareW);
            } else {
                res = !squareIsCheck(kingSquareB, kingSquareB);
            }
            blackCheck = squareIsCheck(kingSquareB, kingSquareB);
            whiteCheck = squareIsCheck(kingSquareW, kingSquareW);
        }

        s1.piece = pieceHolder1;
        s2.piece = pieceHolder2;

        if (s1.piece.name === "WhiteKing") kingSquareW = s1;
        if (s1.piece.name === "BlackKing") kingSquareB = s1;
    }

    return res;
}

const moveIsValid = (s1, s2, update) => {

    if (s1.piece) {

        if (s2.piece && s2.piece.name[0] === s1.piece.name[0]) return false;

        if (s1.piece.name[0] === "W" && whiteTurn) {
            return pieceMoveIsValid(s1, s2, update, true);
        }
        
        if (s1.piece.name[0] === "B" && !whiteTurn) {
            return pieceMoveIsValid(s1, s2, update, true);
        }
    }

    return false;
}

const updateSquare = (square) => {
    if (rightMouseDown || leftMouseDown) {
        if (!selectedSquare) {
            if (squareContainsPoint(square, mousePos)) {
                selectedSquare = square;
            }
        }
    }
    
    if (leftMouseJustUp && addingConnection && selectedSquare) {
        if (!newConn1) {
            newConn1 = selectedSquare;
            addConnectionButton.textContent = "Select An Endpoint Square";
        } else if (!newConn2) {
            newConn2 = selectedSquare;
            makeConnection(newConn1, newConn2, 1);
            advanceTurn();
            addingConnection = false;
            addConnectionButton.textContent = "Add Connection";
            addConnectionButton.style = "display: flex; margin: 5px;";
            newConn1 = null;
            newConn2 = null;
        }

        selectedSquare = null;
    }

    if (leftMouseJustUp && selectedSquare  && squareContainsPoint(square, mousePos)) {
        if (moveIsValid(selectedSquare, square, true)) {
            square.piece = selectedSquare.piece;
            selectedSquare.piece = null;

            if (square.piece.name === "WhiteKing") {
                kingSquareW = square;

            }
            if (square.piece.name === "BlackKing") {
                kingSquareB = square;
            }

            advanceTurn();

            if (whiteTurn && whiteCheck) {
                let moveAvailable = false;
                for (const s1 of board) {
                    for (const s2 of board) {
                        if (s1.piece?.name[0] == "W" && moveIsValid(s1, s2)) {
                            moveAvailable = true;
                            break;
                        }
                    }
                }
                if (!moveAvailable) turnIndicator.textContent = "CHECKMATE - BLACK WINS";
            }
            if (!whiteTurn && blackCheck) {
                let moveAvailable = false;
                for (const s1 of board) {
                    for (const s2 of board) {
                        if (s1.piece?.name[0] == "B" && moveIsValid(s1, s2)) {
                            moveAvailable = true;
                            break;
                        }
                    }
                }
                if (!moveAvailable) turnIndicator.textContent = "CHECKMATE - WHITE WINS";
            }
        }
    }
}

const drawBoard = () => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const square of board) {
        drawSquare(square);
        updateSquare(square);
    }
    
    if (!rightMouseDown && !leftMouseDown && selectedSquare) selectedSquare = null;

    for (const square of board) {
        let sp = cameraTransform(square.position);
        for (const connection of square.connections) {
            drawConnection(connection, sp);
        }
    }

    if (selectedSquare && rightMouseDown) {
        selectedSquare.position.x = camera.x + mousePos.x - squareSize/2;
        selectedSquare.position.y = camera.y + mousePos.y - squareSize/2;
    }
}

const loop = () => {

    if (keystate["ArrowUp"]) camera.y -= cameraSpeed;
    if (keystate["ArrowDown"]) camera.y += cameraSpeed;
    if (keystate["ArrowRight"]) camera.x += cameraSpeed;
    if (keystate["ArrowLeft"]) camera.x -= cameraSpeed;

    drawBoard();

    leftMouseJustUp = false;
    requestAnimationFrame(loop);
}

spritesheet.onload = function (e)
{
    initializeBoard();
    loop();
}