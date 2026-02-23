// ============================
// AUDIO SETUP
// ============================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgmInterval;
let isMusicMuted = false;
let currentDifficulty = 'EASY';
let isPVP = false;
let hellTemperature = Math.floor(Math.random() * 3) + 3;

// ============================
// GAME DATA
// ============================
const scoringRules = {
    ones: "Count and add only the dice with the face '1'.",
    twos: "Count and add only the dice with the face '2'.",
    threes: "Count and add only the dice with the face '3'.",
    fours: "Count and add only the dice with the face '4'.",
    fives: "Count and add only the dice with the face '5'.",
    sixes: "Count and add only the dice with the face '6'.",
    threeKind: "Score the total sum of all 5 dice if at least 3 dice match.",
    fourKind: "Score the total sum of all 5 dice if at least 4 dice match.",
    fullHouse: "Score 25 points for 3 of one kind and 2 of another.",
    smStraight: "Score 30 points for a sequence of 4 consecutive dice.",
    lgStraight: "Score 40 points for a sequence of 5 consecutive dice.",
    yatzy: "Score 50 points if all 5 dice match."
};

const diceImages = {
    1: 'icons/dice_1.png', 2: 'icons/dice_2.png', 3: 'icons/dice_3.png',
    4: 'icons/dice_4.png', 5: 'icons/dice_5.png', 6: 'icons/dice_6.png'
};

const categoryConfig = {
    ones: { img: diceImages[1], label: 'Ones' },
    twos: { img: diceImages[2], label: 'Twos' },
    threes: { img: diceImages[3], label: 'Threes' },
    fours: { img: diceImages[4], label: 'Fours' },
    fives: { img: diceImages[5], label: 'Fives' },
    sixes: { img: diceImages[6], label: 'Sixes' },
    threeKind: { icon: '3x', label: '3 of a Kind' },
    fourKind: { icon: '4x', label: '4 of a Kind' },
    fullHouse: { icon: 'H', label: 'House' },
    smStraight: { icon: 'S', label: 'Small' },
    lgStraight: { icon: 'L', label: 'Large' },
    yatzy: { icon: 'YZ', label: 'Yatzy' }
};

const categories = Object.keys(categoryConfig);
let dice = [1, 2, 3, 4, 5];
let locked = [false, false, false, false, false];
let rollsLeft = 3;
let isPlayerTurn = true;
let playerScores = {};
let botScores = {};

// ============================
// MOUSE TRAIL (desktop only)
// ============================
const isTouchDevice = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

let dots = [];
if (!isTouchDevice()) {
    for (let i = 0; i < 28; i++) {
        const node = document.createElement("div");
        node.className = "trail";
        document.body.appendChild(node);
        dots.push(node);
    }
}

let currentDot = 0;

if (dots.length > 0) {
    addEventListener("mousemove", function (event) {
        const dot = dots[currentDot];
        dot.style.left = (event.clientX - 10) + "px";
        dot.style.top = (event.clientY - 10) + "px";
        currentDot = (currentDot + 1) % dots.length;
    });

    addEventListener("mousedown", function (event) {
        const radius = 30;
        for (let i = 0; i < dots.length; i++) {
            const angle = (i / dots.length) * 2 * Math.PI;
            dots[i].style.left = (event.clientX + Math.cos(angle) * radius - 10) + "px";
            dots[i].style.top = (event.clientY + Math.sin(angle) * radius - 10) + "px";
        }
    });
}

// ============================
// LOBBY / MENU
// ============================
function toggleLobbyView(showDifficulty) {
    const mainMenu = document.getElementById('main-menu');
    const diffMenu = document.getElementById('difficulty-menu');
    if (showDifficulty) {
        mainMenu.classList.add('hidden');
        diffMenu.classList.remove('hidden');
    } else {
        mainMenu.classList.remove('hidden');
        diffMenu.classList.add('hidden');
    }
}

// ============================
// SCORE INFO MODAL
// ============================
function showScoreInfo(id) {
    const modal = document.getElementById('score-info-modal');
    document.getElementById('score-info-title').textContent = categoryConfig[id].label;
    document.getElementById('score-info-desc').textContent = scoringRules[id];
    modal.style.display = 'flex';
}

