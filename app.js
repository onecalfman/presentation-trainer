pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// State
let pdfDoc = null;
let pdfPages = [];
let speakerNotes = [];
let currentSlide = 0;
let isPaused = false;

let totalStartTime = null;
let slideStartTime = null;
let totalElapsed = 0;
let slideElapsed = [];

let totalTimerInterval = null;
let slideTimerInterval = null;

let pdfUploaded = false;
let notesUploaded = false;

// DOM Elements
const screens = {
    setup: document.getElementById('setup-screen'),
    presentation: document.getElementById('presentation-screen'),
    results: document.getElementById('results-screen')
};

const elements = {
    dropzoneWrapper: document.getElementById('dropzone-wrapper'),
    fileInput: document.getElementById('file-input'),
    pdfCard: document.getElementById('pdf-card'),
    notesCard: document.getElementById('notes-card'),
    pdfName: document.getElementById('pdf-name'),
    notesName: document.getElementById('notes-name'),
    startBtn: document.getElementById('start-btn'),

    // Modal elements
    infoBtn: document.getElementById('info-btn'),
    infoModal: document.getElementById('info-modal'),
    modalClose: document.getElementById('modal-close'),

    // Presentation elements
    pdfCanvas: document.getElementById('pdf-canvas'),
    notesPanel: document.querySelector('.notes-panel'),
    slideViewer: document.querySelector('.slide-viewer'),
    notesContent: document.getElementById('notes-content'),
    currentSlide: document.getElementById('current-slide'),
    totalSlides: document.getElementById('total-slides'),
    notesSlideBadge: document.getElementById('notes-slide-badge'),
    totalTimer: document.getElementById('total-timer'),
    slideTimer: document.getElementById('slide-timer'),
    progressFill: document.getElementById('progress-fill'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    endBtn: document.getElementById('end-btn'),
    resultsBody: document.getElementById('results-body'),
    finalTotalTime: document.getElementById('final-total-time'),
    restartBtn: document.getElementById('restart-btn')
};

// Drop Zone Logic
function setupDropZone() {
    const wrapper = elements.dropzoneWrapper;
    
    wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        wrapper.classList.add('dragover');
    });
    
    wrapper.addEventListener('dragleave', (e) => {
        if (!wrapper.contains(e.relatedTarget)) {
            wrapper.classList.remove('dragover');
        }
    });
    
    wrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        wrapper.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    elements.fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

async function handleFiles(files) {
    const fileList = Array.from(files);
    
    for (const file of fileList) {
        const ext = file.name.toLowerCase();
        
        if (ext.endsWith('.pdf')) {
            await handlePdfUpload(file);
            elements.pdfName.textContent = file.name;
            elements.pdfCard.classList.add('loaded');
            pdfUploaded = true;
        } else if (ext.endsWith('.md') || ext.endsWith('.markdown')) {
            await handleNotesUpload(file);
            elements.notesName.textContent = file.name;
            elements.notesCard.classList.add('loaded');
            notesUploaded = true;
        }
    }
    
    checkReady();
}

async function handlePdfUpload(file) {
    const arrayBuffer = await file.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    pdfPages = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        pdfPages.push(page);
    }
    
    elements.totalSlides.textContent = pdfDoc.numPages;
}

async function handleNotesUpload(file) {
    const text = await file.text();
    // Split by H1 headings only
    const parts = text.split(/^#\s+.+$/gm);
    speakerNotes = parts.map(part => part.trim()).filter(part => part.length > 0);
    
    // If no splits by H1, treat whole file as one set of notes
    if (speakerNotes.length === 0) {
        speakerNotes = [text.trim()];
    }
}

function checkReady() {
    elements.startBtn.disabled = !(pdfUploaded && notesUploaded);
}

// Modal Logic
function setupModal() {
    elements.infoBtn.addEventListener('click', () => {
        elements.infoModal.classList.add('active');
    });
    
    elements.modalClose.addEventListener('click', () => {
        elements.infoModal.classList.remove('active');
    });
    
    elements.infoModal.addEventListener('click', (e) => {
        if (e.target === elements.infoModal) {
            elements.infoModal.classList.remove('active');
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.infoModal.classList.contains('active')) {
            elements.infoModal.classList.remove('active');
        }
    });
}

// Navigation
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// Start Presentation directly (no preview)
function startPresentation() {
    currentSlide = 0;
    slideElapsed = new Array(pdfPages.length).fill(0);
    isPaused = false;
    totalElapsed = 0;
    
    showScreen('presentation');
    renderSlide();
    startTimers();
}

async function renderSlide() {
    const page = pdfPages[currentSlide];
    const canvas = elements.pdfCanvas;
    const ctx = canvas.getContext('2d');

    // Get container dimensions
    const slideViewer = document.querySelector('.slide-viewer');
    const containerWidth = slideViewer.clientWidth;
    const containerHeight = slideViewer.clientHeight;

    // Get PDF page dimensions at scale 1
    const baseViewport = page.getViewport({ scale: 1 });

    // Calculate scale to fit
    const scaleX = containerWidth / baseViewport.width;
    const scaleY = containerHeight / baseViewport.height;
    const scale = Math.min(scaleX, scaleY);

    // Create viewport at calculated scale
    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport }).promise;

    elements.currentSlide.textContent = currentSlide + 1;
    elements.notesSlideBadge.textContent = currentSlide + 1;
    elements.progressFill.style.width = ((currentSlide + 1) / pdfPages.length * 100) + '%';

    updateNotes();
    updateNavButtons();
}

