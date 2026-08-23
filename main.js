import { questions as originalQuestions } from './questions.js';

// App State
let currentQuestions = [...originalQuestions];
let currentQuestionIndex = 0;
let answers = {}; // question.id -> { selected, isCorrect }
let reviews = new Set(); // set of question.id
let optionsOrder = {}; // question.id -> array of options
let startTime = 0;
let timerInterval = null;

// Pagination state
let navCurrentPage = 1;
const navItemsPerPage = 40;

// DOM Elements
const screens = {
  start: document.getElementById('start-screen'),
  quiz: document.getElementById('quiz-screen'),
  end: document.getElementById('end-screen')
};

const elements = {
  scoreDisplay: document.getElementById('score'),
  questionText: document.getElementById('question-text'),
  optionsContainer: document.getElementById('options-container'),
  progressFill: document.getElementById('progress'),
  questionNumber: document.getElementById('question-number'),
  quizTimer: document.getElementById('quiz-timer'),
  
  // Navigation & Controls
  navGrid: document.getElementById('question-nav'),
  navPrev: document.getElementById('nav-prev'),
  navNext: document.getElementById('nav-next'),
  navPageInfo: document.getElementById('nav-page-info'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  
  // Mobile nav
  leftSidebar: document.getElementById('left-sidebar'),
  mobileMenuBtn: document.getElementById('mobile-menu-btn'),
  closeNavBtn: document.getElementById('close-nav-btn'),
  
  // Stats & Actions
  statDone: document.getElementById('stat-done'),
  statRem: document.getElementById('stat-rem'),
  reviewBtn: document.getElementById('review-btn'),
  shuffleBtn: document.getElementById('shuffle-btn'),
  submitBtn: document.getElementById('submit-btn'),
  
  // End Screen elements
  progressCircle: document.getElementById('progress-circle'),
  finalPercentage: document.getElementById('final-percentage'),
  resultTitle: document.getElementById('result-title'),
  resultSubtitle: document.getElementById('result-subtitle'),
  finalTime: document.getElementById('final-time'),
  finalMistakes: document.getElementById('final-mistakes'),
  finalCorrect: document.getElementById('final-correct'),
  restartBtn: document.getElementById('restart-btn'),
  retryBtn: document.getElementById('retry-btn'),
  
  startBtn: document.getElementById('start-btn'),
};

// Utility to shuffle array
function shuffleArray(array) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

// Timer
function startTimer() {
  startTime = Date.now();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    elements.quizTimer.textContent = `${mins}:${secs}`;
  }, 1000);
}
function stopTimer() {
  clearInterval(timerInterval);
}

// Show specific screen
function showScreen(screenName) {
  Object.values(screens).forEach(screen => {
    screen.classList.remove('active');
  });
  screens[screenName].classList.add('active');
}

// Initialize Quiz
function startQuiz() {
  currentQuestions = [...originalQuestions];
  resetState();
  showScreen('quiz');
  
  // Find which page the currentQuestionIndex is on
  navCurrentPage = Math.floor(currentQuestionIndex / navItemsPerPage) + 1;
  renderNav();
  loadQuestion(0);
  updateStats();
  startTimer();
}

function resetState() {
  answers = {};
  reviews = new Set();
  optionsOrder = {};
  currentQuestions.forEach(q => {
    optionsOrder[q.id] = shuffleArray(q.options || []);
  });
  elements.scoreDisplay.textContent = '0';
  elements.quizTimer.textContent = '00:00';
  currentQuestionIndex = 0;
  navCurrentPage = 1;
}

