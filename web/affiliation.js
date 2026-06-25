/* ====================================================
     EDIT EVERYTHING HERE — each slide has its own image
     and its own pair of buttons (text + href).
     ==================================================== */

const AUTO_SCROLL_DELAY = 12; // seconds, 0 = off

const slides = [
  {
    image: "/img/1.jpg",
    btn1: { text: "Learn More", href: "#" },
    btn2: { text: "Buy Now", href: "#" },
  },
  {
    image: "/img/1.jpg",
    btn1: { text: "Learn More", href: "#" },
    btn2: { text: "Buy Now", href: "#" },
  },
  {
    image: "/img/1.jpg",
    btn1: { text: "Learn More", href: "#" },
    btn2: { text: "Buy Now", href: "#" },
  },
  {
    image: "/img/1.jpg",
    btn1: { text: "Learn More", href: "#" },
    btn2: { text: "Buy Now", href: "#" },
  },
  {
    image: "/img/1.jpg",
    btn1: { text: "Learn More", href: "#" },
    btn2: { text: "Buy Now", href: "#" },
  },
];

/* ==================== ENGINE — no need to touch below ==================== */

let current = 0;
let autoTimer = null;

function renderSlides() {
  document.getElementById("slides").innerHTML = slides
    .map((s) => `<div class="slide"><img src="${s.image}" alt="Hi"></div>`)
    .join("");
  document.getElementById("dots").innerHTML = slides
    .map(
      (_, i) =>
        `<div class="dot${i === current ? " active" : ""}" onclick="goToSlide(${i})"></div>`,
    )
    .join("");
  updateSlidePosition();
  updateButtons();
}

function updateSlidePosition() {
  if (current >= slides.length) current = 0;
  if (current < 0) current = slides.length - 1;
  document.getElementById("slides").style.transform =
    `translateX(-${current * 100}%)`;
  document
    .querySelectorAll(".dot")
    .forEach((d, i) => d.classList.toggle("active", i === current));
}

function updateButtons() {
  const s = slides[current];
  const b1 = document.getElementById("btn1");
  const b2 = document.getElementById("btn2");
  b1.textContent = s.btn1.text;
  b1.href = s.btn1.href;
  b2.textContent = s.btn2.text;
  b2.href = s.btn2.href;
}

function nextSlide() {
  current++;
  updateSlidePosition();
  updateButtons();
  restartAuto();
}
function prevSlide() {
  current--;
  updateSlidePosition();
  updateButtons();
  restartAuto();
}
function goToSlide(i) {
  current = i;
  updateSlidePosition();
  updateButtons();
  restartAuto();
}

function restartAuto() {
  clearInterval(autoTimer);
  if (AUTO_SCROLL_DELAY > 0) {
    autoTimer = setInterval(nextSlide, AUTO_SCROLL_DELAY * 1000);
  }
}

renderSlides();
restartAuto();
