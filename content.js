/**
 * Two subtitle lines over the Udemy player: the main language, and a smaller
 * second one underneath.
 *
 * Udemy's player shows one caption track at a time. Its course API lists every
 * track of a lecture, the same list the player's CC menu is built from, so
 * this reads two of them and draws them itself, synchronised to the <video>.
 * When the course has no track in the second language, Chrome's built-in
 * on-device translator fills in, if this Chrome has one.
 */
(() => {
  'use strict';
  if (window.__dualSubsLoaded) return;
  window.__dualSubsLoaded = true;

  const { parseVtt, textAt, pickTrack, defaultSettings } = globalThis.DualSubs;

  // Sizes are % of a base that follows the player's height. `margin` is the
  // gap under the subtitles, % of the player's height: from the bottom edge
  // when Udemy's control bar is hidden, from the bar when it is showing.
  const DEFAULTS = defaultSettings(chrome.i18n.getUILanguage());

  let settings = { ...DEFAULTS };
  const state = {
    lectureId: null,
    video: null,
    overlay: null,
    resize: null,
    primary: { cues: [], info: null, error: null },
    secondary: { cues: [], info: null, error: null, translated: false },
    loadToken: 0,
    frame: 0,
  };

  /* ---------------------------------------------------------------------- */
  /* Udemy API                                                              */
  /* ---------------------------------------------------------------------- */

  function lectureIdFromUrl() {
    return location.pathname.match(/\/learn\/lecture\/(\d+)/)?.[1] ?? null;
  }

  async function apiGet(path) {
    const headers = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    // Udemy's own web app sends this cookie as a bearer token.
    const token = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/)?.[1];
    if (token) {
      headers.Authorization = `Bearer ${decodeURIComponent(token)}`;
      headers['X-Udemy-Authorization'] = `Bearer ${decodeURIComponent(token)}`;
    }
    const response = await fetch(new URL(path, location.origin), { credentials: 'include', headers });
    if (!response.ok) throw new Error(`Udemy API HTTP ${response.status}`);
    return response.json();
  }

  let courseIdPromise = null;
  function courseId() {
    if (!courseIdPromise) {
      courseIdPromise = (async () => {
        const app = document.querySelector('[data-module-id="course-taking"]');
        try {
          const id = Number(JSON.parse(app?.dataset.moduleArgs || '{}').courseId);
          if (id) return id;
        } catch {
          // fall through
        }
        const fromBody = Number(document.body?.dataset.clpCourseId);
        if (fromBody) return fromBody;
        const slug = location.pathname.match(/^\/course\/([^/]+)/)?.[1];
        const course = await apiGet(`/api-2.0/courses/${encodeURIComponent(slug)}/?fields[course]=id`);
        if (!course?.id) throw new Error('course id not found');
        return course.id;
      })().catch((error) => {
        courseIdPromise = null; // retry on the next lecture
        throw error;
      });
    }
    return courseIdPromise;
  }

  async function lectureCaptions(lectureId) {
    const id = await courseId();
    const lecture = await apiGet(
      `/api-2.0/users/me/subscribed-courses/${id}/lectures/${lectureId}/?fields[lecture]=asset&fields[asset]=captions`,
    );
    return lecture?.asset?.captions ?? [];
  }

  async function fetchCues(url) {
    const reply = await chrome.runtime.sendMessage({ type: 'FETCH_VTT', url });
    if (!reply?.ok) throw new Error(reply?.error || 'subtitle file unavailable');
    return parseVtt(reply.text);
  }

  /* ---------------------------------------------------------------------- */
  /* On-device translation, when the course lacks the second language        */
  /* ---------------------------------------------------------------------- */

  let translator = null;

  async function makeTranslator(source, target) {
    if (!('Translator' in self)) return null;
    const options = { sourceLanguage: source, targetLanguage: target };
    const availability = await self.Translator.availability(options);
    if (availability === 'unavailable') return null;
    if (availability === 'available') return self.Translator.create(options);
    // The model needs downloading, which Chrome only starts from a user
    // gesture: wait for the next click on the page.
    return new Promise((resolve) => {
      const go = () => self.Translator.create(options).then(resolve, () => resolve(null));
      window.addEventListener('pointerdown', go, { once: true, capture: true });
    });
  }

  /** Translate the main track cue by cue, starting from where the video is. */
  async function translateInto(slot, cues, token) {
    const source = settings.primary.split('_')[0];
    const target = settings.secondary.split('_')[0];
    translator?.destroy?.();
    translator = await makeTranslator(source, target);
    if (!translator || token !== state.loadToken) return false;

    slot.cues = cues.map((cue) => ({ ...cue, text: '' }));
    slot.translated = true;
    const now = state.video?.currentTime ?? 0;
    const first = Math.max(0, cues.findIndex((cue) => cue.end > now));
    const order = [...cues.keys()].slice(first).concat([...cues.keys()].slice(0, first));

    (async () => {
      for (const i of order) {
        if (token !== state.loadToken) return;
        try {
          slot.cues[i].text = await translator.translate(cues[i].text);
        } catch {
          return;
        }
      }
    })();
    return true;
  }

  /* ---------------------------------------------------------------------- */
  /* Loading a lecture                                                      */
  /* ---------------------------------------------------------------------- */

  /** An error as the popup reports it: a code to translate, plus the raw detail. */
  function failure(code, error) {
    return { code, detail: String(error?.message || error) };
  }

  async function loadLecture(lectureId) {
    const token = ++state.loadToken;
    state.primary = { cues: [], info: null, error: null };
    state.secondary = { cues: [], info: null, error: null, translated: false };
    render();

    let captions;
    try {
      captions = await lectureCaptions(lectureId);
    } catch (error) {
      if (token === state.loadToken) state.primary.error = failure('api', error);
      return;
    }
    if (token !== state.loadToken) return;

    const primary = pickTrack(captions, settings.primary);
    const secondary = pickTrack(captions, settings.secondary);
    state.primary.info = primary;
    state.secondary.info = secondary;

    if (!primary) state.primary.error = { code: 'noTrack', lang: settings.primary };

    await Promise.all([
      primary &&
        fetchCues(primary.url).then(
          (cues) => token === state.loadToken && (state.primary.cues = cues),
          (error) => token === state.loadToken && (state.primary.error = failure('file', error)),
        ),
      secondary &&
        fetchCues(secondary.url).then(
          (cues) => token === state.loadToken && (state.secondary.cues = cues),
          (error) => token === state.loadToken && (state.secondary.error = failure('file', error)),
        ),
    ]);
    if (token !== state.loadToken) return;

    if (!secondary && settings.translateFallback && state.primary.cues.length > 0) {
      const ok = await translateInto(state.secondary, state.primary.cues, token).catch(() => false);
      if (!ok && token === state.loadToken) {
        state.secondary.error = { code: 'noTranslator', lang: settings.secondary };
      }
    } else if (!secondary) {
      state.secondary.error = { code: 'noTrack', lang: settings.secondary };
    }
    render();
  }

  /* ---------------------------------------------------------------------- */
  /* Drawing                                                                */
  /* ---------------------------------------------------------------------- */

  function ensureOverlay(video) {
    const host = video.parentElement;
    if (!host) return null;
    if (state.overlay && state.overlay.parentElement === host) return state.overlay;

    state.overlay?.remove();
    state.resize?.disconnect();

    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const overlay = document.createElement('div');
    overlay.className = 'dualsubs-overlay';
    for (const which of ['primary', 'secondary']) {
      const line = document.createElement('div');
      line.className = `dualsubs-line dualsubs-${which}`;
      overlay.appendChild(line);
    }
    host.appendChild(overlay);

    // The base size follows the player, so fullscreen scales the text up.
    state.resize = new ResizeObserver(() => applyLayout());
    state.resize.observe(host);
    state.overlay = overlay;
    applyLayout();
    return overlay;
  }

  function applyLayout() {
    const overlay = state.overlay;
    if (!overlay) return;
    const height = overlay.parentElement?.clientHeight || 400;
    const base = Math.min(44, Math.max(13, height * 0.048));
    overlay.style.setProperty('--dualsubs-primary', `${(base * settings.primarySize) / 100}px`);
    overlay.style.setProperty('--dualsubs-secondary', `${(base * settings.secondarySize) / 100}px`);
    overlay.style.setProperty('--dualsubs-primary-width', `${settings.primaryWidth}%`);
    overlay.style.setProperty('--dualsubs-secondary-width', `${settings.secondaryWidth}%`);
  }

  /* ---------------------------------------------------------------------- */
  /* Following Udemy's control bar                                          */
  /* ---------------------------------------------------------------------- */

  // Udemy's class names carry a build hash (`control-bar--control-bar--a1b2`),
  // hence substring matches. The last two are generic player conventions.
  const CONTROL_BAR = [
    '[class*="control-bar--control-bar--"]',
    '[data-purpose="video-controls"]',
    '.vjs-control-bar',
    '[class*="control-bar"]',
  ];

  let controlBar = null;
  let lastActivity = 0;

  /** The bar: a wide, short strip near the player, searched from a few levels up. */
  function findControlBar(host) {
    let root = host;
    for (let i = 0; i < 4 && root.parentElement; i += 1) root = root.parentElement;
    const width = host.clientWidth;
    for (const selector of CONTROL_BAR) {
      for (const element of root.querySelectorAll(selector)) {
        const rect = element.getBoundingClientRect();
        if (rect.width >= width * 0.5 && rect.height >= 16 && rect.height <= 200) return element;
      }
    }
    return null;
  }

  /** Shown, as opposed to faded out: Udemy hides the bar with opacity or visibility. */
  function isShown(element) {
    let node = element;
    for (let i = 0; i < 3 && node; i += 1, node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.1) return false;
    }
    return element.getBoundingClientRect().height > 0;
  }

  /**
   * Sit just above the control bar while it shows, and drop to the bottom of
   * the picture when it slides away — what Udemy's own captions do.
   */
  function placeOverlay() {
    const overlay = state.overlay;
    const host = overlay?.parentElement;
    if (!host) return;
    const box = host.getBoundingClientRect();
    const margin = (box.height * settings.margin) / 100;
    let bottom = margin;

    if (controlBar && !controlBar.isConnected) controlBar = null;
    if (controlBar) {
      if (isShown(controlBar)) {
        const bar = controlBar.getBoundingClientRect();
        bottom = Math.max(margin, box.bottom - bar.top + margin / 2);
      }
    } else if (state.video?.paused || Date.now() - lastActivity < 2500) {
      // No bar found: assume it shows while paused or while the mouse moves.
      bottom = Math.max(margin, box.height * 0.12);
    }
    const value = `${Math.round(bottom)}px`;
    if (overlay.style.bottom !== value) overlay.style.bottom = value;
  }

  function setLine(element, text) {
    if (element.textContent !== text) element.textContent = text;
    element.style.display = text ? '' : 'none';
  }

  function render() {
    const video = state.video;
    document.documentElement.classList.toggle('dualsubs-hide-native', settings.enabled && settings.hideNative);
    if (!video) return;
    const overlay = ensureOverlay(video);
    if (!overlay) return;
    overlay.style.display = settings.enabled ? '' : 'none';
    if (!settings.enabled) return;

    const time = video.currentTime;
    setLine(overlay.children[0], textAt(state.primary.cues, time));
    setLine(overlay.children[1], textAt(state.secondary.cues, time));
    placeOverlay();
  }

  /**
   * Every frame, paused or not: the control bar slides in and out on mouse
   * movement while paused too. Chrome stops the frames of a hidden tab.
   */
  function loop() {
    render();
    state.frame = state.video ? requestAnimationFrame(loop) : 0;
  }

  function attachVideo(video) {
    if (state.video === video) return;
    state.video = video;
    controlBar = null;
    const host = video.parentElement?.parentElement ?? video.parentElement;
    host?.addEventListener('mousemove', () => (lastActivity = Date.now()), { passive: true });
    if (!state.frame) loop();
  }

  /* ---------------------------------------------------------------------- */
  /* Watching for lectures — Udemy changes lecture without reloading        */
  /* ---------------------------------------------------------------------- */

  function tick() {
    const video = document.querySelector('video');
    if (video) attachVideo(video);
    const lectureId = lectureIdFromUrl();
    if (lectureId && lectureId !== state.lectureId) {
      state.lectureId = lectureId;
      loadLecture(lectureId);
    }
    if (state.video && !state.video.isConnected) state.video = null;
    // Looked for once a second, not every frame: the bar may render late.
    if (state.video && !controlBar && state.overlay?.parentElement) {
      controlBar = findControlBar(state.overlay.parentElement);
    }
  }

  chrome.storage.sync.get(DEFAULTS, (stored) => {
    settings = { ...DEFAULTS, ...stored };
    tick();
    setInterval(tick, 1000);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      settings[key] = newValue === undefined ? DEFAULTS[key] : newValue;
    }
    applyLayout();
    // Only a change of language needs the tracks fetched again.
    const reload = ['primary', 'secondary', 'translateFallback'].some((key) => key in changes);
    if (reload && state.lectureId) loadLecture(state.lectureId);
    render();
  });

  // The popup asks what is loaded, to show it.
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'DUALSUBS_STATUS') return false;
    const describe = (slot) => ({
      label: slot.info?.label ?? null,
      translated: slot.translated,
      auto: !!slot.info?.auto,
      cues: slot.cues.length,
      error: slot.error,
    });
    sendResponse({
      lectureId: state.lectureId,
      hasVideo: !!state.video,
      primary: describe(state.primary),
      secondary: describe(state.secondary),
    });
    return false;
  });
})();
