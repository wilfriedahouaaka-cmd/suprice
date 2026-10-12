document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ======================================================
     0. UTILITAIRES
     ====================================================== */
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const safePlay = async (media) => {
    if (!media) return false;
    try {
      await media.play();
      return true;
    } catch (err) {
      console.warn('Lecture média bloquée par le navigateur :', err.message);
      return false;
    }
  };

  /* ======================================================
     1. ÉLÉMENTS DOM
     ====================================================== */
  const envelopeScreen = document.getElementById('envelope-screen');
  const introWipe      = document.getElementById('intro-wipe');
  const welcomeSalon   = document.getElementById('welcome-salon');
  const museum         = document.getElementById('museum');
  const finalScreen    = document.getElementById('final-screen');
  const bgMusic        = document.getElementById('bg-music');
  const soundToggleBtn = document.getElementById('sound-toggle');
  const envelope       = document.getElementById('envelope');
  const openDoorsBtn   = document.getElementById('open-museum-doors-btn');
  const revealBtn      = document.getElementById('reveal-message-btn');
  const backBtn        = document.getElementById('back-to-museum-btn');
  const doorsClosing   = document.getElementById('doors-closing');

  let isMusicPlaying = false;
  let typingStarted  = false;
  let musicDuckedForModal = false;

  /* ======================================================
     2. MUSIQUE
     ====================================================== */
  if (soundToggleBtn && bgMusic) {
    soundToggleBtn.addEventListener('click', async () => {
      if (!isMusicPlaying) {
        const ok = await safePlay(bgMusic);
        if (ok) {
          isMusicPlaying = true;
          soundToggleBtn.textContent = '🔊';
          soundToggleBtn.setAttribute('aria-label', 'Couper la musique');
        }
      } else {
        bgMusic.pause();
        isMusicPlaying = false;
        soundToggleBtn.textContent = '🎵';
        soundToggleBtn.setAttribute('aria-label', 'Activer la musique');
      }
    });
  }

  /* ======================================================
     3. OUVERTURE ENVELOPPE → CHARGEMENT
     ====================================================== */
  async function openEnvelope() {
    if (envelope.classList.contains('is-open')) return;

    if (bgMusic) {
      const ok = await safePlay(bgMusic);
      if (ok) {
        isMusicPlaying = true;
        if (soundToggleBtn) {
          soundToggleBtn.textContent = '🔊';
          soundToggleBtn.setAttribute('aria-label', 'Couper la musique');
        }
      }
    }

    envelope.classList.add('is-open');
    await wait(580);

    envelopeScreen.classList.add('hidden');
    introWipe.classList.add('is-active');
    introWipe.setAttribute('aria-hidden', 'false');

    await startLoadingSequence();
  }

  if (envelope) {
    envelope.addEventListener('click', openEnvelope);
    envelope.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEnvelope();
      }
    });
  }

  /* ======================================================
     4. SÉQUENCE DE CHARGEMENT
     ====================================================== */
  async function startLoadingSequence() {
    const loadingBar  = document.getElementById('loadingBar');
    const loadingText = document.getElementById('loadingText');
    const progressBar = document.querySelector('[role="progressbar"]');
    let progress = 0;

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 7) + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);

          if (loadingBar)  loadingBar.style.width = '100%';
          if (loadingText) loadingText.textContent = 'Chargement du musée… 100%';
          if (progressBar) progressBar.setAttribute('aria-valuenow', '100');

          setTimeout(async () => {
            introWipe.classList.remove('is-active');
            introWipe.setAttribute('aria-hidden', 'true');
            await wait(200);
            welcomeSalon.classList.add('is-active');
            welcomeSalon.setAttribute('aria-hidden', 'false');
            resolve();
          }, 420);
        } else {
          if (loadingBar)  loadingBar.style.width = progress + '%';
          if (loadingText) loadingText.textContent = `Chargement du musée… ${progress}%`;
          if (progressBar) progressBar.setAttribute('aria-valuenow', progress);
        }
      }, 160);
    });
  }

  /* ======================================================
     5. OUVERTURE DES PORTES
     ====================================================== */
  async function openMuseumDoors() {
    if (welcomeSalon.classList.contains('doors-open')) return;

    const content = welcomeSalon.querySelector('.salon-content-inner');
    if (content) {
      content.style.transition = 'opacity 0.7s ease';
      content.style.opacity = '0';
    }

    await wait(650);
    welcomeSalon.classList.add('doors-open');

    await wait(900);
    museum.classList.add('is-visible');
    museum.setAttribute('aria-hidden', 'false');
    goToScreen('screen-accueil');

    await wait(1600);
    welcomeSalon.style.display = 'none';
  }

  if (openDoorsBtn) {
    openDoorsBtn.addEventListener('click', openMuseumDoors);
  }

  /* ======================================================
     6. ANIMATIONS AU DÉFILEMENT (isolées à la salle active)
     ====================================================== */
  let roomObserver = null;

  function setupRoomAnimations(roomEl) {
    if (roomObserver) {
      roomObserver.disconnect();
      roomObserver = null;
    }

    const scrollBox = roomEl.querySelector('.room-scroll');
    if (!scrollBox) return;

    const targets = roomEl.querySelectorAll('.room-intro, [class*="anim-"]');
    // On repart toujours d'un état masqué : l'entrée dans une salle
    // doit se sentir "vide" avant que le guide et les œuvres n'apparaissent.
    targets.forEach(el => el.classList.remove('is-visible'));

    roomObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
      });
    }, {
      root: scrollBox,
      threshold: 0.22,
      rootMargin: '0px 0px -10% 0px'
    });

    targets.forEach(el => roomObserver.observe(el));
  }

  /* ======================================================
     6.1 NAVIGATION ENTRE LES ÉCRANS DU MUSÉE (accueil + salles)
     ====================================================== */
  const roomDotsNav = document.getElementById('room-dots');

  function updateRoomDots(activeId) {
    if (!roomDotsNav) return;
    const activeScreen = document.getElementById(activeId);
    const isRoom = !!(activeScreen && activeScreen.dataset.room);

    roomDotsNav.classList.toggle('is-visible', isRoom);
    roomDotsNav.querySelectorAll('.room-dot').forEach(dot => {
      dot.classList.toggle('is-current', dot.dataset.goto === activeId);
    });
  }

  function goToScreen(targetId) {
    const target = document.getElementById(targetId);
    if (!target || !target.classList.contains('museum-screen')) return;

    const current = document.querySelector('.museum-screen.is-active');
    if (current === target) return;

    if (current) {
      current.classList.remove('is-active');
      current.setAttribute('aria-hidden', 'true');
    }

    target.classList.add('is-active');
    target.setAttribute('aria-hidden', 'false');

    const scrollBox = target.querySelector('.room-scroll') || target;
    scrollBox.scrollTop = 0;

    if (target.dataset.room) {
      // On laisse le temps à l'écran d'être vraiment affiché avant
      // d'observer, pour que l'apparition se joue à chaque entrée.
      requestAnimationFrame(() => setupRoomAnimations(target));
    } else if (roomObserver) {
      roomObserver.disconnect();
      roomObserver = null;
    }

    updateRoomDots(targetId);
  }

  document.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => goToScreen(btn.dataset.next));
  });

  document.querySelectorAll('[data-prev]').forEach(btn => {
    btn.addEventListener('click', () => goToScreen(btn.dataset.prev));
  });

  if (roomDotsNav) {
    roomDotsNav.querySelectorAll('.room-dot').forEach(dot => {
      dot.addEventListener('click', () => goToScreen(dot.dataset.goto));
    });
  }

  /* ======================================================
     7. MODALE MÉDIAS
     ====================================================== */
  const modalOverlay = document.getElementById('photo-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalImg     = document.getElementById('modal-img');
  const modalVideo   = document.getElementById('modal-video');
  const modalTitle   = document.getElementById('modal-title');
  const modalDesc    = document.getElementById('modal-desc');

  function openModal(photoBlock) {
    const exhibit = photoBlock.closest('.exhibit');
    if (!exhibit) return;

    const title = exhibit.querySelector('.exhibit__plaque-title')?.textContent || '';
    const popupText = exhibit.getAttribute('data-popup-text') || '';

    modalTitle.textContent = title;
    modalDesc.textContent = popupText;

    const videoEl = photoBlock.querySelector('video');
    const imgEl   = photoBlock.querySelector('img');

    if (videoEl) {
      modalImg.style.display = 'none';
      modalVideo.style.display = 'block';
      modalVideo.src = videoEl.getAttribute('src');

      if (bgMusic && !bgMusic.paused) {
        bgMusic.pause();
        musicDuckedForModal = true;
      }

      safePlay(modalVideo);
    } else if (imgEl) {
      modalVideo.style.display = 'none';
      modalVideo.pause();
      modalImg.style.display = 'block';
      modalImg.src = imgEl.src;
      modalImg.alt = imgEl.alt || '';
    }

    modalOverlay.classList.add('is-active');
    modalOverlay.setAttribute('aria-hidden', 'false');
    modalCloseBtn.focus();
  }

  function closeModal() {
    modalOverlay.classList.remove('is-active');
    modalOverlay.setAttribute('aria-hidden', 'true');
    if (modalVideo) {
      modalVideo.pause();
      modalVideo.removeAttribute('src');
    }
    if (musicDuckedForModal) {
      musicDuckedForModal = false;
      if (isMusicPlaying) safePlay(bgMusic);
    }
  }

  document.querySelectorAll('.interactive-photo').forEach(block => {
    block.addEventListener('click', () => openModal(block));
    block.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(block);
      }
    });
  });

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('is-active')) {
      closeModal();
    }
  });

  /* ======================================================
     8. MESSAGE FINAL + TYPING
     ====================================================== */
  async function revealFinalMessage() {
    if (doorsClosing) {
      doorsClosing.classList.add('is-closing');
      await wait(1000);
    }

    museum.style.opacity = '0';
    museum.style.display = 'none';
    finalScreen.classList.add('is-active');
    finalScreen.setAttribute('aria-hidden', 'false');
    startTypingEffect();

    if (doorsClosing) {
      await wait(500);
      doorsClosing.classList.remove('is-closing');
    }
  }

  if (revealBtn) {
    revealBtn.addEventListener('click', revealFinalMessage);
  }

  function startTypingEffect() {
    if (typingStarted) return;
    typingStarted = true;

    const text = `Chère Grace Yasmin,

Si tu es arrivée jusqu'ici, c'est que tu as traversé toute la galerie, salle après salle. Il ne reste plus que les murs vides et les mots, les vrais.

Il y a des personnes qui donnent envie de prendre le temps. Toi, tu en fais partie. Alors je t'ai construit un musée entier, parce que ce qu'on apprécie sincèrement, on ne l'envoie pas, on le montre.

Tu es mon œuvre d'art, pas parce que tu es parfaite, mais parce que tu es vraie. Merci d'avoir croisé mon chemin.

Avec toute ma reconnaissance,`;

    const typedEl = document.getElementById('typed-message');
    const signatureEl = document.getElementById('signature');

    if (!typedEl) return;

    typedEl.classList.add('is-typing');
    let i = 0;

    function type() {
      if (i < text.length) {
        typedEl.textContent += text.charAt(i);
        i++;
        setTimeout(type, 38);
      } else {
        typedEl.classList.remove('is-typing');
        if (signatureEl) signatureEl.classList.add('is-visible');
        showCloseButton();
      }
    }

    setTimeout(type, 900);
  }

  function showCloseButton() {
    const container = document.querySelector('.message-container');
    if (!container || document.getElementById('close-experience-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'close-experience-btn';
    btn.className = 'transition-btn';
    btn.textContent = 'Refermer les portes de la galerie';
    btn.style.cssText = 'margin-top:2.2rem; opacity:0; transition:opacity 0.9s ease;';
    btn.setAttribute('aria-label', 'Refermer les portes et terminer l\'expérience');

    container.appendChild(btn);
    setTimeout(() => btn.style.opacity = '1', 80);

    btn.addEventListener('click', closeExperience);
  }

  /* ======================================================
     9. CLÔTURE DE L'EXPÉRIENCE
     ====================================================== */
  async function closeExperience() {
    const CLOSE_DURATION = 2600;

    const messageBox = document.querySelector('.message');
    if (messageBox) {
      messageBox.style.transition = `opacity ${CLOSE_DURATION}ms ease`;
      messageBox.style.opacity = '0';
    }

    const closeBtn = document.getElementById('close-experience-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';

    if (welcomeSalon) {
      welcomeSalon.style.display = 'flex';
      welcomeSalon.style.zIndex = '200';

      const oldContent = welcomeSalon.querySelector('.salon-content-inner');
      if (oldContent) oldContent.remove();

      void welcomeSalon.offsetWidth;
      welcomeSalon.classList.remove('doors-open');
    }

    await wait(CLOSE_DURATION);

    finalScreen.classList.remove('is-active');
    finalScreen.setAttribute('aria-hidden', 'true');

    const vignette = document.createElement('div');
    vignette.id = 'closing-vignette';
    document.body.appendChild(vignette);
    setTimeout(() => vignette.classList.add('is-visible'), 40);

    const outro = document.createElement('div');
    outro.id = 'outro-box-container';
    outro.style.cssText = `
      position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
      z-index:250; text-align:center; width:85%; max-width:580px;
      color:#fff; opacity:0; transition:opacity 1s ease;
    `;
    outro.innerHTML = `
      <p id="typed-outro" style="font-size:1.15rem; font-style:italic; line-height:1.65; text-shadow:0 2px 12px rgba(0,0,0,0.75); margin-bottom:1.6rem;"></p>
      <button id="restart-experience-btn" class="transition-btn" style="opacity:0; transition:opacity 0.8s ease;">
        Revoir l'exposition
      </button>
    `;
    welcomeSalon.appendChild(outro);

    await wait(1100);
    outro.style.opacity = '1';

    const outroText = "Du fond du cœur, merci infiniment d'avoir pris le temps de parcourir cette galerie... et merci d'avoir partagé ce voyage musical jusqu'à sa toute dernière note.";
    const typedOutro = document.getElementById('typed-outro');
    let j = 0;

    function typeOutro() {
      if (j < outroText.length) {
        typedOutro.textContent += outroText.charAt(j);
        j++;
        setTimeout(typeOutro, 55);
      } else {
        const restartBtn = document.getElementById('restart-experience-btn');
        if (restartBtn) {
          restartBtn.style.opacity = '1';
          restartBtn.addEventListener('click', () => location.reload());
        }
      }
    }

    setTimeout(typeOutro, 1600);
  }

  /* ======================================================
     10. RETOUR AU MUSÉE
     ====================================================== */
  if (backBtn) {
    backBtn.addEventListener('click', async () => {
      finalScreen.classList.remove('is-active');
      finalScreen.setAttribute('aria-hidden', 'true');
      await wait(380);

      museum.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'instant' });
      await wait(40);
      museum.style.opacity = '1';
    });
  }

  /* ======================================================
     10.5 LUCIOLES DORÉES (décor uniquement, aucune interaction)
     ====================================================== */
  const firefliesBox = document.getElementById('fireflies');
  if (firefliesBox) {
    const COUNT = window.matchMedia('(max-width: 768px)').matches ? 14 : 20;
    for (let i = 0; i < COUNT; i++) {
      const d = document.createElement('i');
      d.style.cssText =
        `left:${Math.random() * 100}%;top:${Math.random() * 100}%;` +
        `--dx:${Math.random() * 60 - 30}px;--dy:${Math.random() * 60 - 30}px;` +
        `animation-duration:${6 + Math.random() * 8}s;animation-delay:-${Math.random() * 8}s`;
      firefliesBox.appendChild(d);
    }
  }

  /* ======================================================
     11. SÉCURITÉ ANTI-RECHARGE
     ====================================================== */
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
});