// ============================
// MUTE
// ============================
function toggleMute() {
    isMusicMuted = !isMusicMuted;
    const btn = document.getElementById('mute-btn');
    btn.textContent = isMusicMuted ? "UNMUTE" : "MUTE MUSIC";
    btn.style.background = isMusicMuted ? "#95a5a6" : "var(--info)";
}

// ============================
// HELL MODAL
// ============================
function showHellLevelModal(level) {
    const modal = document.getElementById('hell-notification-modal');
    document.getElementById('hell-level-text').textContent = `THAT WAS A HELL MODE LEVEL ${level}`;
    modal.style.display = 'flex';
}

function closeHellModal() {
    document.getElementById('hell-notification-modal').style.display = 'none';
}

// ============================
// AUDIO
// ============================
function playSound(type) {
    if (type === 'win') { new Audio('sfx/win.mp3').play().catch(() => { }); return; }
    if (type === 'lose') { new Audio('sfx/lose.mp3').play().catch(() => { }); return; }
    if (type === 'tie') { new Audio('sfx/tie.mp3').play().catch(() => { }); return; }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'roll') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        osc.start(); osc.stop(now + 0.1);
    } else if (type === 'lock') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
    } else if (type === 'score') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.exponentialRampToValueAtTime(1046, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        osc.start(); osc.stop(now + 0.3);
    }
}

function startBGM() {
    if (bgmInterval) return;
    let tempo;
    switch (currentDifficulty) {
        case 'EASY': tempo = 450; break;
        case 'MEDIUM': tempo = 350; break;
        case 'HARD': tempo = 250; break;
        case 'HELL': tempo = 150; break;
        default: tempo = 450;
    }
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 349.23, 329.63, 293.66];
    let step = 0;
    bgmInterval = setInterval(() => {
        if (isMusicMuted) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(notes[step % notes.length], audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
        step++;
    }, tempo);
}

function playVictoryMusic() { playSound('win'); }
function playLossMusic() { playSound('lose'); }
function playTieMusic() { playSound('tie'); }

