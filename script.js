const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("messageOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");

let score = 0;
let lives = 3;
let level = 1;
let gameRunning = false;

// الكرة
let x = canvas.width / 2;
let y = canvas.height - 40;
let dx = 4;
let dy = -4;
const ballRadius = 9;

// المضرب
const paddleHeight = 14;
const paddleWidth = 90;
let paddleX = (canvas.width - paddleWidth) / 2;

let rightPressed = false;
let leftPressed = false;

// أحداث التحكم
document.addEventListener("keydown", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
    else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
    else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
});

document.addEventListener("mousemove", (e) => {
    let relativeX = e.clientX - canvas.getBoundingClientRect().left;
    if (relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth / 2;
    }
});

canvas.addEventListener("touchmove", (e) => {
    let touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
    if (touchX > 0 && touchX < canvas.width) {
        paddleX = touchX - paddleWidth / 2;
    }
    e.preventDefault();
}, { passive: false });

// الطوب
const brickRowCount = 5;
const brickColumnCount = 7;
const brickWidth = 72;
const brickHeight = 22;
const brickPadding = 10;
const brickOffsetTop = 35;
const brickOffsetLeft = 27;

let bricks = [];
function initBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 1, colorIndex: r };
        }
    }
}
initBricks();

function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            let b = bricks[c][r];
            if (b.status === 1) {
                if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                    dy = -dy;
                    b.status = 0;
                    score += 10 * level;
                    scoreEl.innerText = score;
                    
                    // تحقق من الفوز بالمستوى
                    if (checkWin()) {
                        level++;
                        levelEl.innerText = level;
                        dx *= 1.1;
                        dy *= 1.1;
                        resetBallAndPaddle();
                        initBricks();
                        if (level > 3) {
                            gameRunning = false;
                            showOverlay("أنت بطل أسطوري! فزت بكل المستويات!", "إعادة اللعب");
                        }
                    }
                }
            }
        }
    }
}

function checkWin() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) return false;
        }
    }
    return true;
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ff4757";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff4757";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.roundRect(paddleX, canvas.height - paddleHeight - 8, paddleWidth, paddleHeight, 6);
    ctx.fillStyle = "#2ed573";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#2ed573";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();
}

const brickColors = ["#ff4757", "#ffa502", "#2ed573", "#1e90ff", "#9b59b6"];

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();
                ctx.roundRect(brickX, brickY, brickWidth, brickHeight, 4);
                ctx.fillStyle = brickColors[r % brickColors.length];
                ctx.fill();
                ctx.strokeStyle = "rgba(255,255,255,0.2)";
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.closePath();
            }
        }
    }
}

function draw() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawBall();
    drawPaddle();
    collisionDetection();

    // حواف الجدران
    if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
        dx = -dx;
    }
    if (y + dy < ballRadius) {
        dy = -dy;
    } else if (y + dy > canvas.height - ballRadius - 5) {
        if (x > paddleX && x < paddleX + paddleWidth) {
            let hitPoint = x - (paddleX + paddleWidth / 2);
            dx = hitPoint * 0.15;
            dy = -Math.abs(dy);
        } else {
            lives--;
            livesEl.innerText = lives;
            if (!lives) {
                gameRunning = false;
                showOverlay("انتهت اللعبة! حظ أوفر في المرة القادمة", "حاول مجدداً");
                return;
            } else {
                resetBallAndPaddle();
            }
        }
    }

    if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX += 7;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= 7;
    }

    x += dx;
    y += dy;
    requestAnimationFrame(draw);
}

function resetBallAndPaddle() {
    x = canvas.width / 2;
    y = canvas.height - 40;
    dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    dy = -4;
    paddleX = (canvas.width - paddleWidth) / 2;
}

function showOverlay(title, btnText) {
    overlayTitle.innerText = title;
    overlayText.innerText = `النقاط النهائية: ${score}`;
    startBtn.innerText = btnText;
    overlay.classList.remove("hidden");
}

startBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    score = 0;
    lives = 3;
    level = 1;
    dx = 4;
    dy = -4;
    scoreEl.innerText = score;
    livesEl.innerText = lives;
    levelEl.innerText = level;
    initBricks();
    resetBallAndPaddle();
    gameRunning = true;
    draw();
});

showOverlay("لعبة تكسير الطوب الملحمية", "ابدأ اللعب الآن");
