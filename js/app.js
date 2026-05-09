    const API_URL = "https://api.anthropic.com/v1/messages";

    // ======================== NAVIGATION ========================
    function showPage(name) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + name).classList.add('active');
      if (name === 'analytics') renderCharts();
      window.scrollTo(0, 0);
    }

    function openAgent(agentId) {
      showPage('chat');
      const agentBtns = document.querySelectorAll('.agent-btn');
      agentBtns.forEach(btn => btn.classList.remove('active'));
      const agentMap = { teacher: 0, doubt: 1, notes: 2, motivation: 3, planner: 4 };
      if (agentMap[agentId] !== undefined) {
        agentBtns[agentMap[agentId]].classList.add('active');
        switchAgentById(agentId);
      }
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    }

    // ======================== CHAT ========================
    let currentAgent = 'teacher';
    const agentProfiles = {
      teacher: { name: 'Teacher AI', desc: 'Explains concepts clearly', icon: '👩‍🏫', bg: 'rgba(124,106,247,0.12)', system: 'You are Teacher AI, a brilliant educational assistant. Explain concepts simply, step-by-step. Always offer 3 modes: Easy (beginner), Exam (concise), Detailed (deep dive). Start responses with which mode you\'re using. Be encouraging and clear. Keep responses concise but complete.' },
      doubt: { name: 'Doubt Solver', desc: 'Step-by-step problem solver', icon: '🤖', bg: 'rgba(248,113,113,0.1)', system: 'You are Doubt Solver AI, specialized in solving academic problems step-by-step. Show all working. For math/science, number each step clearly. End with a summary of the method used. Be precise and educational.' },
      notes: { name: 'Notes AI', desc: 'Summarizes and structures notes', icon: '📚', bg: 'rgba(45,212,191,0.1)', system: 'You are Notes AI. Summarize text clearly, create flashcard-style Q&A, extract key points with bullets. Structure output well. Be concise and highlight the most important concepts.' },
      motivation: { name: 'Motivation AI', desc: 'Your study coach', icon: '🌟', bg: 'rgba(244,114,182,0.1)', system: 'You are Motivation AI, a warm and encouraging study coach. Detect stress or burnout from messages and respond supportively. Give practical productivity tips. Celebrate achievements enthusiastically. Keep responses uplifting and brief.' },
      planner: { name: 'Planner AI', desc: 'Study schedule optimizer', icon: '📅', bg: 'rgba(96,165,250,0.1)', system: 'You are Planner AI. Create detailed, realistic study schedules. Consider weak subjects, exam dates, and daily capacity. Format schedules clearly with times and durations. Give practical, actionable advice.' }
    };

    function switchAgent(agentId, btn) {
      document.querySelectorAll('.agent-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      switchAgentById(agentId);
    }

    function switchAgentById(agentId) {
      currentAgent = agentId;
      const profile = agentProfiles[agentId];
      document.getElementById('agent-name').textContent = profile.name;
      document.getElementById('agent-desc').textContent = profile.desc;
      const icon = document.getElementById('agent-icon');
      icon.textContent = profile.icon;
      icon.style.background = profile.bg;
      const msgs = document.getElementById('chat-messages');
      msgs.innerHTML = `<div class="message"><div class="msg-avatar">${profile.icon}</div><div><div class="msg-bubble">Hi! I'm ${profile.name}. ${getWelcome(agentId)}</div><div class="msg-time">Just now</div></div></div>`;
    }

    function getWelcome(id) {
      const w = { teacher: 'Ask me to explain any concept — try "explain photosynthesis in easy mode" or "what is Newton\'s second law?"', doubt: 'Give me any problem to solve! I\'ll show step-by-step solutions. Try "solve x² + 5x + 6 = 0"', notes: 'Paste any text and I\'ll summarize it, make flashcards, or extract key points for you!', motivation: 'How are you feeling today? I\'m here to keep you motivated and productive! 💪', planner: 'Tell me about your exams and I\'ll build a personalized study schedule for you!' };
      return w[id] || 'How can I help you today?';
    }

    function setQuickPrompt(text) {
      document.getElementById('chat-input').value = text;
      document.getElementById('chat-input').focus();
    }

    function handleChatKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    }

    async function sendChatMessage() {
      const input = document.getElementById('chat-input');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      const msgs = document.getElementById('chat-messages');
      msgs.innerHTML += `<div class="message user"><div class="msg-avatar">ME</div><div><div class="msg-bubble">${escHtml(text)}</div><div class="msg-time">Just now</div></div></div>`;

      const loadId = 'load-' + Date.now();
      msgs.innerHTML += `<div class="message" id="${loadId}"><div class="msg-avatar">${agentProfiles[currentAgent].icon}</div><div><div class="loading-msg"><div class="spinner"></div> ${agentProfiles[currentAgent].name} is thinking…</div></div></div>`;
      msgs.scrollTop = msgs.scrollHeight;

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: agentProfiles[currentAgent].system,
            messages: [{ role: 'user', content: text }]
          })
        });
        const data = await res.json();
        const reply = data.content?.[0]?.text || 'Sorry, I had trouble responding. Please try again.';
        document.getElementById(loadId).outerHTML = `<div class="message"><div class="msg-avatar">${agentProfiles[currentAgent].icon}</div><div><div class="msg-bubble">${escHtml(reply)}</div><div class="msg-time">Just now</div></div></div>`;
      } catch (e) {
        document.getElementById(loadId).outerHTML = `<div class="message"><div class="msg-avatar">${agentProfiles[currentAgent].icon}</div><div><div class="msg-bubble" style="color:var(--coral)">Connection error. Check your network and try again.</div></div></div>`;
      }
      msgs.scrollTop = msgs.scrollHeight;
    }

    function escHtml(t) {
      return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }

    // ======================== QUIZ ========================
    let quizQuestions = [];
    let currentQ = 0;
    let score = 0;

    async function startQuiz() {
      const subject = document.getElementById('quiz-subject').value;
      const topic = document.getElementById('quiz-topic').value;
      const diff = document.getElementById('quiz-diff').value;
      const count = document.getElementById('quiz-count').value;

      const btn = document.getElementById('start-quiz-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Generating with AI…';

      try {
        const prompt = `Create ${count} multiple choice questions about ${subject} - ${topic} at ${diff} difficulty level. Return ONLY a JSON array, no markdown, no explanation. Format: [{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":0,"explanation":"..."}] where answer is the 0-based index of the correct option.`;
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || '';
        const clean = text.replace(/```json|```/g, '').trim();
        quizQuestions = JSON.parse(clean);
        currentQ = 0; score = 0;
        document.getElementById('quiz-setup-view').style.display = 'none';
        document.getElementById('quiz-active-view').style.display = 'block';
        renderQuestion();
      } catch (e) {
        alert('Failed to generate quiz. Please try again.');
      }
      btn.disabled = false;
      btn.innerHTML = 'Generate Quiz with AI →';
    }

    function renderQuestion() {
      const q = quizQuestions[currentQ];
      document.getElementById('q-counter').textContent = `Question ${currentQ + 1} of ${quizQuestions.length}`;
      document.getElementById('q-score-live').textContent = `Score: ${score}`;
      document.getElementById('q-progress').style.width = ((currentQ + 1) / quizQuestions.length * 100) + '%';
      document.getElementById('question-text').textContent = q.question;
      document.getElementById('explanation-box').style.display = 'none';
      document.getElementById('next-q-btn').style.display = 'none';
      const opts = document.getElementById('options-container');
      opts.innerHTML = '';
      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => selectAnswer(i, btn);
        opts.appendChild(btn);
      });
    }

    function selectAnswer(idx, btn) {
      const q = quizQuestions[currentQ];
      document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
      if (idx === q.answer) {
        btn.classList.add('correct'); score++;
      } else {
        btn.classList.add('wrong');
        document.querySelectorAll('.option-btn')[q.answer].classList.add('correct');
      }
      const expBox = document.getElementById('explanation-box');
      expBox.textContent = '💡 ' + q.explanation;
      expBox.style.display = 'block';
      document.getElementById('q-score-live').textContent = `Score: ${score}`;
      document.getElementById('next-q-btn').style.display = 'block';
    }

    function nextQuestion() {
      currentQ++;
      if (currentQ >= quizQuestions.length) showResult();
      else renderQuestion();
    }

    function showResult() {
      document.getElementById('quiz-active-view').style.display = 'none';
      document.getElementById('quiz-result-view').style.display = 'block';
      document.getElementById('final-score').textContent = `${score}/${quizQuestions.length}`;
      const pct = score / quizQuestions.length;
      const titleEl = document.getElementById('score-title');
      const msgEl = document.getElementById('score-msg');
      if (pct >= 0.8) { titleEl.textContent = '🎉 Excellent!'; msgEl.textContent = 'Outstanding performance! You have a strong grasp of this topic.'; }
      else if (pct >= 0.6) { titleEl.textContent = '👍 Good Job!'; msgEl.textContent = 'Solid performance. Review the questions you missed and keep practicing.'; }
      else { titleEl.textContent = '📖 Keep Practicing'; msgEl.textContent = 'Don\'t worry! Review the topic and try again. Each attempt improves your understanding.'; }
    }

    function restartQuiz() {
      document.getElementById('quiz-result-view').style.display = 'none';
      document.getElementById('quiz-setup-view').style.display = 'block';
    }

    // ======================== NOTES ========================
    let notesMode = 'summary';

    function selectMode(mode) {
      notesMode = mode;
      document.querySelectorAll('.action-chip').forEach(c => c.classList.remove('active'));
      document.getElementById('chip-' + mode).classList.add('active');
    }

    async function processNotes() {
      const text = document.getElementById('notes-input').value.trim();
      if (!text) { showToast('Please paste some text first!'); return; }
      const btn = document.getElementById('process-btn');
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Processing…';

      const prompts = {
        summary: `Summarize the following text in 3-5 clear paragraphs. Highlight the most important concepts. Use simple language.\n\nText: ${text}`,
        flashcards: `Create 6-8 flashcards from the following text. Return ONLY JSON array, no markdown: [{"q":"question","a":"answer"}]\n\nText: ${text}`,
        keypoints: `Extract 8-10 key points from the following text. Format as a numbered list. Each point should be concise (1-2 sentences).\n\nText: ${text}`,
        mindmap: `Create a mind map structure from the following text. Format as: Main Topic → Sub-topics → Details. Use clear hierarchy with arrows (→). Keep it organized.\n\nText: ${text}`
      };

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompts[notesMode] }] })
        });
        const data = await res.json();
        const reply = data.content?.[0]?.text || '';
        displayNotesOutput(reply, notesMode);
      } catch (e) {
        document.getElementById('notes-output').innerHTML = '<span style="color:var(--coral)">Error processing. Please try again.</span>';
      }
      btn.disabled = false; btn.innerHTML = 'Process with AI →';
    }

    function displayNotesOutput(reply, mode) {
      const out = document.getElementById('notes-output');
      if (mode === 'flashcards') {
        try {
          const clean = reply.replace(/```json|```/g, '').trim();
          const cards = JSON.parse(clean);
          out.innerHTML = '<div class="flashcard-stack">' + cards.map(c => `<div class="flashcard"><div class="fc-q">Q: ${escHtml(c.q)}</div><div class="fc-a">A: ${escHtml(c.a)}</div></div>`).join('') + '</div>';
        } catch { out.innerHTML = `<div class="summary-card">${escHtml(reply)}</div>`; }
      } else {
        out.innerHTML = `<div class="summary-card">${escHtml(reply)}</div>`;
      }
    }

    // ======================== PLANNER ========================
    async function generatePlan() {
      showToast('✨ AI regenerating your schedule…');
      // Simple mock regeneration
      setTimeout(() => showToast('📅 Schedule updated!'), 1500);
    }

    // ======================== ANALYTICS ========================
    function renderCharts() {
      const hoursData = [3.5, 4.0, 2.5, 5.0, 4.5, 3.0, 2.0];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const colors = ['#a89cff', '#a89cff', '#a89cff', '#a89cff', '#a89cff', '#60a5fa', '#5a5d6e'];
      const maxH = Math.max(...hoursData);
      const hChart = document.getElementById('hours-chart');
      hChart.innerHTML = hoursData.map((h, i) => `<div class="bar-wrap"><div class="bar" style="height:${(h / maxH) * 100}%;background:${colors[i]}"></div><div class="bar-label">${days[i]}</div></div>`).join('');

      const subjects = [
        { name: 'Physics', pct: 82, color: '#2dd4bf' },
        { name: 'Maths', pct: 58, color: '#a89cff' },
        { name: 'Chemistry', pct: 65, color: '#fbbf24' },
        { name: 'Biology', pct: 74, color: '#4ade80' },
        { name: 'English', pct: 90, color: '#60a5fa' }
      ];
      const sChart = document.getElementById('subject-chart');
      sChart.innerHTML = subjects.map(s => `<div class="subject-row"><div class="subject-name">${s.name}</div><div class="subject-bar-wrap"><div class="subject-bar" style="width:${s.pct}%;background:${s.color}"></div></div><div class="subject-pct">${s.pct}%</div></div>`).join('');
    }

    // ======================== MOTIVATION ========================
    const quotes = [
      { q: "The secret of getting ahead is getting started. You've already done that — now keep going!", a: "StudyMind AI", e: "💪" },
      { q: "Success is the sum of small efforts repeated day in and day out.", a: "Robert Collier", e: "🌟" },
      { q: "Believe you can and you're halfway there. The other half? Consistent study sessions.", a: "StudyMind AI", e: "🚀" },
      { q: "Education is the most powerful weapon which you can use to change the world.", a: "Nelson Mandela", e: "📚" },
      { q: "Don't watch the clock; do what it does. Keep going.", a: "Sam Levenson", e: "⏰" },
      { q: "Every expert was once a beginner. Your confusion today is your clarity tomorrow.", a: "StudyMind AI", e: "✨" }
    ];
    let quoteIdx = 0;
    function newQuote() {
      quoteIdx = (quoteIdx + 1) % quotes.length;
      const q = quotes[quoteIdx];
      document.getElementById('mot-emoji').textContent = q.e;
      document.getElementById('mot-quote').textContent = `"${q.q}"`;
      document.getElementById('mot-author').textContent = `— ${q.a}`;
    }

    // ======================== TIMER ========================
    let timerTotal = 25 * 60;
    let timerLeft = timerTotal;
    let timerRunning = false;
    let timerInterval = null;
    let timerLabel = 'Focus session';

    function setTimer(secs, label, btn) {
      timerTotal = secs; timerLeft = secs; timerLabel = label;
      document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTimer(); document.getElementById('timer-label').textContent = label;
      if (timerRunning) { clearInterval(timerInterval); timerRunning = false; document.getElementById('start-stop-btn').textContent = '▶ Start'; }
    }

    function renderTimer() {
      const m = Math.floor(timerLeft / 60).toString().padStart(2, '0');
      const s = (timerLeft % 60).toString().padStart(2, '0');
      document.getElementById('timer-display').textContent = `${m}:${s}`;
    }

    function toggleTimer() {
      const btn = document.getElementById('start-stop-btn');
      if (timerRunning) {
        clearInterval(timerInterval); timerRunning = false; btn.textContent = '▶ Start';
      } else {
        timerRunning = true; btn.textContent = '⏸ Pause';
        timerInterval = setInterval(() => {
          timerLeft--;
          renderTimer();
          if (timerLeft <= 0) {
            clearInterval(timerInterval); timerRunning = false;
            btn.textContent = '▶ Start';
            showToast('⏰ Timer done! Take a break.');
            timerLeft = timerTotal; renderTimer();
          }
        }, 1000);
      }
    }

    function resetTimer() {
      clearInterval(timerInterval); timerRunning = false;
      timerLeft = timerTotal; renderTimer();
      document.getElementById('start-stop-btn').textContent = '▶ Start';
    }

    // ======================== COUNTDOWN ========================
    function updateCountdown() {
      const exam = new Date('2026-05-21');
      const now = new Date();
      const diff = Math.ceil((exam - now) / (1000 * 60 * 60 * 24));
      document.getElementById('countdown-days').textContent = diff > 0 ? diff : '0';
    }
    updateCountdown();
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
    import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
    import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

    // Your web app's Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyBNg2FbRPDZ2kIbvN1rxkNl7cBqJ_hcmwM",
      authDomain: "studymind-ai-1dcb9.firebaseapp.com",
      projectId: "studymind-ai-1dcb9",
      storageBucket: "studymind-ai-1dcb9.firebasestorage.app",
      messagingSenderId: "998626741203",
      appId: "1:998626741203:web:73979c2df52f2e53517d26",
      measurementId: "G-8TJ2C0YDY4"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    const db = getFirestore(app);

    // Setup Google Login
    const loginBtn = document.getElementById('google-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider)
          .then(async (result) => {
            const user = result.user;
            showToast(`Welcome, ${user.displayName}!`);
            
            // Check if user profile exists in Firestore
            const userRef = doc(db, 'users', user.uid);
            try {
              const docSnap = await getDoc(userRef);
              let userData;
              
              if (!docSnap.exists()) {
                // Create new student profile
                userData = {
                  name: user.displayName,
                  email: user.email,
                  studyStreak: 1, // Start with 1 day streak
                  quizzesDone: 0,
                  avgScore: 0,
                  studyHours: 0,
                  createdAt: new Date().toISOString()
                };
                await setDoc(userRef, userData);
                console.log("Created new Firestore student profile!");
              } else {
                userData = docSnap.data();
                console.log("Loaded existing student profile from Firestore");
              }
              
              // Update Profile UI with Firestore Data
              const nameEl = document.getElementById('prof-name');
              const emailEl = document.getElementById('prof-email');
              const avatarEl = document.getElementById('prof-avatar');
              const streakEl = document.getElementById('prof-streak');
              const quizzesEl = document.getElementById('prof-quizzes');
              const scoreEl = document.getElementById('prof-score');
              const hoursEl = document.getElementById('prof-hours');
              
              if (nameEl) nameEl.textContent = userData.name || "Student Name";
              if (emailEl) emailEl.textContent = userData.email || "student@example.com";
              if (avatarEl && user.photoURL) {
                avatarEl.innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
              }
              if (streakEl) streakEl.textContent = `${userData.studyStreak || 0} Days`;
              if (quizzesEl) quizzesEl.textContent = userData.quizzesDone || 0;
              if (scoreEl) scoreEl.textContent = `${userData.avgScore || 0}%`;
              if (hoursEl) hoursEl.textContent = `${userData.studyHours || 0}h`;

              showPage('profile');
            } catch (err) {
              console.error("Firestore error: ", err);
              showToast("Error loading profile data");
            }
          }).catch((error) => {
            console.error(error);
            showToast(`Login failed: ${error.message}`);
          });
      });
    }

    // Report Functions
    function downloadReport() {
      showToast("📥 Preparing report download...");
      setTimeout(() => showToast("✓ Report downloaded as PDF!"), 1500);
    }
    
    function printReport() {
      window.print();
    }

    // Expose functions to global scope since this is a module
    window.showPage = showPage;
    window.openAgent = openAgent;
    window.switchAgent = switchAgent;
    window.switchAgentById = switchAgentById;
    window.setQuickPrompt = setQuickPrompt;
    window.handleChatKey = handleChatKey;
    window.sendChatMessage = sendChatMessage;
    window.startQuiz = startQuiz;
    window.selectAnswer = selectAnswer;
    window.nextQuestion = nextQuestion;
    window.restartQuiz = restartQuiz;
    window.selectMode = selectMode;
    window.processNotes = processNotes;
    window.generatePlan = generatePlan;
    window.newQuote = newQuote;
    window.setTimer = setTimer;
    window.toggleTimer = toggleTimer;
    window.resetTimer = resetTimer;
    window.downloadReport = downloadReport;
    window.printReport = printReport;
