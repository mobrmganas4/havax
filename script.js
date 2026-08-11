// --- كود الفحص الذكي لتحديثات الجيت هاب في التطبيق ---
if (navigator.onLine) {
    console.log("متصل بالإنترنت، يتم التحقق من تحديثات الموقع...");
    fetch('https://mobrmganas4.github.io/havax/')
        .then(response => {
            if (response.ok) {
                console.log("الموقع يعمل بكفاءة وجاهز للتحديث الفوري.");
            }
        })
        .catch(err => console.log("يعمل بالوضع المحلي أوفلاين."));
}

const homeScreen = document.getElementById("homeScreen");
const levelMenuScreen = document.getElementById("levelMenuScreen");
const gameScreen = document.getElementById("gameScreen");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const currentModeTitle = document.getElementById("currentModeTitle");
const overlay = document.getElementById("messageOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");

let score = 0;
let lives = 3;
let currentDifficulty = 1; 
let gameRunning = false;
let animationFrameId = null;

const speeds = {
    1: { dx: 3, dy: -3 }, 
    2: { dx: 5, dy: -5 }, 
    3: { dx: 7, dy: -7 }, 
    4: { dx: 10, dy: -10 } 
};

const modeNames = {
    1: "القسم السهل",
    2: "القسم المتوسط",
    3: "القسم الصعب",
    4: "الصعب جداً (المستحيل)"
};

let x = canvas.width / 2;
let y = canvas.height - 40;
let dx = 3;
let dy = -3;
const ballRadius = 9;

const paddleHeight = 14;
const paddleWidth = 90;
let paddleX = (canvas.width - paddleWidth) / 2;

let rightPressed = false;
let leftPressed = false;

function openGameMenu() {
    homeScreen.classList.add("hidden");
    levelMenuScreen.classList.remove("hidden");
}

function backToHome() {
    levelMenuScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
}

function backToMenu() {
    gameRunning = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameScreen.classList.add("hidden");
    levelMenuScreen.classList.remove("hidden");
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
    else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
    else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
});

// دالة دقيقة جداً لتصحيح إحداثيات اللمس والماوس على الشاشات المختلفة
function getCanvasTouchPos(e) {
    let rect = canvas.getBoundingClientRect();
    let clientX = e.clientX || (e.touches && e.touches[0].clientX);
    let scaleX = canvas.width / rect.width;
    return (clientX - rect.left) * scaleX;
}

document.addEventListener("mousemove", (e) => {
    let relativeX = getCanvasTouchPos(e);
    if (!isNaN(relativeX)) {
        paddleX = relativeX - paddleWidth / 2;
        if (paddleX < 0) paddleX = 0;
        if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
    }
});

canvas.addEventListener("touchmove", (e) => {
    let touchX = getCanvasTouchPos(e);
    if (!isNaN(touchX)) {
        paddleX = touchX - paddleWidth / 2;
        if (paddleX < 0) paddleX = 0;
        if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
    }
    e.preventDefault();
}, { passive: false });

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
            bricks[c][r] = { x: 0, y: 0, status: 1 };
        }
    }
}

function startGame(diff) {
    currentDifficulty = diff;
    levelMenuScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    currentModeTitle.innerText = modeNames[diff];
    
    score = 0;
    lives = 3;
    scoreEl.innerText = score;
    livesEl.innerText = lives;

    initBricks();
    resetBallAndPaddle();
    showOverlay(modeNames[diff], "ابدأ اللعب الآن");
}

function resetBallAndPaddle() {
    x = canvas.width / 2;
    y = canvas.height - 40;
    const baseSpeed = speeds[currentDifficulty];
    dx = baseSpeed.dx * (Math.random() > 0.5 ? 1 : -1);
    dy = baseSpeed.dy;
    paddleX = (canvas.width - paddleWidth) / 2;
}

function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            let b = bricks[c][r];
            if (b.status === 1) {
                if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                    dy = -dy;
                    b.status = 0;
                    score += 10 * currentDifficulty;
                    scoreEl.innerText = score;
                    
                    if (checkWin()) {
                        gameRunning = false;
                        showOverlay("أنت بطل أسطوري! فزت بكل الطوب!", "إعادة اللعب");
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
            if (lives <= 0) {
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
    animationFrameId = requestAnimationFrame(draw);
}

function showOverlay(title, btnText) {
    overlayTitle.innerText = title;
    overlayText.innerText = `النقاط الحالية: ${score} | الأرواح: ${lives}`;
    startBtn.innerText = btnText;
    overlay.classList.remove("hidden");
}

startBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    score = 0;
    lives = 3;
    scoreEl.innerText = score;
    livesEl.innerText = lives;
    initBricks();
    resetBallAndPaddle();
    gameRunning = true;
    draw();
});