// ============================
// MODALS
// ============================
function toggleInfo() {
    const modal = document.getElementById('info-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function toggleResetModal() {
    const modal = document.getElementById('reset-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function showTurnModal(isP1) {
    const modal = document.getElementById('turn-modal');
    const content = document.getElementById('turn-modal-text');
    if (isPVP) {
        content.textContent = isP1 ? "PLAYER 1" : "PLAYER 2";
        content.className = `turn-modal-content ${isP1 ? 'player-modal-bg' : 'p2-modal-bg'}`;
    } else {
        content.textContent = isP1 ? "YOUR TURN" : (currentDifficulty === 'HELL' ? "HELL'S TURN" : "BOT'S TURN");
        content.className = `turn-modal-content ${isP1 ? 'player-modal-bg' : (currentDifficulty === 'HELL' ? 'hell-modal-bg' : 'bot-modal-bg')}`;
    }
    modal.style.display = 'flex';
    setTimeout(() => { modal.style.display = 'none'; }, 1200);
}

// ============================
// DICE RENDERING
// ============================
function renderDice() {
    const container = document.getElementById('dice-container');
    container.innerHTML = '';
    dice.forEach((val, i) => {
        const dieDiv = document.createElement('div');
        dieDiv.className = `die ${locked[i] ? 'locked' : ''}`;
        dieDiv.innerHTML = `<img src="${diceImages[val]}" alt="${val}">`;
        dieDiv.onclick = () => {
            if ((isPVP || isPlayerTurn) && rollsLeft < 3 && rollsLeft > 0) {
                locked[i] = !locked[i];
                playSound('lock');
                renderDice();
            }
        };
        container.appendChild(dieDiv);
    });
}

// ============================
// START GAME
// ============================
function startGame(diff) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    currentDifficulty = diff;
    isPVP = (diff === 'PVP');
    isPlayerTurn = Math.random() < 0.5;
    hellTemperature = Math.floor(Math.random() * 3) + 3;

    if (currentDifficulty === 'HELL') showHellLevelModal(hellTemperature);

    document.body.className = diff.toLowerCase();

    let trailColor, glowColor;
    switch (diff) {
        case 'EASY':
            trailColor = 'rgba(46, 204, 113, 0.3)'; glowColor = 'rgba(46, 204, 113, 0.6)'; break;
        case 'MEDIUM':
            trailColor = 'rgba(52, 152, 219, 0.3)'; glowColor = 'rgba(52, 152, 219, 0.6)'; break;
        case 'HARD':
            trailColor = 'rgba(243, 156, 18, 0.3)'; glowColor = 'rgba(243, 156, 18, 0.6)'; break;
        case 'HELL':
            trailColor = 'rgba(180, 0, 0, 0.4)'; glowColor = 'rgba(255, 0, 0, 0.8)'; break;
        case 'PVP':
            trailColor = 'rgba(155, 89, 182, 0.3)'; glowColor = 'rgba(155, 89, 182, 0.6)'; break;
        default:
            trailColor = 'rgba(57, 255, 20, 0.3)'; glowColor = 'rgba(57, 255, 20, 0.6)';
    }

    if (dots.length > 0) {
        dots.forEach(dot => {
            dot.style.backgroundColor = trailColor;
            dot.style.boxShadow = `0 0 15px ${glowColor}`;
        });
    }

    // Difficulty display
    const diffEl = document.getElementById('difficulty-display');
    if (diffEl) diffEl.textContent = diff === 'PVP' ? 'PVP MODE' : diff;

    // PVP label
    const p2label = document.getElementById('p2-label');
    if (isPVP) {
        document.getElementById('p1-label').innerHTML = 'P1: <span id="p-total">0</span>';
        p2label.innerHTML = 'P2: <span id="b-total">0</span>';
    } else {
        document.getElementById('p1-label').innerHTML = 'YOU: <span id="p-total">0</span>';
        p2label.innerHTML = 'BOT: <span id="b-total">0</span>';
    }

    // Hell fire
    if (diff === 'HELL') {
        const canvas = document.getElementById('fire-canvas');
        canvas.style.display = 'block';
        initFireAnimation();
    } else {
        stopFireAnimation();
        const canvas = document.getElementById('fire-canvas');
        canvas.style.display = 'none';
    }

    document.getElementById('lobby').style.display = 'none';
    initScoreboard();
    renderDice();
    startBGM();

    document.getElementById('turn-banner').textContent = isPlayerTurn ? (isPVP ? "PLAYER 1 TURN" : "YOUR TURN") : (currentDifficulty === 'HELL' ? "HELL IS THINKING..." : "BOT IS THINKING...");
    document.getElementById('turn-banner').className = `turn-indicator ${isPlayerTurn ? 'player-turn' : (currentDifficulty === 'HELL' ? 'hell-turn' : 'bot-turn')}`;

    if (!isPlayerTurn && !isPVP) {
        document.getElementById('roll-btn').disabled = true;
        setTimeout(botTurn, 1000);
    }

    showTurnModal(isPlayerTurn);
}

document.getElementById('roll-btn').onclick = async () => {
    if (rollsLeft > 0) await performRoll();
};

// ============================
// SCORING
// ============================
function calculateScore(diceArr, id) {
    const counts = {};
    diceArr.forEach(d => counts[d] = (counts[d] || 0) + 1);
    const sum = diceArr.reduce((a, b) => a + b, 0);
    const vals = Object.values(counts);
    const unique = [...new Set(diceArr)].sort();
    const checkStr = (arr, len) => {
        let max = 1, cur = 1;
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i + 1] === arr[i] + 1) { cur++; max = Math.max(max, cur); }
            else if (arr[i + 1] !== arr[i]) { cur = 1; }
        }
        return max >= len;
    };
    switch (id) {
        case 'ones': return (counts[1] || 0) * 1;
        case 'twos': return (counts[2] || 0) * 2;
        case 'threes': return (counts[3] || 0) * 3;
        case 'fours': return (counts[4] || 0) * 4;
        case 'fives': return (counts[5] || 0) * 5;
        case 'sixes': return (counts[6] || 0) * 6;
        case 'threeKind': return vals.some(v => v >= 3) ? sum : 0;
        case 'fourKind': return vals.some(v => v >= 4) ? sum : 0;
        case 'fullHouse': return (vals.includes(3) && vals.includes(2)) ? 25 : 0;
        case 'smStraight': return checkStr(unique, 4) ? 30 : 0;
        case 'lgStraight': return checkStr(unique, 5) ? 40 : 0;
        case 'yatzy': return vals.includes(5) ? 50 : 0;
        default: return 0;
    }
}

