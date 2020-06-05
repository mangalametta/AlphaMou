// Define Stone
var Stone = {
    // enum types
    Blank: -1,
    Heart: 0,
    Dark: 1,
    Fire: 2,
    Wood: 3,
    Water: 4,
    Light: 5,
};

// Define Combo
var Combo = function (size, stone, connected) {
    // size at least 3
    this.size = size;
    this.stone = stone;
    this.connected = connected;
};

// Define direction
var Dir = {
    UP: 0,
    DOWN: 1,
    LEFT: 2,
    RIGHT: 3,
    UL: 4,
    UR: 5,
    DL: 6,
    DR: 7,
};

function loadImage(url) {
    let i = new Image();
    i.src = url;
    return i;
}

async function drawImg(ctx, x, y, image) {
    return new Promise((resolve) => {
        image.onload = function () {
            ctx.drawImage(image, x * 50, y * 50, 50, 50);
            resolve('resolved');
        };
    });
}

async function drawImgAbs(ctx, x, y, image, transp = 1) {
    return new Promise((resolve) => {
        image.onload = function () {
            ctx.globalAlpha = transp;
            ctx.drawImage(image, x, y, 50, 50);
            resolve('resolved');
        };
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Define game board
var Board = function (elem = undefined, board = undefined) {
    // create canvas on elem

    this._canvas = document.createElement('canvas');
    this._canvas.width = 6 * 50;
    this._canvas.height = 5 * 50;
    this._canvas.style = 'border-style:ridge;';
    if (elem !== undefined) {
        while (elem.firstChild) {
            elem.removeChild(elem.firstChild);
        }
        elem.appendChild(this._canvas);
    }
    // add click event handler
    let thisOfBoard = this; // to use it in closure
    this._canvas.addEventListener(
        'click',
        function (event) {
            let x = Math.floor(event.offsetX / 50),
                y = Math.floor(event.offsetY / 50);
            switch (thisOfBoard.state) {
                case 'switch':
                    thisOfBoard._board[x][y] =
                        (thisOfBoard._board[x][y] + 1) % 6;
                    thisOfBoard._reRenderStone(x, y);
                    break;
                case 'set':
                    thisOfBoard.posi = [x, y];
                    alert('起始點設定成功');
                    break;
                default:
                    break;
            }
        },
        false
    );

    // for AI
    this.father = undefined;
    this.spanned = false;
    this.moves = 0;
    this.score = undefined;
    this.posi = [0, 0];
    this.findCombo = [];

    // for control
    this.state = 'switch';

    // init stone pic
    this._imgs = [
        () => {
            return loadImage('img/h.png');
        },
        () => {
            return loadImage('img/d.png');
        },
        () => {
            return loadImage('img/f.png');
        },
        () => {
            return loadImage('img/p.png');
        },
        () => {
            return loadImage('img/w.png');
        },
        () => {
            return loadImage('img/l.png');
        },
    ];

    // [width,height]
    this._size = [6, 5];
    // define board
    // accessing like_board[x][y] (transpose rendering)
    this._board = board;
    if (this._board == undefined) {
        this._board = new Array();
        for (let i = 0; i < this._size[0]; ++i) {
            this._board.push(new Array());
            for (let j = 0; j < this._size[1]; ++j)
                // random generate stones
                this._board[i].push(Math.floor(Math.random() * 6));
        }
    }
    // define methods
    this._cloneBoard = function () {
        let copyBoard = new Array();
        for (let x = 0; x < this._size[0]; ++x) {
            copyBoard.push(new Array());
            for (let y = 0; y < this._size[1]; ++y)
                // random generate stones
                copyBoard[x].push(this._board[x][y]);
        }
        return copyBoard;
    };
    this._checkPosiExist = function (arr, posi) {
        for (let i = 0; i < arr.length; ++i) {
            if (arr[i][0] == posi[0] && arr[i][1] == posi[1]) return true;
        }
        return false;
    };
    this._checkPosi = function (x, y) {
        // check if position valid
        return x >= 0 && y >= 0 && x < this._size[0] && y < this._size[1];
    };
    this.swap = function (x, y, d, board = this._board) {
        // board should be called by reference
        // simulate move, d means direction, (x,y) is current pos, left top is (0,0)
        if (!this._checkPosi(x, y)) {
            //console.log('Position is invalid!');
            return false;
        }
        let nx = x,
            ny = y;
        switch (d) {
            case Dir.UP:
                ny -= 1;
                break;
            case Dir.DOWN:
                ny += 1;
                break;
            case Dir.LEFT:
                nx -= 1;
                break;
            case Dir.RIGHT:
                nx += 1;
                break;
            case Dir.UL:
                nx -= 1;
                ny -= 1;
                break;
            case Dir.UR:
                nx += 1;
                ny -= 1;
                break;
            case Dir.DL:
                nx -= 1;
                ny += 1;
                break;
            case Dir.DR:
                nx += 1;
                ny += 1;
                break;
            default:
                // not suppose to happen
                //console.log(`Direction ${d} is invalid!`);
                break;
        }
        if (this._checkPosi(nx, ny)) {
            let tmp = board[x][y];
            board[x][y] = board[nx][ny];
            board[nx][ny] = tmp;
            return [nx, ny];
        } else {
            // out of board
            //console.log(nx, ny);
            //console.log('The position after move is invalid!');
            return false;
        }
    };
    this._findConnected = function (copyBoard, x, y, connected = []) {
        // dfs
        const dirVector = [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0],
        ];
        // push current position
        connected.push([x, y]);

        dirVector.forEach((vector) => {
            // seek connected
            let nx = x + vector[0],
                ny = y + vector[1];
            // use return instead of continue
            if (
                !this._checkPosi(nx, ny) ||
                copyBoard[x][y] != copyBoard[nx][ny] ||
                this._checkPosiExist(connected, [nx, ny])
            )
                return;
            // connected
            connected = this._findConnected(copyBoard, nx, ny, connected);
        });
        return connected;
    };
    this._trimConnected = function (connected) {
        vaildConnected = [];
        connected.forEach((stone) => {
            // assume this is the stone in the up-left of valid group
            // verifying x asix
            let x_preceedings = [
                [stone[0] + 1, stone[1]],
                [stone[0] + 2, stone[1]],
            ];
            if (
                this._checkPosiExist(connected, x_preceedings[0]) &&
                this._checkPosiExist(connected, x_preceedings[1])
            ) {
                // push to validConnected
                if (!this._checkPosiExist(vaildConnected, stone))
                    vaildConnected.push(stone);
                if (!this._checkPosiExist(vaildConnected, x_preceedings[0]))
                    vaildConnected.push(x_preceedings[0]);
                if (!this._checkPosiExist(vaildConnected, x_preceedings[1]))
                    vaildConnected.push(x_preceedings[1]);
            }
            // verifying y asix
            let y_preceedings = [
                [stone[0], stone[1] + 1],
                [stone[0], stone[1] + 2],
            ];
            if (
                this._checkPosiExist(connected, y_preceedings[0]) &&
                this._checkPosiExist(connected, y_preceedings[1])
            ) {
                // push to validConnected
                if (!this._checkPosiExist(vaildConnected, stone))
                    vaildConnected.push(stone);
                if (!this._checkPosiExist(vaildConnected, y_preceedings[0]))
                    vaildConnected.push(y_preceedings[0]);
                if (!this._checkPosiExist(vaildConnected, y_preceedings[1]))
                    vaildConnected.push(y_preceedings[1]);
            }
        });
        return vaildConnected;
    };
    this._findCombo = function (copyBoard) {
        // copyBoard should be called by reference
        let combos = [];
        for (let x = 0; x < this._size[0]; ++x) {
            for (let y = 0; y < this._size[1]; ++y) {
                if (copyBoard[x][y] == Stone.Blank) continue;
                let connected = this._trimConnected(
                    this._findConnected(copyBoard, x, y)
                );
                if (connected.length != 0) {
                    combos.push(
                        new Combo(connected.length, copyBoard[x][y], connected)
                    );
                    // mark as blank

                    connected.forEach((stone) => {
                        copyBoard[stone[0]][stone[1]] = Stone.Blank;
                    });
                }
            }
        }
        return combos;
    };
    this.dropDown = function (apply = false) {
        // simulate drop down
        // do find combo and dropdown once
        // clone board to simulate combo
        let copyBoard = this._cloneBoard();
        let combos = this._findCombo(copyBoard);
        for (let x = 0; x < this._size[0]; ++x) {
            let dropCount;
            do {
                dropCount = 0;
                for (let y = 0; y < this._size[1] - 1; ++y) {
                    if (
                        copyBoard[x][y] != Stone.Blank &&
                        copyBoard[x][y + 1] == Stone.Blank
                    ) {
                        // tumbling dowm tumbling dowm tumbling dowm ~~~~
                        this.swap(x, y, Dir.DOWN, copyBoard);
                        ++dropCount;
                    }
                }
            } while (dropCount);
        }
        if (apply) this._board = copyBoard;
        return combos;
    };

    this.getBlankNum = function () {
        let count = 0;
        for (let x = 0; x < this._size[0]; ++x) {
            for (let y = 0; y < this._size[1]; ++y) {
                if (this._board[x][y] == Stone.Blank) ++count;
            }
        }
        return count;
    };

    this.render = function (canvas = this._canvas, board = this._board) {
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let x = 0; x < this._size[0]; ++x) {
            for (let y = 0; y < this._size[1]; ++y) {
                if (board[x][y] == Stone.Blank) continue;
                drawImg(ctx, x, y, this._imgs[board[x][y]]());
            }
        }
    };

    this._reRenderStone = function (x, y, board = this._board) {
        let ctx = this._canvas.getContext('2d');
        ctx.clearRect(x * 50, y * 50, 50, 50);
        drawImg(ctx, x, y, this._imgs[board[x][y]]());
    };

    this._animePath = function (path, i, duration = 500) {
        const ts = 10, // millisec of one draw
            times = duration / ts;
        let ctx = this._canvas.getContext('2d');
        let posi1 = path[i],
            posi2 = path[i + 1];
        let count = 1,
            movement = [
                (posi1[0] - posi2[0]) / times,
                (posi1[1] - posi2[1]) / times,
            ];
        let thisOfBoard = this;
        var animeInterval = setInterval(function () {
            //console.log(thisOfBoard);
            // clear both region
            // not considering skew move now
            ctx.clearRect(
                posi1[0] * 50 - (count - 1) * movement[0] * 50,
                posi1[1] * 50 - (count - 1) * movement[1] * 50,
                50,
                50
            );
            ctx.clearRect(
                posi2[0] * 50 + (count - 1) * movement[0] * 50,
                posi2[1] * 50 + (count - 1) * movement[1] * 50,
                50,
                50
            );

            // draw swaping
            drawImgAbs(
                ctx,
                posi2[0] * 50 + count * movement[0] * 50,
                posi2[1] * 50 + count * movement[1] * 50,
                thisOfBoard._imgs[thisOfBoard._board[posi2[0]][posi2[1]]]()
            );

            drawImgAbs(
                ctx,
                posi1[0] * 50 - count * movement[0] * 50,
                posi1[1] * 50 - count * movement[1] * 50,
                thisOfBoard._imgs[thisOfBoard._board[posi1[0]][posi1[1]]](),
                true
            );
            if (++count > times) {
                window.clearInterval(animeInterval);
                let tmp = thisOfBoard._board[posi1[0]][posi1[1]];
                thisOfBoard._board[posi1[0]][posi1[1]] =
                    thisOfBoard._board[posi2[0]][posi2[1]];
                thisOfBoard._board[posi2[0]][posi2[1]] = tmp;
                if (i < path.length - 2) {
                    thisOfBoard._animePath(path, i + 1, duration);
                }
            }
        }, ts);
    };

    this.renderPath = function (path) {
        var ctx = this._canvas.getContext('2d');
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.arc(path[0][0] * 50 + 25, path[0][1] * 50 + 25, 10, 0, 2 * Math.PI);
        ctx.fillStyle = 'green';
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(
            path[path.length - 1][0] * 50 + 25,
            path[path.length - 1][1] * 50 + 25,
            10,
            0,
            2 * Math.PI
        );
        ctx.fillStyle = 'green';
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(path[0][0] * 50 + 25, path[0][1] * 50 + 25);
        for (let i = 0; i < path.length - 1; ++i)
            ctx.lineTo(path[i + 1][0] * 50 + 25, path[i + 1][1] * 50 + 25);

        let grad = ctx.createLinearGradient(50, 50, 150, 150);
        grad.addColorStop(0, 'black');
        grad.addColorStop(1, 'white');

        ctx.strokeStyle = grad;

        ctx.lineWidth = 5;
        ctx.stroke();
    };

    this.runPath = function (path) {
        this._animePath(path, 0, 200);
    };

    this._animeDropDown = function (duration = 500) {
        const ts = 10, // millisec of one draw
            times = duration / ts;
        let ctx = this._canvas.getContext('2d');
        let thisOfBoard = this,
            dropCount = 0,
            count = 1;
        var animeInterval = setInterval(function () {
            // for each y asix
            for (let x = 0; x < thisOfBoard._size[0]; ++x) {
                let flag = false;
                for (let y = thisOfBoard._size[1] - 1; y > 0; --y) {
                    if (!flag && thisOfBoard._board[x][y] == Stone.Blank) {
                        flag = true;
                    }
                    if (flag) {
                        if (thisOfBoard._board[x][y - 1] == Stone.Blank)
                            continue;
                        ctx.clearRect(
                            x * 50,
                            (y - 1) * 50 + (count - 1) * (1 / times) * 50,
                            50,
                            50
                        );
                        ++dropCount;
                        drawImgAbs(
                            ctx,
                            x * 50,
                            (y - 1) * 50 + count * (1 / times) * 50,
                            thisOfBoard._imgs[thisOfBoard._board[x][y - 1]]()
                        );
                    }
                }
            }

            if (++count > times) {
                window.clearInterval(animeInterval);
                if (dropCount != 0) {
                    for (let x = 0; x < thisOfBoard._size[0]; ++x) {
                        let flag = false;
                        for (let y = thisOfBoard._size[1] - 1; y > 0; --y) {
                            if (
                                !flag &&
                                thisOfBoard._board[x][y] == Stone.Blank
                            ) {
                                flag = true;
                            }
                            if (flag) {
                                thisOfBoard._board[x][y] =
                                    thisOfBoard._board[x][y - 1];
                                thisOfBoard._board[x][y - 1] = Stone.Blank;
                            }
                        }
                    }
                    thisOfBoard._animeDropDown(duration);
                } else {
                    thisOfBoard.renderResult();
                }
            }
        }, ts);
    };

    this._animeFadingCombo = function (combos, i, duration = 500) {
        //console.log(i);
        const ts = 10, // millisec of one draw
            times = duration / ts;
        let ctx = this._canvas.getContext('2d');
        let count = 1;
        let thisOfBoard = this;
        let connected = combos[i].connected;
        var animeInterval = setInterval(function () {
            //console.log(thisOfBoard);
            // clear both region
            // not considering skew move now
            connected.forEach((stone) => {
                ctx.clearRect(stone[0] * 50, stone[1] * 50, 50, 50);

                // fading out
                drawImgAbs(
                    ctx,
                    stone[0] * 50,
                    stone[1] * 50,
                    thisOfBoard._imgs[thisOfBoard._board[stone[0]][stone[1]]](),
                    1 - count * (1 / times)
                );
            });
            // clear

            if (++count > times) {
                window.clearInterval(animeInterval);
                connected.forEach((stone) => {
                    thisOfBoard._board[stone[0]][stone[1]] = Stone.Blank;
                });
                // to next
                if (i < combos.length - 1)
                    thisOfBoard._animeFadingCombo(combos, i + 1, duration);
                else thisOfBoard._animeDropDown(500);
            }
        }, ts);
    };
    this.renderResult = function () {
        // make combo to blanks
        let combos = this.dropDown();
        if (combos.length == 0) return;
        this.findCombo = this.findCombo.concat(combos);
        this._animeFadingCombo(combos, 0, 500);
    };
};

// Define AI
var AlphaMou = function (board, elem) {
    // this elem is to display resulting game board
    // the board should be already assigned an elem to display original game board
    this._board = board;
    this._enableSkew = false;
    this._dirs = 8;
    this._finalBoard = new Board(elem, board._cloneBoard());

    if (!this._enableSkew) this._dirs = 4;

    this._simulateTillEnd = function (copyBoard) {
        // return combos
        let allCombos = [],
            count = 0;
        do {
            let combos = copyBoard.dropDown(true);
            if (combos.length == 0) break;
            allCombos = allCombos.concat(combos);
            count++;
            // console.log(
            //     `${count}th ${combos.length} combos ${allCombos.length} all combos`
            // );
        } while (true);
        return allCombos;
    };

    this._checkSameBoard = function (board1, board2) {
        // assume board size fixed to 6x5
        for (let x = 0; x < 6; ++x) {
            for (let y = 0; y < 5; ++y) {
                if (board1._board[x][y] != board2._board[x][y]) return false;
            }
        }
        return true;
    };

    this._checkDuplicate = function (boardQue, board1) {
        for (let i = 0; i < boardQue.length; ++i) {
            if (this._checkSameBoard(board1, boardQue[i])) return true;
        }
        return false;
    };

    this._getBoardScore = function (board1) {
        // can be highly customize
        // determine the order that BoardQue pops
        // higher is better(return value)
        let copyBoard = new Board(undefined, board1._cloneBoard());
        let combos = this._simulateTillEnd(copyBoard);
        // in the situation that have same combos shorter moves is desirable
        return combos.length; //+ copyBoard.getBlankNum(); // * 50 - board1.moves;
    };

    this._popBoardQue = function (boardQue) {
        let popBoard = undefined,
            maxi = -0xfffffffff;
        boardQue.forEach((board1) => {
            if (board1.score > maxi && !board1.spanned) {
                popBoard = board1;
                maxi = board1.score;
            }
        });
        return popBoard;
    };

    this.findPath = function (queBound = 5000) {
        // find a path to approximate the best estimation
        // best first search with moves restriction
        // starting point can be specifyed (default from 0,0)

        // init board queue
        let boardQue = [];
        this._board.moves = 0;
        this._board.score = this._getBoardScore(this._board);
        boardQue.push(this._board);

        // best first search
        while (true) {
            // passing by reference
            let currentBoard = this._popBoardQue(boardQue);
            if (currentBoard == undefined || boardQue.length >= queBound) break;
            let x = currentBoard.posi[0],
                y = currentBoard.posi[1];

            for (let dir = 0; dir < this._dirs; ++dir) {
                let copyBoard = new Board(
                    undefined,
                    currentBoard._cloneBoard()
                );
                let newPosi = copyBoard.swap(x, y, dir);
                // check if move valid
                if (newPosi) {
                    // if (this._checkDuplicate(boardQue, copyBoard)) {
                    //     console.log('duplicate');
                    //     continue;
                    // }
                    if (
                        currentBoard.father != undefined &&
                        currentBoard.father.posi[0] == newPosi[0] &&
                        currentBoard.father.posi[1] == newPosi[1]
                    )
                        continue;
                    copyBoard.posi = newPosi;
                    copyBoard.moves = currentBoard.moves + 1;
                    copyBoard.father = currentBoard; // linking reference
                    copyBoard.score = this._getBoardScore(copyBoard);
                    boardQue.push(copyBoard);
                }
            }
            //console.log(boardQue);
            currentBoard.spanned = true;
        }

        // find max score board from boardQue
        let winnerBoard = undefined,
            maxi = -1;
        boardQue.forEach((board1) => {
            if (board1.score > maxi) {
                maxi = board1.score;
                winnerBoard = board1;
            }
        });

        // trace path
        let path = [winnerBoard.posi],
            father = winnerBoard.father;
        while (father != undefined) {
            path.push(father.posi);
            father = father.father;
        }
        path.reverse();

        // replacing
        //this._finalBoard = new Board(elem, this._board._cloneBoard());
        this._finalBoard.moves = winnerBoard.moves;
        this._finalBoard.score = maxi;

        return path;
    };

    this.render = function (path) {
        this._board.renderPath(path);
        this._finalBoard.render();
        this._finalBoard.runPath(path);
    };
};
