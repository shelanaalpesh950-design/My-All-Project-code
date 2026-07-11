import { GoogleGenerativeAI } from "@google/generative-ai";

// ⚠️ તમારી Gemini API Key અહીં નાખો
const API_KEY = "AQ.Ab8RN6IJ44xIlR31a16sG5gUJelegqnFDBsy6WtnDNwCvbY_Pw";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// =========================================================
// GTU Diploma CS — Semester wise subjects
// =========================================================
const SEMESTER_SUBJECTS = {
  "1": ["Fundamentals of ICT", "Basic Mathematics", "Communication Skills in English", "Basic Electrical & Electronics", "Engineering Graphics"],
  "2": ["Programming in C", "Applied Mathematics", "Digital Fundamentals", "Data Structure with C", "Computer Organization"],
  "3": ["Object Oriented Programming (C++)", "Database Management System", "Data Structure & Algorithm", "Computer Networks", "Web Page Design (HTML/CSS)"],
  "4": ["Java Programming", "Operating System", "Software Engineering", "Python Programming", "Microprocessor & Interfacing"],
  "5": ["Advanced Java (JSP/Servlet)", "Computer Networks & Security", "Mobile Application Development", "PHP & MySQL", "Data Mining & Warehousing"],
  "6": ["Project Work", "Industrial Training", "Cyber Security", "Cloud Computing", "Artificial Intelligence Basics"]
};

// =========================================================
// Storage helpers
// =========================================================
const STORE_KEYS = {
  marks: "study_marks",
  syllabus: "study_syllabus",
  flashcards: "study_flashcards",
  chat: "study_chat_history",
  projects: "study_projects",
  semester: "study_semester",
  theme: "study_theme"
};

function saveToStore(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); flashSaveIndicator(); }
  catch (e) { console.error("Storage save failed", e); }
}
function loadFromStore(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function flashSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.textContent = "✓ સેવ થયું";
  el.classList.add('show');
  clearTimeout(flashSaveIndicator._t);
  flashSaveIndicator._t = setTimeout(() => el.classList.remove('show'), 1200);
}

// =========================================================
// Tabs + Sidebar + Titles
// =========================================================
const TAB_TITLES = {
  "dashboard-section": "Dashboard",
  "doubt-section": "AI Doubt & Code",
  "library-section": "Auto Library",
  "syllabus-section": "Syllabus Tracker",
  "flashcard-section": "Flashcards",
  "projects-section": "My Projects",
  "dsa-section": "DSA Corner",
  "result-section": "Growth Tracker"
};

window.switchTab = function(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
  document.getElementById('page-title').textContent = TAB_TITLES[tabId] || "";
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tabId === 'dashboard-section') updateDashboard();
  if (window.innerWidth <= 820) document.getElementById('sidebar').classList.remove('open');
}

window.toggleSidebar = function() {
  document.getElementById('sidebar').classList.toggle('open');
}

// =========================================================
// Dark Mode
// =========================================================
window.toggleTheme = function() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem(STORE_KEYS.theme, isDark ? 'dark' : 'light');
  document.querySelector('#theme-toggle span').textContent = isDark ? 'Light Mode' : 'Dark Mode';
};
(function initTheme() {
  if (localStorage.getItem(STORE_KEYS.theme) === 'dark') {
    document.body.classList.add('dark');
  }
})();

// =========================================================
// Semester handling
// =========================================================
let currentSemester = loadFromStore(STORE_KEYS.semester, "3");

function populateSubjectDropdowns() {
  const subs = SEMESTER_SUBJECTS[currentSemester] || [];
  ['syllabus-subject', 'subject-select'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = subs.map(s => `<option value="${s}">${s}</option>`).join('');
  });
}

window.onSemesterChange = function() {
  currentSemester = document.getElementById('semester-select').value;
  saveToStore(STORE_KEYS.semester, currentSemester);
  populateSubjectDropdowns();
  updateDashboard();
};