function updatePotentials() {
    categories.forEach(id => {
        if (isPlayerTurn) {
            if (playerScores[id] === undefined) {
                const el = document.getElementById(`p-${id}`);
                el.textContent = calculateScore(dice, id);
                el.className = 'player-score potential';
            }
        } else if (isPVP) {
            if (botScores[id] === undefined) {
                const el = document.getElementById(`b-${id}`);
                el.textContent = calculateScore(dice, id);
                el.className = 'bot-score potential pvp-p2-score';
            }
        }
    });
}

function endTurn() {
    const p1Total = Object.values(playerScores).reduce((a, b) => a + b, 0);
    const p2Total = Object.values(botScores).reduce((a, b) => a + b, 0);
    document.getElementById('p-total').textContent = p1Total;
    document.getElementById('b-total').textContent = p2Total;
    if (Object.keys(playerScores).length === categories.length && Object.keys(botScores).length === categories.length) {
        showResult();
        return;
    }
    isPlayerTurn = !isPlayerTurn;
    resetTurnUI();
    showTurnModal(isPlayerTurn);
    if (!isPlayerTurn && !isPVP) {
        document.getElementById('roll-btn').disabled = true;
        setTimeout(botTurn, 1000);
    } else {
        document.getElementById('roll-btn').disabled = false;
    }
}

function resetTurnUI() {
    rollsLeft = 3;
    locked = [false, false, false, false, false];
    document.getElementById('rolls-left').textContent = 3;
    const banner = document.getElementById('turn-banner');
    if (isPVP) {
        banner.textContent = isPlayerTurn ? "PLAYER 1 TURN" : "PLAYER 2 TURN";
        banner.className = `turn-indicator ${isPlayerTurn ? 'player-turn' : 'p2-turn'}`;
    } else {
        banner.textContent = isPlayerTurn ? "YOUR TURN" : (currentDifficulty === 'HELL' ? "HELL IS THINKING..." : "BOT IS THINKING...");
        banner.className = `turn-indicator ${isPlayerTurn ? 'player-turn' : (currentDifficulty === 'HELL' ? 'hell-turn' : 'bot-turn')}`;
    }
    document.querySelectorAll('.potential').forEach(el => {
        el.textContent = '-';
        el.classList.remove('potential');
    });
    renderDice();
}

let hoverTimer = null;

// ============================
// SCOREBOARD
// ============================
function initScoreboard() {
    const container = document.getElementById('score-container');
    container.innerHTML = '';
    categories.forEach(id => {
        const conf = categoryConfig[id];
        const iconHtml = conf.img
            ? `<img src="${conf.img}" class="category-icon">`
            : `<div class="icon-placeholder">${conf.icon}</div>`;
        const item = document.createElement('div');
        item.className = 'score-item';
        item.id = `row-${id}`;
        item.onmouseenter = () => {
            const currentScores = isPlayerTurn ? playerScores : botScores;
            if (currentScores[id] !== undefined) return;
            if (rollsLeft === 3 && (isPVP || isPlayerTurn)) {
                item.classList.add('can-hover');
                hoverTimer = setTimeout(() => showScoreInfo(id), 2000);
            }
        };
        item.onmouseleave = () => {
            item.classList.remove('can-hover');
            if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
        };
        item.onclick = () => playerSelect(id);
        item.innerHTML = `
            <button class="score-btn" id="btn-${id}">
                ${iconHtml} <span>${conf.label}</span>
            </button>
            <div class="score-values">
                <span class="player-score" id="p-${id}">-</span>
                <span class="bot-score" id="b-${id}">-</span>
            </div>`;
        container.appendChild(item);
    });
}

