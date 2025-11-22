// --- 1. DATA: Pre-loaded Content ---
// Built-in library (will not be mutated). User topics are stored separately in localStorage and merged at runtime.
const preloadedLibrary = [
    {
        title: "Wissenschaft: Klimawandel",
        level: "C1",
        text: "Der Klimawandel ist eine der größten Herausforderungen unserer Zeit. Wissenschaftler warnen vor den irreversiblen Folgen der globalen Erwärmung. Wir müssen dringend Maßnahmen ergreifen, um den CO2-Ausstoß zu reduzieren."
    },
    {
        title: "Dubai Schokolade (Viral Trend)",
        level: "B2",
        text: "Außen Schokolade und innen süße Pistaziencreme: Dubai-Schokolade kostet durchschnittlich rund sieben Euro pro 100 Gramm und gilt als süßer Luxus. Die Kombination aus knusprigem Teigfäden und cremiger Füllung macht sie so besonders. In sozialen Netzwerken ist sie momentan der absolute Renner."
    },
    {
        title: "Wirtschaft: Die Inflation",
        level: "B2",
        text: "Die Inflation hat in den letzten Monaten stark zugenommen. Viele Verbraucher sorgen sich um die steigenden Preise für Lebensmittel und Energie. Die Zentralbank versucht, durch Zinserhöhungen gegenzusteuern."
    }
];

// --- 2. STATE ---
let currentSentences = [];
let currentIndex = 0;
let synthesis = window.speechSynthesis;
let library = []; // runtime merged library (preloaded + user)
let pendingCustomText = null; // temporary holder for text when opening metadata form

// --- 3. INIT ---
function loadUserTopics() {
    try {
        const raw = localStorage.getItem('userTopics');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to parse userTopics', e);
        return [];
    }
}

function saveUserTopics(arr) {
    localStorage.setItem('userTopics', JSON.stringify(arr));
}

function buildLibrary() {
    const users = loadUserTopics();
    // Clone preloadedLibrary then append user topics so index mapping is stable
    library = preloadedLibrary.slice();
    users.forEach(u => library.push(u));
}

function renderTopics() {
    const grid = document.getElementById('topics-grid');
    if(!grid) return;
    grid.innerHTML = '';
    library.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => startLesson(index);
        const levelClass = (item.level || 'custom').toLowerCase();
        card.innerHTML = `
            <span class="tag ${levelClass}">${item.level || 'Custom'}</span>
            <h3 style="margin:0 0 10px 0">${item.title}</h3>
            <p style="color:#666; margin:0">${(item.text || '').split(/\.|!|\?/).filter(s=>s.trim()).length} sentences</p>
        `;
        grid.appendChild(card);
    });
}

function init() {
    buildLibrary();
    renderTopics();
}

// --- 4. CORE FUNCTIONS ---
function startLesson(index) {
    setupPlayer(library[index].text, library[index].level);
}

function startCustomLesson() {
    const text = document.getElementById('custom-text-input').value;
    if(text.trim().length < 5) return alert("Please paste some text first!");
    // Open metadata form so the user can save the topic (or skip saving and start practice directly)
    pendingCustomText = text;
    openMetaForm();
}

// Metadata form handling
function openMetaForm() {
    document.getElementById('meta-title').value = '';
    document.getElementById('meta-level').value = 'Custom';
    document.getElementById('meta-form').style.display = 'block';
}

function cancelMetaForm() {
    pendingCustomText = null;
    document.getElementById('meta-form').style.display = 'none';
}

function saveTopicFromForm() {
    const title = document.getElementById('meta-title').value.trim();
    const level = document.getElementById('meta-level').value;

    if(!pendingCustomText || pendingCustomText.trim().length < 1) {
        alert('No text to save. Please paste text first.');
        cancelMetaForm();
        return;
    }

    if(title.length < 1) {
        return alert('Please provide a title for the topic.');
    }

    const users = loadUserTopics();
    const newTopic = {
        title: title,
        // category was removed per UI change; keep category empty or mirror level
        category: '',
        level: level || 'Custom',
        text: pendingCustomText
    };
    users.push(newTopic);
    saveUserTopics(users);

    // Rebuild and render topics, then close form and navigate to the new lesson
    buildLibrary();
    renderTopics();
    document.getElementById('meta-form').style.display = 'none';

    // Start the newly created lesson (it will be the last item in library)
    const newIndex = library.length - 1;
    pendingCustomText = null;
    startLesson(newIndex);
}