// Pagination logic
function renderNav() {
  elements.navGrid.innerHTML = '';
  const totalPages = Math.ceil(currentQuestions.length / navItemsPerPage) || 1;
  elements.navPageInfo.textContent = `${navCurrentPage} / ${totalPages}`;
  
  elements.navPrev.disabled = navCurrentPage === 1;
  elements.navNext.disabled = navCurrentPage === totalPages;
  
  const startIndex = (navCurrentPage - 1) * navItemsPerPage;
  const endIndex = Math.min(startIndex + navItemsPerPage, currentQuestions.length);
  
  for (let i = startIndex; i < endIndex; i++) {
    const q = currentQuestions[i];
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.textContent = i + 1;
    btn.onclick = () => {
      loadQuestion(i);
      // On mobile, close sidebar on selection
      elements.leftSidebar.classList.remove('open');
    };
    
    // Set states
    if (answers[q.id]) {
      if (answers[q.id].isCorrect) {
        btn.classList.add('answered-correct');
      } else {
        btn.classList.add('answered-wrong');
      }
    }
    if (reviews.has(q.id)) {
      btn.classList.add('review');
    }
    
    // Set active
    if (i === currentQuestionIndex) {
      btn.classList.add('active');
    }
    
    elements.navGrid.appendChild(btn);
  }
}

function changeNavPage(dir) {
  const totalPages = Math.ceil(currentQuestions.length / navItemsPerPage);
  navCurrentPage += dir;
  if (navCurrentPage < 1) navCurrentPage = 1;
  if (navCurrentPage > totalPages) navCurrentPage = totalPages;
  renderNav();
}