function updateNotes() {
    const notes = getSlideNotes(currentSlide);
    if (notes) {
        elements.notesContent.innerHTML = marked.parse(notes);
    } else {
        elements.notesContent.innerHTML = '<p class="notes-empty">No notes for this slide</p>';
    }
}

function getSlideNotes(slideIndex) {
    return speakerNotes[slideIndex] || null;
}

function updateNavButtons() {
    elements.prevBtn.disabled = currentSlide === 0;
    elements.nextBtn.disabled = currentSlide === pdfPages.length - 1;
}

function goToSlide(index) {
    if (index < 0 || index >= pdfPages.length) return;
    
    if (!isPaused) {
        slideElapsed[currentSlide] += (Date.now() - slideStartTime) / 1000;
    }
    
    currentSlide = index;
    slideStartTime = Date.now();
    renderSlide();
}

// Timer
function startTimers() {
    totalStartTime = Date.now();
    slideStartTime = Date.now();
    
    totalTimerInterval = setInterval(updateTimers, 100);
}

function updateTimers() {
    if (isPaused) return;
    
    const total = totalElapsed + (Date.now() - totalStartTime) / 1000;
    elements.totalTimer.textContent = formatTime(total, true);
    
    const slide = slideElapsed[currentSlide] + (Date.now() - slideStartTime) / 1000;
    elements.slideTimer.textContent = formatTime(slide, false);
}

function formatTime(seconds, showHours) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (showHours || h > 0) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function togglePause() {
    if (isPaused) {
        totalStartTime = Date.now();
        slideStartTime = Date.now();
        isPaused = false;
        elements.totalTimer.classList.add('running');
        updatePauseButton();
    } else {
        totalElapsed += (Date.now() - totalStartTime) / 1000;
        slideElapsed[currentSlide] += (Date.now() - slideStartTime) / 1000;
        isPaused = true;
        elements.totalTimer.classList.remove('running');
        updatePauseButton();
    }
}

function updatePauseButton() {
    const icon = isPaused ? 'play' : 'pause';
    const text = isPaused ? 'Resume' : 'Pause';
    elements.pauseBtn.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span>${text}</span>
    `;
    lucide.createIcons();
}

function endPresentation() {
    clearInterval(totalTimerInterval);
    
    if (!isPaused) {
        totalElapsed += (Date.now() - totalStartTime) / 1000;
        slideElapsed[currentSlide] += (Date.now() - slideStartTime) / 1000;
    }
    
    showResults();
}

function showResults() {
    showScreen('results');
    
    const finalTotal = totalElapsed;
    elements.finalTotalTime.textContent = formatTime(finalTotal, true);
    
    const tbody = elements.resultsBody;
    tbody.innerHTML = '';
    
    for (let i = 0; i < pdfPages.length; i++) {
        const time = slideElapsed[i];
        const pct = finalTotal > 0 ? (time / finalTotal * 100).toFixed(1) : '0.0';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i + 1}</td>
            <td class="time-cell">${formatTime(time, false)}</td>
            <td class="pct-cell">${pct}%</td>
        `;
        tbody.appendChild(row);
    }
}

function restart() {
    isPaused = false;
    totalElapsed = 0;
    currentSlide = 0;
    slideElapsed = [];
    
    elements.totalTimer.textContent = '00:00:00';
    elements.slideTimer.textContent = '00:00';
    elements.totalTimer.classList.remove('running');
    updatePauseButton();
    
    showScreen('setup');
}

// Event Listeners
setupDropZone();
setupModal();

elements.startBtn.addEventListener('click', startPresentation);
elements.prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
elements.nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));
elements.pauseBtn.addEventListener('click', togglePause);
elements.endBtn.addEventListener('click', endPresentation);
elements.restartBtn.addEventListener('click', restart);

// Mobile notes toggle
const toggleNotesBtn = document.getElementById('toggle-notes-btn');
if (toggleNotesBtn) {
    toggleNotesBtn.addEventListener('click', () => {
        elements.notesPanel.classList.toggle('hidden');
        elements.slideViewer.classList.toggle('full-height');
        // Re-render slide to adjust size
        renderSlide();
    });
}

document.addEventListener('keydown', (e) => {
    if (screens.presentation.classList.contains('active')) {
        if (e.key === 'ArrowLeft') goToSlide(currentSlide - 1);
        else if (e.key === 'ArrowRight') goToSlide(currentSlide + 1);
        else if (e.key === ' ') {
            e.preventDefault();
            togglePause();
        }
        else if (e.key === 'Escape') endPresentation();
    }
});

// Touch swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

document.querySelector('.slide-viewer')?.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.querySelector('.slide-viewer')?.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, { passive: true });

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
        // Swipe left - next slide
        goToSlide(currentSlide + 1);
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        // Swipe right - previous slide
        goToSlide(currentSlide - 1);
    }
}
