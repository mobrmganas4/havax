// --- منع سحب الشاشة للأسفل للتحديث نهائياً داخل التطبيق ---
document.addEventListener('touchmove', function (e) {
    if (e.scale !== 1) { return; }
    if (e.target.closest('#gameCanvas')) {
        return;
    }
    e.preventDefault();
}, { passive: false });

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

// نظام تخزين المستويات المفتوحة في الـ Cache (LocalStorage)[span_1](start_span)[span_1](end_span)
let unlockedLevel = localStorage.getItem('samball_unlocked') ? parseInt(localStorage.getItem('samball_unlocked')) : 1;

// سرعات المستويات (المستوى الخامس أسرع بكثير وبشكل جنوني!)[span_2](start_span)[span_2](end_span)
const speeds = {
    1: { dx: 3, dy: -3 }, 
    2: { dx: 5, dy: -5 }, 
    3: { dx: 7, dy: -7 }, 
    4: { dx: 10, dy: -10 },
    5: { dx: 16, dy: -16 } // سرعة خارقة ومستحيلة للمستوى الأخير[span_3](start_span)[span_3](end_span)
};

const modeNames = {
    1: "القسم السهل",
    2: "القسم المتوسط",
    3: "القسم الصعب",
    4: "الصعب جداً",
    5: "المستوى المستحيل (اكسب 100$ 💵)"
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
    updateLevelButtons();
}

function backToHome() {
    levelMenuScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
}

// تحديث واجهة أزرار المستويات (إظهار الأقفال للمستويات المغلقة)[span_4](start_span)[span_4](end_span)
function updateLevelButtons() {
    for (let i = 1; i <= 5; i++) {
        let btn = document.getElementById(`btn-level-${i}`);
        if (!btn) {
            createLevelButtonInDom(i);
            btn = document.getElementById(`btn-level-${i}`);
        }
        if (btn) {
            if (i <= unlockedLevel) {
                btn.classList.remove("locked");
                let lockIcon = btn.querySelector(".lock-icon");
                if (lockIcon) lockIcon.style.display = "none";
            } else {
                btn.classList.add("locked");
            }
        }
    }
}

function createLevelButtonInDom(i) {
    let container = document.querySelector(".difficulty-buttons");
    if (!container) return;
    if (document.getElementById(`btn-level-${i}`)) return;

    let btn = document.createElement("button");
    btn.className = `diff-btn ${i === 5 ? 'impossible' : (i === 4 ? 'extreme' : (i === 3 ? 'hard' : (i === 2 ? 'medium' : 'easy')))}`;
    btn.id = `btn-level-${i}`;
    btn.onclick = () => selectLevel(i);
    
    let titleText = i === 5 ? "المستوى المستحيل (اكسب 100$ 💵) <span class='lock-icon'>🔒</span>" : (i === 4 ? "الصعب جداً 🔴 <span class='lock-icon'>🔒</span>" : (i === 3 ? "القسم الصعب 🟠 <span class='lock-icon'>🔒</span>" : (i === 2 ? "القسم المتوسط 🟡 <span class='lock-icon'>🔒</span>" : "القسم السهل 🟢")));
    let descText = i === 5 ? "صعب جنوني وسريع جداً! (مقلب الـ 100$ 😂)" : "تحدي جديد وسرعة أعلى";
    
    btn.innerHTML = `
        <span class="diff-title">${titleText}</span>
        <span class="diff-desc">${descText}</span>
    `;
    container.appendChild(btn);
}

function selectLevel(diff) {
    if (diff > unlockedLevel) {
        alert("🔒 هذا المستوى مقفل! يجب عليك إنهاء المستويات السابقة أولاً لتفتحه.");
        return;
    }

    if (diff === 5) {
        alert("⚠️ تحذير: هذا المستوى مستحيل بجنون والكرة تطير بسرعة البرق! إذا فزت (وده استحالة) هتاخد الـ 100$ (كذب طبعا 😂). بالتوفيق يا أسطورة!");
    }

    startGame(diff);
}

function backToMenu() {
    gameRunning = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    gameScreen.classList.add("hidden");
    levelMenuScreen.classList.remove("hidden");
    updateLevelButtons();
    
    overlay.classList.add("hidden");
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
    else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
    else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
});

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
                        
                        if (currentDifficulty >= unlockedLevel && unlockedLevel < 5) {
                            unlockedLevel = currentDifficulty + 1;
                            localStorage.setItem('samball_unlocked', unlockedLevel); //[span_5](start_span)[span_5](end_span)
                        }

                        showOverlay("أنت بطل أسطوري! فزت بكل الطوب!", "المستوى التالي / إعادة");
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
    ctx.fillStyle = currentDifficulty === 5 ? "#ffd700" : "#ff4757";
    ctx.shadowBlur = 10;
    ctx.shadowColor = currentDifficulty === 5 ? "#ffd700" : "#ff4757";
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
        paddleX += 8;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= 8;
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

document.addEventListener("DOMContentLoaded", () => {
    updateLevelButtons();
});