function updateNavHighlight() {
  // Check if we need to switch page automatically
  const targetPage = Math.floor(currentQuestionIndex / navItemsPerPage) + 1;
  if (targetPage !== navCurrentPage) {
    navCurrentPage = targetPage;
    renderNav();
  } else {
    // Just update classes
    const startIndex = (navCurrentPage - 1) * navItemsPerPage;
    const items = elements.navGrid.querySelectorAll('.nav-item');
    items.forEach((item, domIdx) => {
      const realIdx = startIndex + domIdx;
      if (realIdx === currentQuestionIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}

function updateStats() {
  const doneCount = Object.keys(answers).length;
  const remCount = currentQuestions.length - doneCount;
  elements.statDone.textContent = doneCount;
  elements.statRem.textContent = remCount;
  
  // Calculate score (each correct answer is 100 points)
  let currentScore = 0;
  Object.values(answers).forEach(ans => {
    if (ans.isCorrect) currentScore += 100;
  });
  elements.scoreDisplay.textContent = currentScore;
  
  // Progress bar based on questions answered
  const progressPercent = (doneCount / currentQuestions.length) * 100;
  elements.progressFill.style.width = `${progressPercent}%`;
}

// Load current question
function loadQuestion(index) {
  if (index < 0 || index >= currentQuestions.length) return;
  currentQuestionIndex = index;
  
  const q = currentQuestions[currentQuestionIndex];
  elements.questionText.textContent = q.question;
  elements.questionNumber.textContent = `Q ${currentQuestionIndex + 1}/${currentQuestions.length}`;
  
  updateNavHighlight();
  
  if (reviews.has(q.id)) {
    elements.reviewBtn.classList.add('active-review');
    elements.reviewBtn.textContent = 'UNMARK_REVIEW';
  } else {
    elements.reviewBtn.classList.remove('active-review');
    elements.reviewBtn.textContent = 'MARK_FOR_REVIEW';
  }

  // Render options
  elements.optionsContainer.innerHTML = '';
  const options = optionsOrder[q.id] || [];
  const existingAnswer = answers[q.id];
  
  options.forEach(optionText => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = optionText;
    
    if (existingAnswer) {
      btn.disabled = true;
      if (optionText === q.correct_answer) {
        btn.classList.add('correct');
      }
      if (existingAnswer.selected === optionText && !existingAnswer.isCorrect) {
        btn.classList.add('wrong');
      }
    } else {
      btn.onclick = () => handleAnswer(optionText, q);
    }
    
    elements.optionsContainer.appendChild(btn);
  });
  
  // Controls
  elements.prevBtn.disabled = currentQuestionIndex === 0;
  elements.nextBtn.disabled = currentQuestionIndex === currentQuestions.length - 1;
}

// Handle Answer Selection
function handleAnswer(selected, q) {
  const isCorrect = selected === q.correct_answer;
  answers[q.id] = { selected, isCorrect };
  
  // Update UI immediately for this question
  loadQuestion(currentQuestionIndex);
  renderNav();
  updateNavHighlight();
  updateStats();
  
  // Auto-advance if not on last question
  if (currentQuestionIndex < currentQuestions.length - 1) {
    setTimeout(() => {
      loadQuestion(currentQuestionIndex + 1);
    }, 600);
  }
}

// End Quiz
function endQuiz() {
  stopTimer();
  
  const correctCount = Object.values(answers).filter(a => a.isCorrect).length;
  const totalQuestions = currentQuestions.length;
  const mistakesCount = totalQuestions - correctCount; // Unanswered count as mistakes
  
  const percentage = Math.round((correctCount / totalQuestions) * 100) || 0;
  
  // Animate SVG ring (hardcoded radius 52 to avoid baseVal issues while hidden)
  const circle = elements.progressCircle;
  const radius = 52;
  const circumference = radius * 2 * Math.PI;
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Setting timeout to allow display change before transition
  setTimeout(() => {
    circle.style.strokeDashoffset = offset;
    
    if (percentage >= 80) {
      circle.style.stroke = 'var(--success)';
      elements.finalPercentage.style.color = 'var(--success)';
    } else {
      circle.style.stroke = 'var(--error)';
      elements.finalPercentage.style.color = 'var(--error)';
    }
  }, 100);

  elements.finalPercentage.textContent = `${percentage}%`;
  elements.finalMistakes.textContent = mistakesCount;
  elements.finalCorrect.textContent = correctCount;
  elements.finalTime.textContent = elements.quizTimer.textContent;
  
  if (percentage >= 80) {
    elements.resultTitle.textContent = "Amazing!";
    elements.resultSubtitle.textContent = "You are making great progress!";
  } else if (percentage >= 50) {
    elements.resultTitle.textContent = "Good effort!";
    elements.resultSubtitle.textContent = "You need 80% or above to pass. Keep trying!";
  } else {
    elements.resultTitle.textContent = "Keep Practicing!";
    elements.resultSubtitle.textContent = "You need 80% or above to pass. Review the lessons.";
  }

  showScreen('end');
}

// Initialization
// Event Listeners
elements.startBtn.addEventListener('click', startQuiz);
elements.restartBtn.addEventListener('click', startQuiz); 
elements.retryBtn.addEventListener('click', startQuiz);

elements.prevBtn.addEventListener('click', () => loadQuestion(currentQuestionIndex - 1));
elements.nextBtn.addEventListener('click', () => loadQuestion(currentQuestionIndex + 1));

elements.reviewBtn.addEventListener('click', () => {
  const qId = currentQuestions[currentQuestionIndex].id;
  if (reviews.has(qId)) {
    reviews.delete(qId);
  } else {
    reviews.add(qId);
  }
  loadQuestion(currentQuestionIndex); // update btn state
  renderNav(); // update nav state
  updateNavHighlight();
});

elements.shuffleBtn.addEventListener('click', () => {
  if (confirm('SHUFFLE ALL QUESTIONS? THIS WILL KEEP YOUR CURRENT PROGRESS.')) {
    currentQuestions = shuffleArray(currentQuestions);
    navCurrentPage = 1;
    renderNav();
    loadQuestion(0);
  }
});

elements.submitBtn.addEventListener('click', () => {
  endQuiz();
});

// Pagination event listeners
elements.navPrev.addEventListener('click', () => changeNavPage(-1));
elements.navNext.addEventListener('click', () => changeNavPage(1));

// Mobile Nav
elements.mobileMenuBtn.addEventListener('click', () => {
  elements.leftSidebar.classList.add('open');
});
elements.closeNavBtn.addEventListener('click', () => {
  elements.leftSidebar.classList.remove('open');
});
