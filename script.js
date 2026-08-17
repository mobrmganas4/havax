// --- منع سحب الشاشة للأسفل للتحديث نهائياً داخل التطبيق ---
document.addEventListener('touchmove', function (e) {
    if (e.scale !== 1) { return; }
    if (e.target.closest('#gameCanvas')) {
        return;
    }
    e.preventDefault();
}, { passive: false });

// العناصر الرئيسية للواجهات
const homeScreen = document.getElementById("homeScreen");
const levelMenuScreen = document.getElementById("levelMenuScreen");
const gameScreen = document.getElementById("gameScreen");
const shopScreen = document.getElementById("shopScreen");
const prankScreen = document.getElementById("prankScreen");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const coinsEl = document.getElementById("coins");
const shopCoinsEl = document.getElementById("shopCoins");
const currentModeTitle = document.getElementById("currentModeTitle");

const overlay = document.getElementById("messageOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");

let score = 0;
let lives = 3;
let coins = localStorage.getItem('samball_coins') ? parseInt(localStorage.getItem('samball_coins')) : 0;
let currentDifficulty = 1; 
let gameRunning = false;
let animationFrameId = null;

// نظام المستويات المفتوحة
let unlockedLevel = localStorage.getItem('samball_unlocked') ? parseInt(localStorage.getItem('samball_unlocked')) : 1;

// نظام كرات المتجر
let equippedBall = localStorage.getItem('samball_ball') || 'default';
let ownedBalls = JSON.parse(localStorage.getItem('samball_owned_balls')) || ['default'];

// سرعات المستويات[span_0](start_span)[span_0](end_span)
const speeds = {
    1: { dx: 3, dy: -3 }, 
    2: { dx: 5, dy: -5 }, 
    3: { dx: 7, dy: -7 }, 
    4: { dx: 10, dy: -10 },
    5: { dx: 100, dy: -100 } // المستوى المستحيل[span_1](start_span)[span_1](end_span)
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

// --- التنقل بين الشاشات ---
function openGameMenu() {
    homeScreen.classList.add("hidden");
    levelMenuScreen.classList.remove("hidden");
    updateLevelButtons();
}

function backToHome() {
    levelMenuScreen.classList.add("hidden");
    shopScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
}

function openShop() {
    homeScreen.classList.add("hidden");
    shopScreen.classList.remove("hidden");
    updateShopUI();
}

// --- نظام المتجر والعملات ---
function updateCoinsDisplay() {
    if (coinsEl) coinsEl.innerText = coins;
    if (shopCoinsEl) shopCoinsEl.innerText = coins;
    localStorage.setItem('samball_coins', coins);
}

function updateShopUI() {
    updateCoinsDisplay();
    
    // التحديث البصري لأزرار المتجر
    ['default', 'fire', 'neon'].forEach(ballType => {
        const btn = document.getElementById(`buy-btn-${ballType}`);
        if (!btn) return;

        if (equippedBall === ballType) {
            btn.innerText = "مُجهز حالياً";
            btn.className = "shop-btn equipped";
        } else if (ownedBalls.includes(ballType)) {
            btn.innerText = "تجهيز";
            btn.className = "shop-btn";
            btn.onclick = () => equipBall(ballType);
        } else {
            btn.className = "shop-btn";
        }
    });
}

function buyBall(ballType, price) {
    if (ownedBalls.includes(ballType)) {
        equipBall(ballType);
        return;
    }

    if (coins >= price) {
        coins -= price;
        ownedBalls.push(ballType);
        equippedBall = ballType;
        
        localStorage.setItem('samball_owned_balls', JSON.stringify(ownedBalls));
        localStorage.setItem('samball_ball', equippedBall);
        
        updateShopUI();
        alert("🎉 تم الشراء والتجهيز بنجاح!");
    } else {
        alert("❌ لا تمتلك نقاط كافية للشراء!");
    }
}

function equipBall(ballType) {
    if (ownedBalls.includes(ballType)) {
        equippedBall = ballType;
        localStorage.setItem('samball_ball', equippedBall);
        updateShopUI();
    }
}

// --- أزرار المستويات ---
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
        alert("⚠️ تحذير: هذا المستوى مستحيل بجنون والكرة بسرعة 100! إذا فزت هتاخد الـ 100$ بجد (وده مش هيحصل أبداً 😂). بالتوفيق يا أسطورة!");
    }

    startGame(diff);
}

function backToMenu() {
    gameRunning = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    gameScreen.classList.add("hidden");
    prankScreen.classList.add("hidden");
    levelMenuScreen.classList.remove("hidden");
    updateLevelButtons();
    
    overlay.classList.add("hidden");
}

// --- التحكم بالحركة ---
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
        let targetPaddleX = relativeX - paddleWidth / 2;
        if (currentDifficulty === 5) {
            paddleX += (targetPaddleX - paddleX) * 0.15; 
        } else {
            paddleX = targetPaddleX;
        }
        if (paddleX < 0) paddleX = 0;
        if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
    }
});

canvas.addEventListener("touchmove", (e) => {
    let touchX = getCanvasTouchPos(e);
    if (!isNaN(touchX)) {
        let targetPaddleX = touchX - paddleWidth / 2;
        if (currentDifficulty === 5) {
            paddleX += (targetPaddleX - paddleX) * 0.15; 
        } else {
            paddleX = targetPaddleX;
        }
        if (paddleX < 0) paddleX = 0;
        if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
    }
    e.preventDefault();
}, { passive: false });

// --- منطق اللعبة ---
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
    updateCoinsDisplay();

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
                    
                    // زيادة النقاط والعملات
                    let addedScore = 10 * currentDifficulty;
                    score += addedScore;
                    coins += currentDifficulty; // إضافة عملة مع كل طوبة
                    
                    scoreEl.innerText = score;
                    updateCoinsDisplay();
                    
                    if (checkWin()) {
                        gameRunning = false;
                        
                        if (currentDifficulty >= unlockedLevel && unlockedLevel < 5) {
                            unlockedLevel = currentDifficulty + 1;
                            localStorage.setItem('samball_unlocked', unlockedLevel);
                        }

                        if (currentDifficulty === 5) {
                            showPrankScreen(); // إظهار شاشة المقلب عند الفوز بالـ 100$
                        } else {
                            showOverlay("أنت بطل أسطوري! فزت بكل الطوب!", "المستوى التالي / إعادة");
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

// رسم الكرة بناءً على نوع المظهر من المتجر
function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    
    if (equippedBall === 'fire') {
        ctx.fillStyle = "#ff7f50";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ffa502";
    } else if (equippedBall === 'neon') {
        ctx.fillStyle = "#00f2fe";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00f2fe";
    } else {
        ctx.fillStyle = currentDifficulty === 5 ? "#ffd700" : "#ff4757";
        ctx.shadowBlur = 10;
        ctx.shadowColor = currentDifficulty === 5 ? "#ffd700" : "#ff4757";
    }

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
                showOverlay("انتهت اللعبة! مع السلامة الـ 100$ 😂", "حاول مجدداً");
                return;
            } else {
                resetBallAndPaddle();
            }
        }
    }

    let keyboardPaddleSpeed = currentDifficulty === 5 ? 3 : 8;

    if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX += keyboardPaddleSpeed;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= keyboardPaddleSpeed;
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

function showPrankScreen() {
    gameScreen.classList.add("hidden");
    prankScreen.classList.remove("hidden");
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
    updateCoinsDisplay();
});