// =========================================================
// Dashboard
// =========================================================
function updateDashboard() {
  // subjects
  const list = document.getElementById('dash-subject-list');
  if (list) {
    const subs = SEMESTER_SUBJECTS[currentSemester] || [];
    list.innerHTML = subs.map(s => `<li>${s}</li>`).join('');
  }
  // syllabus progress
  let total = 0, done = 0;
  Object.values(syllabusData).forEach(arr => { total += arr.length; done += arr.filter(t => t.done).length; });
  const pct = total ? Math.round(done / total * 100) : 0;
  const ring = document.getElementById('ring-progress');
  if (ring) {
    ring.style.background = `conic-gradient(var(--marker-green) ${pct * 3.6}deg, var(--paper-line) 0deg)`;
    document.getElementById('ring-progress-val').textContent = pct + '%';
  }
  // avg marks
  const vals = Object.values(marksData);
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  setText('stat-avg', avg);
  setText('stat-cards', flashcards.length);
  setText('stat-projects', projects.length);
}
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

// =========================================================
// 1. AI Doubt & Code Solver
// =========================================================
let chatHistory = loadFromStore(STORE_KEYS.chat, []);
function renderChatHistory() {
  const chatBox = document.getElementById('chat-box');
  chatBox.innerHTML = '';
  chatHistory.forEach(msg => {
    if (msg.role === 'user') chatBox.innerHTML += `<p><b>તમે:</b> ${msg.text}</p>`;
    else chatBox.innerHTML += `<div class="ai-reply"><b>AI Assistant:</b> ${msg.text}</div>`;
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}
window.askAI = async function() {
  const query = document.getElementById('user-query').value;
  if (!query) return;
  chatHistory.push({ role: 'user', text: query });
  renderChatHistory();
  document.getElementById('user-query').value = '';
  try {
    const result = await model.generateContent(`તમે એક ડિપ્લોમા કોમ્પ્યુટર સાયન્સના સ્ટુડન્ટના AI આસિસ્ટન્ટ છો. આ સવાલનો ખુબ જ સરળ ભાષામાં જવાબ આપો અને જો કોડિંગ હોય તો એરર સોલ્વ કરો: ${query}`);
    const text = (await result.response).text();
    chatHistory.push({ role: 'ai', text });
    saveToStore(STORE_KEYS.chat, chatHistory);
    renderChatHistory();
  } catch (error) {
    document.getElementById('chat-box').innerHTML += `<p style="color:red;"><b>Error:</b> API કનેક્શનમાં ભૂલ છે. કી ચેક કરો.</p>`;
  }
};
renderChatHistory();

// =========================================================
// 2. Automatic Online Library (સમજૂતી + મટીરીયલ લિંક્સ)
// =========================================================
window.searchBooks = async function() {
  const topic = document.getElementById('book-topic').value;
  if (!topic) return;
  const resultsDiv = document.getElementById('library-results');
  const linksDiv = document.getElementById('library-links');
  resultsDiv.innerHTML = "⏳ AI મટીરીયલ સર્ચ કરી રહ્યું છે...";
  linksDiv.innerHTML = "";

  // AI explanation
  try {
    const result = await model.generateContent(`ડિપ્લોમા CS ના આ ટોપિક માટે બેસ્ટ સ્ટડી મટીરીયલ, રેફરન્સ બુકના નામ અને આખો ટોપિક સરળ ગુજરાતીમાં સમજાવો: ${topic}`);
    resultsDiv.innerHTML = `<div>${(await result.response).text()}</div>`;
  } catch (e) { resultsDiv.innerHTML = "<p style='color:red;'>માહિતી લાવવામાં ભૂલ થઈ.</p>"; }

  // Real material links (curated search links)
  const q = encodeURIComponent(topic);
  const links = [
    { name: "📺 YouTube પર વિડિયો લેક્ચર", url: `https://www.youtube.com/results?search_query=${q}+tutorial+gujarati` },
    { name: "📖 GeeksforGeeks નોટ્સ", url: `https://www.geeksforgeeks.org/?s=${q}` },
    { name: "🎓 W3Schools ટ્યુટોરિયલ", url: `https://www.w3schools.com/` },
    { name: "📚 Google પર PDF બુક્સ", url: `https://www.google.com/search?q=${q}+notes+pdf+diploma` },
    { name: "🧠 NPTEL ફ્રી કોર્સ", url: `https://nptel.ac.in/courses` }
  ];
  linksDiv.innerHTML = `<h3>🔗 રિયલ મટીરીયલ લિંક્સ:</h3>` +
    links.map(l => `<a class="lib-link-item" href="${l.url}" target="_blank" rel="noopener">${l.name}</a>`).join('');
};

// =========================================================
// 3. Growth Tracker
// =========================================================
let marksData = loadFromStore(STORE_KEYS.marks, {});
window.addMarks = function() {
  const subject = document.getElementById('subject-select').value;
  const marks = parseInt(document.getElementById('subject-marks').value);
  if (isNaN(marks) || marks < 0 || marks > 100) { alert("0 થી 100 ની વચ્ચે સાચા માર્ક્સ નાખો."); return; }
  marksData[subject] = marks;
  saveToStore(STORE_KEYS.marks, marksData);
  document.getElementById('subject-marks').value = '';
  updateGrowthTracker();
};
function updateGrowthTracker() {
  const marksList = document.getElementById('marks-list');
  const growthStatus = document.getElementById('growth-status');
  if (!marksList) return;
  marksList.innerHTML = '';
  let highestSub = '', lowestSub = '', max = -1, min = 101;
  for (let sub in marksData) {
    let score = marksData[sub];
    marksList.innerHTML += `<li>${sub}: <b>${score}/100</b></li>`;
    if (score > max) { max = score; highestSub = sub; }
    if (score < min) { min = score; lowestSub = sub; }
  }
  if (highestSub && lowestSub) {
    growthStatus.innerHTML = `
      <p>📈 <b>High Growth (સૌથી બેસ્ટ):</b> ${highestSub} (${max}/100)</p>
      <p>📉 <b>Low Growth (વધારે મહેનતની જરૂર):</b> ${lowestSub} (${min}/100)</p>`;
  }
}

// =========================================================
// 4. Syllabus Tracker
// =========================================================
let syllabusData = loadFromStore(STORE_KEYS.syllabus, {});
window.addSyllabusTopic = function() {
  const subject = document.getElementById('syllabus-subject').value;
  const topicInput = document.getElementById('syllabus-topic');
  const name = topicInput.value.trim();
  if (!name) return;
  if (!syllabusData[subject]) syllabusData[subject] = [];
  syllabusData[subject].push({ id: Date.now().toString(36), name, done: false });
  saveToStore(STORE_KEYS.syllabus, syllabusData);
  topicInput.value = '';
  renderSyllabus();
};
window.toggleSyllabusTopic = function(subject, id) {
  const list = syllabusData[subject];
  if (!list) return;
  const item = list.find(t => t.id === id);
  if (item) item.done = !item.done;
  saveToStore(STORE_KEYS.syllabus, syllabusData);
  renderSyllabus();
};
window.deleteSyllabusTopic = function(subject, id) {
  syllabusData[subject] = (syllabusData[subject] || []).filter(t => t.id !== id);
  saveToStore(STORE_KEYS.syllabus, syllabusData);
  renderSyllabus();
};
function renderSyllabus() {
  const container = document.getElementById('syllabus-groups');
  if (!container) return;
  container.innerHTML = '';
  let totalTopics = 0, doneTopics = 0;
  Object.keys(syllabusData).forEach(subject => {
    const topics = syllabusData[subject];
    if (!topics || topics.length === 0) return;
    totalTopics += topics.length;
    doneTopics += topics.filter(t => t.done).length;
    const groupDiv = document.createElement('div');
    groupDiv.className = 'syllabus-group';
    const subjectDone = topics.filter(t => t.done).length;
    groupDiv.innerHTML = `
      <div class="syllabus-group-header">
        <span>${subject}</span>
        <span class="syllabus-group-count">${subjectDone}/${topics.length}</span>
      </div>
      <ul class="syllabus-topic-list">
        ${topics.map(t => `
          <li class="${t.done ? 'topic-done' : ''}">
            <label>
              <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleSyllabusTopic('${subject}','${t.id}')">
              <span>${t.name}</span>
            </label>
            <button class="delete-topic" onclick="deleteSyllabusTopic('${subject}','${t.id}')" title="કાઢી નાખો">✕</button>
          </li>`).join('')}
      </ul>`;
    container.appendChild(groupDiv);
  });
  const pct = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;
  const bar = document.getElementById('syllabus-progress-bar');
  const label = document.getElementById('syllabus-progress-label');
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = `${pct}% પૂરું (${doneTopics}/${totalTopics})`;
}

// =========================================================
// 5. Flashcards
// =========================================================
let flashcards = loadFromStore(STORE_KEYS.flashcards, []);
let currentCardIndex = 0;
window.addFlashcardManual = function() {
  const front = document.getElementById('flash-front').value.trim();
  const back = document.getElementById('flash-back').value.trim();
  if (!front || !back) return;
  flashcards.push({ front, back });
  saveToStore(STORE_KEYS.flashcards, flashcards);
  document.getElementById('flash-front').value = '';
  document.getElementById('flash-back').value = '';
  currentCardIndex = flashcards.length - 1;
  renderFlashcard();
};
window.generateFlashcards = async function() {
  const topic = document.getElementById('flash-ai-topic').value.trim();
  if (!topic) return;
  const counter = document.getElementById('flashcard-counter');
  counter.textContent = "⏳ AI કાર્ડ બનાવી રહ્યું છે...";
  try {
    const prompt = `"${topic}" આ ટોપિક પર ડિપ્લોમા સ્ટુડન્ટ માટે 8 ફ્લેશકાર્ડ બનાવો. ફક્ત નીચે આપેલા ફોર્મેટમાં જ જવાબ આપો:
Q: <સવાલ>
A: <ટૂંકો જવાબ>
(દરેક કાર્ડ વચ્ચે ખાલી લાઈન રાખો)`;
    const result = await model.generateContent(prompt);
    const cards = parseFlashcardText((await result.response).text());
    if (cards.length === 0) alert("AI પાસેથી કાર્ડ બનાવવામાં તકલીફ થઈ.");
    else {
      flashcards.push(...cards);
      saveToStore(STORE_KEYS.flashcards, flashcards);
      currentCardIndex = flashcards.length - cards.length;
    }
    document.getElementById('flash-ai-topic').value = '';
    renderFlashcard();
  } catch (e) { alert("કાર્ડ બનાવવામાં ભૂલ થઈ."); renderFlashcard(); }
};
function parseFlashcardText(text) {
  const cards = [];
  text.split(/\n\s*\n/).forEach(block => {
    const q = block.match(/Q:\s*(.+)/i), a = block.match(/A:\s*(.+)/i);
    if (q && a) cards.push({ front: q[1].trim(), back: a[1].trim() });
  });
  return cards;
}
window.flipFlashcard = function() { const c = document.getElementById('flashcard'); if (c) c.classList.toggle('flipped'); };
window.nextFlashcard = function() { if (!flashcards.length) return; currentCardIndex = (currentCardIndex + 1) % flashcards.length; renderFlashcard(); };
window.prevFlashcard = function() { if (!flashcards.length) return; currentCardIndex = (currentCardIndex - 1 + flashcards.length) % flashcards.length; renderFlashcard(); };
window.shuffleFlashcards = function() {
  if (flashcards.length < 2) return;
  for (let i = flashcards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]]; }
  saveToStore(STORE_KEYS.flashcards, flashcards);
  currentCardIndex = 0; renderFlashcard();
};
function renderFlashcard() {
  const card = document.getElementById('flashcard');
  const counter = document.getElementById('flashcard-counter');
  if (!card || !counter) return;
  card.classList.remove('flipped');
  if (flashcards.length === 0) {
    counter.textContent = "0 / 0";
    card.querySelector('.flashcard-front').textContent = "કાર્ડ ઉમેરો અથવા AI થી બનાવો";
    card.querySelector('.flashcard-back').textContent = "";
    return;
  }
  if (currentCardIndex >= flashcards.length) currentCardIndex = 0;
  const cur = flashcards[currentCardIndex];
  counter.textContent = `${currentCardIndex + 1} / ${flashcards.length}`;
  card.querySelector('.flashcard-front').textContent = cur.front;
  card.querySelector('.flashcard-back').textContent = cur.back;
}