async function playerSelect(id) {
    if (!isPVP && !isPlayerTurn) return;
    const currentScores = isPlayerTurn ? playerScores : botScores;

    if (rollsLeft === 3) {
        if (currentScores[id] !== undefined) return;
        const item = document.getElementById(`row-${id}`);
        if (item) item.classList.add('can-hover');
        await new Promise(res => setTimeout(res, 200));
        await performRoll();
        return;
    }

    if (currentScores[id] !== undefined) return;
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }

    const scoreValue = calculateScore(dice, id);
    currentScores[id] = scoreValue;
    const scorePrefix = isPlayerTurn ? 'p-' : 'b-';
    const scoreElement = document.getElementById(`${scorePrefix}${id}`);
    if (scoreElement) {
        scoreElement.textContent = scoreValue;
        scoreElement.classList.remove('potential');
    }
    const rowEl = document.getElementById(`row-${id}`);
    const btnEl = document.getElementById(`btn-${id}`);
    if (rowEl) rowEl.classList.add('taken');
    if (btnEl) btnEl.style.opacity = '0.4';

    playSound('score');
    endTurn();

    if (isPVP) {
        setTimeout(() => {
            const nextPlayerScores = isPlayerTurn ? playerScores : botScores;
            const row = document.getElementById(`row-${id}`);
            const btn = document.getElementById(`btn-${id}`);
            if (row && btn && nextPlayerScores[id] === undefined) {
                row.classList.remove('taken');
                btn.style.opacity = '1.0';
            }
        }, 10);
    }
}

// ============================
// ROLL
// ============================
async function performRoll() {
    const rollBtn = document.getElementById('roll-btn');
    if (rollsLeft <= 0) return;
    rollBtn.disabled = true;
    rollsLeft--;
    document.getElementById('rolls-left').textContent = rollsLeft;
    const diceEls = document.querySelectorAll('.die');
    diceEls.forEach((el, i) => { if (!locked[i]) el.classList.add('rolling'); });
    let rollsCount = 0;
    const rollInterval = setInterval(() => {
        playSound('roll');
        if (++rollsCount > 5) clearInterval(rollInterval);
    }, 80);
    await new Promise(res => setTimeout(res, 600));

    if (!isPlayerTurn && !isPVP && currentDifficulty === 'HELL') {
        const avail = categories.filter(id => botScores[id] === undefined);
        if (hellTemperature >= 5) {
            let targetDice = [6, 6, 6, 6, 6];
            if (avail.includes('yatzy')) targetDice = [6, 6, 6, 6, 6];
            else if (avail.includes('lgStraight')) targetDice = [1, 2, 3, 4, 5];
            else if (avail.includes('smStraight')) targetDice = [1, 2, 3, 4, 6];
            else if (avail.includes('sixes')) targetDice = [6, 6, 6, 6, 6];
            else if (avail.includes('fives')) targetDice = [5, 5, 5, 5, 5];
            else if (avail.includes('fours')) targetDice = [4, 4, 4, 4, 4];
            else if (avail.includes('threes')) targetDice = [3, 3, 3, 3, 3];
            else if (avail.includes('twos')) targetDice = [2, 2, 2, 2, 2];
            else if (avail.includes('ones')) targetDice = [1, 1, 1, 1, 1];
            else if (avail.includes('fullHouse')) targetDice = [6, 6, 6, 5, 5];
            else if (avail.includes('fourKind')) targetDice = [6, 6, 6, 6, 6];
            else if (avail.includes('threeKind')) targetDice = [6, 6, 6, 6, 6];
            dice = [...targetDice];
            locked.fill(true);
        } else {
            const cheatChance = (hellTemperature - 1) * 0.25;
            dice = dice.map((v, i) => {
                if (locked[i]) return v;
                return Math.random() < cheatChance ? (Math.random() > 0.5 ? 6 : 5) : Math.floor(Math.random() * 6) + 1;
            });
        }
    } else {
        dice = dice.map((v, i) => locked[i] ? v : Math.floor(Math.random() * 6) + 1);
    }

    diceEls.forEach(el => el.classList.remove('rolling'));
    renderDice();
    if (isPVP || isPlayerTurn) {
        updatePotentials();
        if (rollsLeft > 0) rollBtn.disabled = false;
    }
}

