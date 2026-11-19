/* =========================================================
   SERILINE — interazioni e animazioni (vanilla JS)
   ========================================================= */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  document.body.classList.add("is-loading");
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Loader ---------- */
  const loader = $(".loader");
  const pct = $(".loader__pct");
  const start = performance.now();
  const LOAD_MS = reduceMotion ? 200 : 1300;
  let loaded = false;
  (function tick(now) {
    if (loaded) return;
    const p = Math.min(1, (now - start) / LOAD_MS);
    pct.textContent = Math.round(p * 100);
    if (p < 1) requestAnimationFrame(tick);
  })(start);
  // chiusura a tempo: funziona anche se requestAnimationFrame è in pausa
  setTimeout(() => {
    loaded = true;
    pct.textContent = 100;
    loader.classList.add("is-done");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
    setTimeout(() => loader.remove(), 1100);
  }, LOAD_MS);

  /* ---------- Titoli divisi in parole ---------- */
  $$(".split").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`)
      .join(" ");
  });

  /* ---------- Comparsa allo scroll (con sfalsamento tra fratelli) ---------- */
  const groups = new Map();
  $$(".reveal-up").forEach((el) => {
    const parent = el.parentElement;
    const i = groups.get(parent) || 0;
    groups.set(parent, i + 1);
    el.style.setProperty("--d", `${Math.min(i, 6) * 0.08}s`);
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  $$(".reveal-up, .split").forEach((el) => io.observe(el));

  /* ---------- Contatori ---------- */
  const countIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const to = +el.dataset.to;
        const dur = reduceMotion ? 1 : 1800;
        const t0 = performance.now();
        (function step(now) {
          const p = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 4);
          el.textContent = Math.round(to * eased);
          if (p < 1) requestAnimationFrame(step);
        })(t0);
        countIO.unobserve(el);
      });
    },
    { threshold: 0.6 }
  );
  $$(".count").forEach((el) => countIO.observe(el));

  /* ---------- Parola che ruota nell'hero ---------- */
  const words = $$(".rotator em");
  let wi = 0;
  if (!reduceMotion && words.length > 1) {
    setInterval(() => {
      const cur = words[wi];
      wi = (wi + 1) % words.length;
      const next = words[wi];
      cur.classList.remove("is-active");
      cur.classList.add("is-leaving");
      next.classList.remove("is-leaving");
      next.classList.add("is-active");
      setTimeout(() => cur.classList.remove("is-leaving"), 900);
    }, 2400);
  }

  /* ---------- Navigazione ---------- */
  const nav = $(".nav");
  const burger = $(".nav__burger");
  const menu = $(".mobile-menu");
  let lastY = 0;

  const toggleMenu = (open) => {
    burger.setAttribute("aria-expanded", open);
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", !open);
    document.body.classList.toggle("menu-open", open);
  };
  burger.addEventListener("click", () => toggleMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

  const navLinks = $$(".nav__links a");
  const sections = navLinks.map((a) => $(a.getAttribute("href")));
  const sectionIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${e.target.id}`));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => s && sectionIO.observe(s));

  /* ---------- Scroll: nav, laboratorio orizzontale, timeline, WhatsApp ---------- */
  const lab = $(".lab");
  const track = $(".lab__track");
  const labProgress = $(".lab__progress");
  const timeline = $(".timeline");
  const tlLine = $(".timeline__line");
  const wa = $(".wa-float");
  const hero = $(".hero");

  /* Laboratorio: scorrimento orizzontale nativo (trackpad, touch, trascinamento, frecce) */
  const arrows = $$(".lab__arrow");
  const updateLab = () => {
    const max = track.scrollWidth - track.clientWidth;
    const p = max > 0 ? track.scrollLeft / max : 0;
    labProgress.style.setProperty("--p", p);
    arrows[0].disabled = track.scrollLeft <= 2;
    arrows[1].disabled = track.scrollLeft >= max - 2;
  };
  track.addEventListener("scroll", updateLab, { passive: true });

  const cardStep = () => {
    const card = $(".lab-card", track);
    return card ? card.offsetWidth + 24 : track.clientWidth * 0.8;
  };
  arrows.forEach((btn) =>
    btn.addEventListener("click", () =>
      track.scrollBy({ left: cardStep() * +btn.dataset.dir, behavior: reduceMotion ? "auto" : "smooth" })
    )
  );

  // trascinamento con il mouse (su touch lo scorrimento è già nativo)
  let dragX = 0, dragLeft = 0, dragging = false, moved = false;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    dragging = true; moved = false;
    dragX = e.clientX; dragLeft = track.scrollLeft;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragX;
    if (!moved && Math.abs(dx) > 4) { moved = true; track.classList.add("is-dragging"); }
    if (moved) track.scrollLeft = dragLeft - dx;
  });
  window.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    if (!moved) return;
    // riattiva lo snap e aggancia la scheda più vicina
    const left = track.scrollLeft;
    track.classList.remove("is-dragging");
    track.scrollLeft = left;
    const step = cardStep();
    track.scrollTo({ left: Math.round(left / step) * step, behavior: "smooth" });
  });

  // frecce da tastiera quando il carosello ha il focus
  track.tabIndex = 0;
  track.setAttribute("aria-label", "Reparti del laboratorio, scorri in orizzontale");
  track.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    track.scrollBy({ left: cardStep() * (e.key === "ArrowRight" ? 1 : -1), behavior: "smooth" });
  });

  const onScroll = () => {
    const y = window.scrollY;

    nav.classList.toggle("is-scrolled", y > 40);
    if (!document.body.classList.contains("menu-open")) {
      nav.classList.toggle("is-hidden", y > lastY && y > 400);
    }
    lastY = y;

    wa.classList.toggle("is-visible", y > hero.offsetHeight * 0.6);

    const tr = timeline.getBoundingClientRect();
    const tp = Math.min(1, Math.max(0, (window.innerHeight * 0.85 - tr.top) / (tr.height + window.innerHeight * 0.3)));
    tlLine.style.setProperty("--p", tp);
  };

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener("resize", () => { updateLab(); onScroll(); });
  window.addEventListener("load", () => { updateLab(); onScroll(); });
  updateLab();
  onScroll();

  /* ---------- Cursore e bottoni magnetici ---------- */
  if (finePointer && !reduceMotion) {
    const cursor = $(".cursor");
    let cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add("is-visible");
    });
    document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
    (function loop() {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      requestAnimationFrame(loop);
    })();
    $$("a, button, .service, .lab-card, .member").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });

    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener("mouseleave", () => (btn.style.transform = ""));
    });
  }

  /* ---------- Retino CMYK interattivo nell'hero ---------- */
  const canvas = $(".hero__canvas");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1, gap = 22;
  const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999 };
  const layers = [
    { color: "rgba(0,174,239,0.85)", ox: 0, oy: 0, phase: 0 },
    { color: "rgba(236,0,140,0.85)", ox: 0.5, oy: 0.25, phase: 2.1 },
    { color: "rgba(255,225,0,0.95)", ox: 0.25, oy: 0.5, phase: 4.2 },
  ];

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gap = W < 700 ? 18 : 24;
  };
  resize();
  window.addEventListener("resize", resize);

  hero.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  hero.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });

  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  let heroVisible = true;
  new IntersectionObserver(([e]) => (heroVisible = e.isIntersecting)).observe(hero);

  const draw = (t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "multiply";
    mouse.sx += (mouse.x - mouse.sx) * 0.08;
    mouse.sy += (mouse.y - mouse.sy) * 0.08;
    const time = t * 0.0004;
    const maxR = gap * 0.48;
    const mobile = W < 760;

    layers.forEach((L) => {
      ctx.beginPath();
      for (let y = -gap; y < H + gap; y += gap) {
        for (let x = -gap; x < W + gap; x += gap) {
          const px = x + L.ox * gap;
          const py = y + L.oy * gap;
          // onde morbide che si muovono nel tempo
          let v =
            Math.sin(px * 0.006 + time * 2 + L.phase) *
            Math.cos(py * 0.008 - time * 1.4 + L.phase * 0.5);
          v = v * 0.5 + 0.5;
          // densità maggiore a destra (lascia leggibile il titolo)
          const bias = mobile ? 0.06 + smooth(H * 0.45, H, py) * 0.9 : smooth(W * 0.25, W * 0.95, px);
          v *= bias;
          // il mouse "spinge" l'inchiostro
          const dx = px - mouse.sx, dy = py - mouse.sy;
          const d2 = dx * dx + dy * dy;
          v += Math.exp(-d2 / 18000) * 0.9;
          const r = Math.min(maxR, v * maxR);
          if (r < 0.6) continue;
          ctx.moveTo(px + r, py);
          ctx.arc(px, py, r, 0, Math.PI * 2);
        }
      }
      ctx.fillStyle = L.color;
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
  };

  if (reduceMotion) {
    draw(0);
  } else {
    (function frame(t) {
      if (heroVisible) draw(t);
      requestAnimationFrame(frame);
    })(0);
  }

  /* ---------- Form: compone una email ---------- */
  const form = $("#contact-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    ["f-name", "f-email", "f-msg"].forEach((id) => {
      const f = $("#" + id);
      const bad = !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value));
      f.parentElement.classList.toggle("is-error", bad);
      if (bad) ok = false;
    });
    if (!ok) return;
    const name = $("#f-name").value.trim();
    const service = $("#f-service").value;
    const subject = `Richiesta preventivo: ${service}`;
    const body = `${$("#f-msg").value.trim()}\n\n${name}\n${$("#f-email").value.trim()}`;
    window.location.href = `mailto:seriline@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();