// =========================================================
// 6. My Projects (GitHub Linker + README generator)
// =========================================================
let projects = loadFromStore(STORE_KEYS.projects, []);
window.addProject = function() {
  const name = document.getElementById('proj-name').value.trim();
  const link = document.getElementById('proj-link').value.trim();
  const desc = document.getElementById('proj-desc').value.trim();
  if (!name) { alert("પ્રોજેક્ટ નામ નાખો."); return; }
  projects.push({ id: Date.now().toString(36), name, link, desc });
  saveToStore(STORE_KEYS.projects, projects);
  document.getElementById('proj-name').value = '';
  document.getElementById('proj-link').value = '';
  document.getElementById('proj-desc').value = '';
  renderProjects();
};
window.deleteProject = function(id) {
  projects = projects.filter(p => p.id !== id);
  saveToStore(STORE_KEYS.projects, projects);
  renderProjects();
};
window.generateReadme = async function(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  const out = document.getElementById('readme-output');
  out.innerHTML = "⏳ AI પ્રોફેશનલ README બનાવી રહ્યું છે...";
  try {
    const prompt = `આ પ્રોજેક્ટ માટે એક પ્રોફેશનલ GitHub README.md ફાઈલ બનાવો (English માં, proper markdown headings, features, installation, usage સાથે).
પ્રોજેક્ટ નામ: ${p.name}
ડિસ્ક્રિપ્શન: ${p.desc || 'N/A'}
GitHub લિંક: ${p.link || 'N/A'}`;
    const result = await model.generateContent(prompt);
    out.innerHTML = `<h3>📄 README for ${p.name}:</h3><div style="white-space:pre-wrap;font-family:var(--font-mono);font-size:0.85rem;">${escapeHtml((await result.response).text())}</div>`;
  } catch (e) { out.innerHTML = "<p style='color:red;'>README બનાવવામાં ભૂલ થઈ.</p>"; }
};
function renderProjects() {
  const list = document.getElementById('projects-list');
  if (!list) return;
  if (projects.length === 0) { list.innerHTML = "<p>હજુ કોઈ પ્રોજેક્ટ ઉમેર્યો નથી.</p>"; return; }
  list.innerHTML = projects.map(p => `
    <div class="project-card">
      <h4>📦 ${p.name}</h4>
      ${p.link ? `<a href="${p.link}" target="_blank" rel="noopener">${p.link}</a>` : '<span style="color:var(--slate)">GitHub લિંક નથી</span>'}
      ${p.desc ? `<p>${p.desc}</p>` : ''}
      <div class="card-actions">
        <button onclick="generateReadme('${p.id}')">📝 README બનાવો</button>
        <button onclick="deleteProject('${p.id}')">🗑️ કાઢો</button>
      </div>
    </div>`).join('');
}
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// =========================================================
// 7. DSA Corner
// =========================================================
window.explainDSA = async function(topic) { await runDSA(topic); };
window.explainDSACustom = async function() {
  const t = document.getElementById('dsa-topic').value.trim();
  if (!t) return;
  await runDSA(t);
};
async function runDSA(topic) {
  const out = document.getElementById('dsa-output');
  out.innerHTML = `⏳ AI "${topic}" સમજાવી રહ્યું છે...`;
  try {
    const prompt = `ડિપ્લોમા સ્ટુડન્ટ માટે "${topic}" ને એકદમ સરળ ગુજરાતીમાં દેશી/રિયલ-લાઈફ ઉદાહરણ સાથે સ્ટેપ-બાય-સ્ટેપ સમજાવો. પછી છેલ્લે એનો સાદો Python કોડ પણ આપો.`;
    const result = await model.generateContent(prompt);
    out.innerHTML = `<h3>💡 ${topic}</h3><div style="white-space:pre-wrap;">${(await result.response).text()}</div>`;
  } catch (e) { out.innerHTML = "<p style='color:red;'>સમજાવવામાં ભૂલ થઈ.</p>"; }
}

