// --- DOM ELEMENTS ---
const menuBtn = document.getElementById('menuBtn');
const closeBtn = document.getElementById('closeBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const gridContainer = document.getElementById('gridContainer');
const taskListContainer = document.getElementById('taskList');
const currentTaskTitle = document.getElementById('currentTaskTitle');
const percentageDisplay = document.getElementById('percentageDisplay');
const progressBarFill = document.getElementById('progressBarFill');
const streakCountDisplay = document.getElementById('streakCount');
const backBtn = document.getElementById('backBtn');

// Inputs
const newTaskInput = document.getElementById('newTaskInput');
const newTaskTotal = document.getElementById('newTaskTotal');
const createTaskBtn = document.getElementById('createTaskBtn');
const enableGrouping = document.getElementById('enableGrouping');
const chunkSizeInput = document.getElementById('chunkSizeInput');

// --- APP STATE ---
let appData = {};
let currentTaskName = "";
let streakData = { count: 0, lastDate: "" };
let currentZoomChunk = null; 

// --- INITIALIZATION ---
window.onload = function() {
    loadData();
    checkStreak(); 
    updateUI();
};

// --- MENU ---
menuBtn.addEventListener('click', toggleMenu);
closeBtn.addEventListener('click', toggleMenu);
overlay.addEventListener('click', toggleMenu);

function toggleMenu() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

enableGrouping.addEventListener('change', () => {
    if (enableGrouping.checked) {
        chunkSizeInput.classList.remove('hidden');
    } else {
        chunkSizeInput.classList.add('hidden');
        chunkSizeInput.value = ""; 
    }
});

// --- DATA ---
function loadData() {
    const savedData = localStorage.getItem('orbitData');
    const savedStreak = localStorage.getItem('orbitStreak');
    if (savedData) appData = JSON.parse(savedData);
    if (savedStreak) streakData = JSON.parse(savedStreak);

    if (!currentTaskName && Object.keys(appData).length > 0) {
        loadTask(Object.keys(appData)[0]);
    }
}
function saveData() { localStorage.setItem('orbitData', JSON.stringify(appData)); }

// --- STREAK ---
function checkStreak() {
    const today = new Date().toDateString();
    if (!streakData.lastDate) { streakCountDisplay.innerText = 0; return; }
    const last = new Date(streakData.lastDate);
    const now = new Date(today);
    const diffDays = Math.ceil(Math.abs(now - last) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
        streakData.count = 0;
        localStorage.setItem('orbitStreak', JSON.stringify(streakData));
    }
    streakCountDisplay.innerText = streakData.count;
}
function incrementStreak() {
    const today = new Date().toDateString();
    if (streakData.lastDate === today) return;
    streakData.count++;
    streakData.lastDate = today;
    localStorage.setItem('orbitStreak', JSON.stringify(streakData));
    streakCountDisplay.innerText = streakData.count;
}

// --- TASK CREATION ---
createTaskBtn.addEventListener('click', () => {
    const title = newTaskInput.value.trim();
    const total = parseInt(newTaskTotal.value);
    if (!title || !total) return alert("Fill Name and Total");
    if (appData[title]) return alert("Name exists");

    let chunkSize = 0; 
    if (enableGrouping.checked) {
        chunkSize = parseInt(chunkSizeInput.value);
        if (!chunkSize || chunkSize < 1 || chunkSize >= total) return alert("Invalid Group Size");
    }

    appData[title] = { total: total, chunkSize: chunkSize, states: {} };
    saveData(); loadTask(title); updateUI();
    newTaskInput.value = ""; newTaskTotal.value = ""; enableGrouping.checked = false;
    chunkSizeInput.value = ""; chunkSizeInput.classList.add('hidden'); toggleMenu();
});

// --- RENDER ---
function loadTask(name) {
    currentTaskName = name; currentZoomChunk = null; 
    renderGrid(); updateStats(); updateUI();
}
backBtn.addEventListener('click', () => { currentZoomChunk = null; renderGrid(); });

function renderGrid() {
    const task = appData[currentTaskName];
    if (!task) return;
    gridContainer.innerHTML = '';
    if (task.chunkSize === 0 || currentZoomChunk === null) renderOverview(task);
    else renderZoomedView(task);
}

function renderOverview(task) {
    backBtn.style.display = 'none';
    currentTaskTitle.innerText = currentTaskName;
    if (task.chunkSize === 0) {
        for (let i = 0; i < task.total; i++) createBlock(i, task.states[i] || 0, false);
        return;
    }
    const totalChunks = Math.ceil(task.total / task.chunkSize);
    for (let c = 0; c < totalChunks; c++) {
        const start = c * task.chunkSize;
        const end = Math.min(start + task.chunkSize, task.total);
        let completed = 0;
        for (let k = start; k < end; k++) if (task.states[k] === 1) completed++;
        let metaState = 0;
        if (completed === (end - start)) metaState = 1; else if (completed > 0) metaState = 2;
        createMetaBlock(c, metaState, start + 1, end);
    }
}

function renderZoomedView(task) {
    backBtn.style.display = 'flex';
    const start = currentZoomChunk * task.chunkSize;
    const end = Math.min(start + task.chunkSize, task.total);
    currentTaskTitle.innerText = `${currentTaskName} (${start + 1}-${end})`;
    for (let i = start; i < end; i++) createBlock(i, task.states[i] || 0, false);
}

function createMetaBlock(index, state, rangeStart, rangeEnd) {
    const block = document.createElement('div');
    block.classList.add('block', 'meta');
    if (state === 1) block.classList.add('state-1');
    block.innerHTML = `<span style="font-size:0.6rem; color: #888;">${rangeStart}-${rangeEnd}</span>`;
    block.addEventListener('click', () => { currentZoomChunk = index; renderGrid(); });
    gridContainer.appendChild(block);
}

function createBlock(index, state, isMeta) {
    const block = document.createElement('div');
    block.classList.add('block');
    if (state === 1) block.classList.add('state-1');
    block.dataset.state = state;
    block.innerText = index + 1; 
    block.addEventListener('click', () => handleBlockClick(block, index));
    gridContainer.appendChild(block);
}

function handleBlockClick(block, index) {
    // --- HAPTIC FEEDBACK (The Addictive Part) ---
    // Try to vibrate for 10ms (works on Android Chrome)
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }

    let currentState = parseInt(block.dataset.state);
    let nextState = currentState === 1 ? 0 : 1;

    if (currentState === 1) block.classList.remove('state-1');
    if (nextState === 1) block.classList.add('state-1');
    block.dataset.state = nextState;

    if (nextState === 0) delete appData[currentTaskName].states[index];
    else { appData[currentTaskName].states[index] = 1; incrementStreak(); }
    
    saveData(); updateStats();
}

