/**
 * Interrupt Sequence - 3 page interactive modal
 * Page 1: "WHAT THE FLOCK ARE YOU DOING?!?!" with chicken image
 * Page 2: Question/challenge
 * Page 3: Reflection/followup
 */

let currentInterruptPage = 1;
let interruptOverlayElement = null;

/**
 * Show the interrupt sequence overlay
 */
export function showInterruptSequence() {
  if (interruptOverlayElement) {
    return; // Already showing
  }

  currentInterruptPage = 1;

  // Create overlay container
  interruptOverlayElement = document.createElement('div');
  interruptOverlayElement.id = 'cooped-interrupt-overlay';
  interruptOverlayElement.className = 'page-1';

  const container = document.createElement('div');
  container.className = 'cooped-interrupt-container';

  // Create content area
  const content = document.createElement('div');
  content.className = 'cooped-interrupt-content';
  content.id = 'cooped-interrupt-content';

  container.appendChild(content);

  // Create navigation arrow at bottom
  const arrow = document.createElement('div');
  arrow.className = 'cooped-interrupt-arrow';
  arrow.innerHTML = '↓';
  container.appendChild(arrow);

  interruptOverlayElement.appendChild(container);

  // Add event listeners
  interruptOverlayElement.addEventListener('click', (e) => {
    // Don't advance if clicking the arrow specifically
    if (e.target === arrow) {
      advanceInterruptPage();
    } else if (!e.target.closest('button, input, textarea')) {
      // Advance on any click (except interactive elements)
      advanceInterruptPage();
    }
  });

  // Load CSS
  loadInterruptCSS();

  // Append to body
  document.body.appendChild(interruptOverlayElement);

  // Render first page
  renderInterruptPage(1);
}

/**
 * Load the interrupt overlay CSS
 */
function loadInterruptCSS() {
  if (document.getElementById('cooped-interrupt-css')) {
    return; // Already loaded
  }

  const link = document.createElement('link');
  link.id = 'cooped-interrupt-css';
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('src/content/interrupt-overlay.css');
  document.head.appendChild(link);
}

/**
 * Render a specific interrupt page
 */
function renderInterruptPage(pageNum) {
  const contentEl = document.getElementById('cooped-interrupt-content');
  if (!contentEl) return;

  contentEl.innerHTML = '';

  if (pageNum === 1) {
    renderPage1(contentEl);
  } else if (pageNum === 2) {
    renderPage2(contentEl);
  } else if (pageNum === 3) {
    renderPage3(contentEl);
  }

  // Update overlay class for background styling
  interruptOverlayElement.className = `page-${pageNum}`;
}

/**
 * Page 1: "WHAT THE FLOCK ARE YOU DOING?!?!"
 */
function renderPage1(container) {
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('src/assets/mascot/chicken_basic.png');
  img.alt = 'Cooped Chicken';
  img.className = 'cooped-interrupt-chicken';

  const text = document.createElement('div');
  text.className = 'cooped-interrupt-text';
  text.textContent = 'WHAT THE FLOCK ARE YOU DOING?!?!';

  container.appendChild(img);
  container.appendChild(text);
}

/**
 * Page 2: Question/Challenge
 * (To be implemented based on user requirements)
 */
function renderPage2(container) {
  const text = document.createElement('div');
  text.className = 'cooped-interrupt-text';
  text.textContent = 'Page 2: Challenge Question';
  text.style.fontSize = '24px';

  const description = document.createElement('div');
  description.style.color = '#333';
  description.style.fontSize = '16px';
  description.style.marginTop = '20px';
  description.textContent = '(Challenge question to be implemented)';

  container.appendChild(text);
  container.appendChild(description);
}

/**
 * Page 3: Reflection/Followup
 * (To be implemented based on user requirements)
 */
function renderPage3(container) {
  const text = document.createElement('div');
  text.className = 'cooped-interrupt-text';
  text.textContent = 'Page 3: Reflection';
  text.style.fontSize = '24px';

  const description = document.createElement('div');
  description.style.color = '#333';
  description.style.fontSize = '16px';
  description.style.marginTop = '20px';
  description.textContent = '(Reflection/followup content to be implemented)';

  container.appendChild(text);
  container.appendChild(description);
}

/**
 * Advance to next page or close if on last page
 */
function advanceInterruptPage() {
  if (currentInterruptPage < 3) {
    currentInterruptPage++;
    renderInterruptPage(currentInterruptPage);
  } else {
    // Close interrupt sequence
    closeInterruptSequence();
  }
}

/**
 * Close the interrupt sequence overlay
 */
export function closeInterruptSequence() {
  if (interruptOverlayElement && interruptOverlayElement.isConnected) {
    interruptOverlayElement.remove();
    interruptOverlayElement = null;
    currentInterruptPage = 1;
  }
}