// =========================================================
// 8. Voice Input
// =========================================================
let recognition = null, isListening = false;
function setupVoiceRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = 'gu-IN'; rec.continuous = false; rec.interimResults = false;
  rec.onresult = (e) => {
    const t = e.results[0][0].transcript;
    const ta = document.getElementById('user-query');
    ta.value = ta.value ? ta.value + ' ' + t : t;
  };
  rec.onend = () => { isListening = false; updateMicButton(); };
  rec.onerror = () => { isListening = false; updateMicButton(); };
  return rec;
}
function updateMicButton() {
  const btn = document.getElementById('mic-btn');
  if (!btn) return;
  btn.classList.toggle('listening', isListening);
  btn.textContent = isListening ? '⏹️' : '🎤';
}
window.toggleVoiceInput = function() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("તમારું બ્રાઉઝર voice input સપોર્ટ કરતું નથી. Chrome વાપરો."); return; }
  if (!recognition) recognition = setupVoiceRecognition();
  if (isListening) { recognition.stop(); isListening = false; }
  else { recognition.start(); isListening = true; }
  updateMicButton();
};

// =========================================================
// INIT
// =========================================================
document.getElementById('semester-select').value = currentSemester;
populateSubjectDropdowns();
renderSyllabus();
updateGrowthTracker();
renderFlashcard();
renderProjects();
updateDashboard();