function setupPlayer(fullText, level) {
    // Split text into sentences
    currentSentences = fullText.match( /[^.!?]+[.!?]+/g ) || [fullText];
    currentSentences = currentSentences.map(s => s.trim());
    
    currentIndex = 0;
    
    document.getElementById('topics-view').style.display = 'none';
    document.getElementById('player-view').style.display = 'block';
    document.getElementById('vocab-level').innerText = "Level: " + level;
    
    updatePlayerUI();
}

function updatePlayerUI() {
    // Update Progress Text & Bar
    document.getElementById('sentence-counter').innerText = `${currentIndex + 1} / ${currentSentences.length}`;
    document.getElementById('progress').style.width = `${((currentIndex) / (currentSentences.length - 1 || 1)) * 100}%`;
    
    // Reset Text Area
    const inputArea = document.getElementById('user-input');
    inputArea.value = '';
    inputArea.disabled = false;
    inputArea.focus();
    
    // Reset Feedback
    document.getElementById('feedback').style.display = 'none';
    
    // Reset Check Button
    const btnCheck = document.getElementById('btn-check');
    btnCheck.style.display = 'block';
    btnCheck.innerText = "Check";
    btnCheck.onclick = checkAnswer;
    btnCheck.classList.remove('btn-secondary');
    btnCheck.classList.add('btn-primary');

    // Update Nav Buttons
    document.getElementById('btn-prev').disabled = (currentIndex === 0);
    
    // Handle last sentence logic
    const btnNext = document.getElementById('btn-next');
    if (currentIndex === currentSentences.length - 1) {
         btnNext.innerText = "Finish";
    } else {
         btnNext.innerText = "Next →";
    }
}

function playAudio() {
    synthesis.cancel();
    const text = currentSentences[currentIndex];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = parseFloat(document.getElementById('speed-rate').value);
    synthesis.speak(utterance);
}

function checkAnswer() {
    const userText = document.getElementById('user-input').value.trim();
    const correctText = currentSentences[currentIndex].trim();
    const feedbackDiv = document.getElementById('feedback');
    
    feedbackDiv.style.display = 'block';
    
    if (userText === correctText) {
        feedbackDiv.innerHTML = `<span class="diff-correct">Perfekt! Correct.</span>`;
        feedbackDiv.style.backgroundColor = "#f0fdf4";
        feedbackDiv.style.borderColor = "#bbf7d0";
    } else {
        feedbackDiv.innerHTML = `
            <div style="margin-bottom:8px;"><strong>Correct:</strong> <span class="diff-correct">${correctText}</span></div>
            <div><strong>You:</strong> <span class="diff-wrong">${userText}</span></div>
        `;
        feedbackDiv.style.backgroundColor = "#fef2f2";
        feedbackDiv.style.borderColor = "#fecaca";
    }

    document.getElementById('user-input').disabled = true;
    document.getElementById('btn-check').style.display = 'none'; 
}

// --- NAVIGATION FUNCTIONS ---
function prevSentence() {
    if (currentIndex > 0) {
        currentIndex--;
        updatePlayerUI();
    }
}

function nextSentence() {
    if (currentIndex < currentSentences.length - 1) {
        currentIndex++;
        updatePlayerUI();
    } else {
        if(confirm("Lesson Finished! Go back to topics?")) {
            goHome();
        }
    }
}

function goHome() {
    synthesis.cancel();
    document.getElementById('topics-view').style.display = 'block';
    document.getElementById('player-view').style.display = 'none';
}

// Run initialization
init();