// ============================
// BOT LOGIC
// ============================
async function botTurn() {
    if (currentDifficulty === 'HELL' && hellTemperature >= 5) locked.fill(false);
    await performRoll();
    if (currentDifficulty !== 'EASY') {
        for (let r = 0; r < 2; r++) {
            await new Promise(res => setTimeout(res, 800));
            botDecideLocks();
            if (locked.every(l => l)) break;
            await performRoll();
        }
    }
    await new Promise(res => setTimeout(res, 800));
    const avail = categories.filter(id => botScores[id] === undefined);
    let bestCat = null, maxScore = -1;
    avail.forEach(id => {
        let s = calculateScore(dice, id);
        if (currentDifficulty === 'HARD' || currentDifficulty === 'HELL') {
            if (id === 'yatzy' && s > 0) s += 500;
            if (['fours', 'fives', 'sixes'].includes(id)) s += (s * 1.5);
        }
        if (s > maxScore) { maxScore = s; bestCat = id; }
    });
    if (!bestCat) bestCat = avail[0];
    botScores[bestCat] = calculateScore(dice, bestCat);
    const scoreDisplay = document.getElementById(`b-${bestCat}`);
    if (scoreDisplay) scoreDisplay.textContent = botScores[bestCat];
    const row = document.getElementById(`row-${bestCat}`);
    const btn = document.getElementById(`btn-${bestCat}`);
    if (playerScores[bestCat] !== undefined) {
        if (row) row.classList.add('taken');
        if (btn) btn.style.opacity = '0.4';
    }
    setTimeout(() => { playSound('score'); endTurn(); }, 1000);
}

function botDecideLocks() {
    if (currentDifficulty === 'HELL' && hellTemperature >= 5) {
        locked.fill(true); renderDice(); return;
    }
    const counts = {};
    dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
    let bestFace = 1, maxCount = 0;
    for (let face in counts) {
        if (counts[face] > maxCount) { maxCount = counts[face]; bestFace = parseInt(face); }
    }
    if (currentDifficulty === 'HARD' || currentDifficulty === 'HELL') {
        const unique = [...new Set(dice)].sort();
        if (unique.length >= 4) {
            let used = new Set();
            dice.forEach((v, i) => { if (!used.has(v)) { locked[i] = true; used.add(v); } });
            renderDice(); return;
        }
    }
    if (maxCount >= 2) {
        dice.forEach((val, i) => { if (val === bestFace) locked[i] = true; });
    }
    renderDice();
}

// ============================
// RESULT
// ============================
function showResult() {
    clearInterval(bgmInterval);
    const p1Total = Object.values(playerScores).reduce((a, b) => a + b, 0);
    const p2Total = Object.values(botScores).reduce((a, b) => a + b, 0);
    const modal = document.getElementById('result-modal');
    const title = document.getElementById('result-title');
    const overlay = document.getElementById('party-overlay');

    if (p1Total > p2Total) {
        title.textContent = isPVP ? "PLAYER 1 WINS!" : "YOU WIN!";
        overlay.classList.add('disco-active');
        if (!isMusicMuted) playVictoryMusic();
    } else if (p2Total > p1Total) {
        title.textContent = isPVP ? "PLAYER 2 WINS!" : "YOU LOSE!";
        overlay.classList.remove('disco-active');
        if (!isMusicMuted) isPVP ? playVictoryMusic() : playLossMusic();
    } else {
        title.textContent = "IT'S A TIE!";
        overlay.classList.remove('disco-active');
        if (!isMusicMuted) playTieMusic();
    }
    document.getElementById('result-details').textContent = isPVP
        ? `P1: ${p1Total} | P2: ${p2Total}`
        : `You: ${p1Total} | Bot: ${p2Total}`;
    modal.style.display = 'flex';
}

// ============================
// FIRE ANIMATION (Hell Mode)
// ============================
let fireAnimation = null;