function updateStats() {
    const task = appData[currentTaskName];
    const doneCount = Object.keys(task.states).filter(k => task.states[k] === 1).length;
    const percent = (doneCount / task.total) * 100;
    // 2 Decimal Places
    const formattedPercent = percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2);
    percentageDisplay.innerText = `${formattedPercent}%`;
    progressBarFill.style.width = `${percent}%`;
}

function updateUI() {
    taskListContainer.innerHTML = '';
    Object.keys(appData).forEach(name => {
        const div = document.createElement('div');
        div.classList.add('task-item');
        if (name === currentTaskName) div.classList.add('active');
        div.innerHTML = `<span onclick="loadTask('${name}')">${name}</span><button class="delete-task" onclick="deleteTask('${name}')"><i class="fa-solid fa-trash"></i></button>`;
        taskListContainer.appendChild(div);
    });
}

window.deleteTask = function(name) {
    if (confirm(`Delete ${name}?`)) {
        delete appData[name];
        if (currentTaskName === name) {
            currentTaskName = ""; currentZoomChunk = null; gridContainer.innerHTML = ''; currentTaskTitle.innerText = "Select Task";
            percentageDisplay.innerText = "0%"; progressBarFill.style.width = "0%";
        }
        saveData(); updateUI();
    }
};