class FireAnimation {
    constructor() {
        this.canvas = document.getElementById('fire-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        this.particles = [];
        this.paletteBase = [
            { r: 245, g: 167, b: 66 },
            { r: 232, g: 90, b: 25 },
            { r: 255, g: 62, b: 0 },
            { r: 191, g: 34, b: 34 },
            { r: 80, g: 20, b: 70 }
        ];
        this.palette = [...this.paletteBase];
        this.time = 0;
        this.lastUpdateTime = 0;
        this.createParticles();
        this.animate();
        // Only listen to mouse on desktop
        if (!isTouchDevice()) {
            this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        }
    }

    resizeCanvas() {
        if (window.innerWidth < 768) {
            this.canvas.style.position = 'absolute';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.zIndex = '11';
            this.canvas.style.pointerEvents = 'none';
            const container = document.querySelector('.game-container');
            if (container && !container.contains(this.canvas)) container.appendChild(this.canvas);
        } else {
            this.canvas.style.position = 'fixed';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.zIndex = '0';
            this.canvas.style.pointerEvents = 'none';
            if (!document.body.contains(this.canvas)) document.body.appendChild(this.canvas);
        }
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    createParticles() {
        const particleCount = Math.floor(this.canvas.width * this.canvas.height / 3000);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: this.canvas.height + Math.random() * 100,
                size: 5 + Math.random() * 25,
                opacity: 0.1 + Math.random() * 0.5,
                speedX: (Math.random() - 0.5) * 1.5,
                speedY: -1.5 - Math.random() * 3,
                colorIndex: Math.floor(Math.random() * this.paletteBase.length),
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                sway: 0.3 + Math.random() * 0.5,
                swaySpeed: 0.005 + Math.random() * 0.01,
                swayOffset: Math.random() * Math.PI * 2,
                lifespan: 100 + Math.random() * 200
            });
        }
    }

    animate(currentTime = 0) {
        this.lastUpdateTime = currentTime;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.time += 0.01;
        this.updatePalette();
        this.updateParticles();
        if (this.particles.length < 100) this.createParticles();
        if (fireAnimation === this) requestAnimationFrame(this.animate.bind(this));
    }

    updatePalette() {
        this.palette = this.paletteBase.map((color, index) => {
            const t = this.time + index * 0.5;
            const variation = 20;
            return {
                r: Math.min(255, Math.max(0, color.r + Math.sin(t) * variation)),
                g: Math.min(255, Math.max(0, color.g + Math.sin(t + 1) * variation)),
                b: Math.min(255, Math.max(0, color.b + Math.sin(t + 2) * variation))
            };
        });
    }

    updateParticles() {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.x += p.speedX + Math.sin(this.time * p.swaySpeed + p.swayOffset) * p.sway;
            p.y += p.speedY;
            p.rotation += p.rotationSpeed;
            p.lifespan -= 1;
            const lifeFactor = p.lifespan / 300;
            if (p.lifespan > 0) {
                this.drawBrushstroke(p.x, p.y, p.size * lifeFactor, p.rotation, this.palette[p.colorIndex], p.opacity * lifeFactor);
            }
            if (p.lifespan <= 0 || p.y < -100) {
                this.particles[i] = {
                    x: Math.random() * this.canvas.width,
                    y: this.canvas.height + Math.random() * 50,
                    size: 5 + Math.random() * 25,
                    opacity: 0.1 + Math.random() * 0.5,
                    speedX: (Math.random() - 0.5) * 1.5,
                    speedY: -1.5 - Math.random() * 3,
                    colorIndex: Math.floor(Math.random() * this.paletteBase.length),
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.02,
                    sway: 0.3 + Math.random() * 0.5,
                    swaySpeed: 0.005 + Math.random() * 0.01,
                    swayOffset: Math.random() * Math.PI * 2,
                    lifespan: 100 + Math.random() * 200
                };
            }
        }
    }

    drawBrushstroke(x, y, size, rotation, color, opacity) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);
        const gradient = this.ctx.createLinearGradient(0, -size, 0, size);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(-size / 3, -size);
        this.ctx.quadraticCurveTo(size / 2, 0, -size / 3, size);
        this.ctx.quadraticCurveTo(size / 2, 0, size / 3, -size / 2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity * 0.7})`;
        this.ctx.beginPath();
        this.ctx.ellipse(size / 6, 0, size / 4, size / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: mouseX + (Math.random() - 0.5) * 50,
                y: mouseY + (Math.random() - 0.5) * 50,
                size: 10 + Math.random() * 20,
                opacity: 0.2 + Math.random() * 0.4,
                speedX: (Math.random() - 0.5) * 2,
                speedY: -2 - Math.random() * 2,
                colorIndex: Math.floor(Math.random() * this.paletteBase.length),
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.03,
                sway: 0.3 + Math.random() * 0.5,
                swaySpeed: 0.005 + Math.random() * 0.01,
                swayOffset: Math.random() * Math.PI * 2,
                lifespan: 50 + Math.random() * 100
            });
        }
    }
}

function initFireAnimation() {
    fireAnimation = null;
    fireAnimation = new FireAnimation();
}

function stopFireAnimation() {
    fireAnimation = null;
    const canvas = document.getElementById('fire-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}
