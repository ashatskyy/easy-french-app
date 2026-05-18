"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBVSORg-sm9n4YPIO2eQl-Dex8ryZRu0g4",
  authDomain: "easy-french-5b740.firebaseapp.com",
  databaseURL: "https://easy-french-5b740-default-rtdb.firebaseio.com",
  projectId: "easy-french-5b740",
  storageBucket: "easy-french-5b740.firebasestorage.app",
  messagingSenderId: "391514713558",
  appId: "1:391514713558:web:103331601fd7fca9c58877",
  measurementId: "G-7KY8MX2LQW",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

await setPersistence(auth, browserLocalPersistence);

const loginPage = document.querySelector("#loginPage");
const appPage = document.querySelector("#appPage");

const loginForm = document.querySelector("#loginForm");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const loginError = document.querySelector("#loginError");

let currentUser = null;

const overlayBackgroundForLogin = document.querySelector(
  ".overlay-background-for-login",
);

const listenToAll = document.getElementById("listen-to-all");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value;
  const password = passwordInput.value;

  loginError.textContent = "";

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    loginError.textContent = "E-mail ou mot de passe incorrect";
    console.error(error);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginPage.hidden = false;
    overlayBackgroundForLogin.hidden = false;
    appPage.hidden = true;
    return;
  }

  currentUser = user.uid;

  loginPage.hidden = true;
  overlayBackgroundForLogin.hidden = true;
  appPage.hidden = false;

  await loadStories();
});

function formatGreenwich(dateStr) {
  const date = new Date(dateStr);

  const day = String(date.getUTCDate()).padStart(2, "0");

  const monthNames = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];

  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day} ${month} ${year} à ${hours}:${minutes}:${seconds}`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const contentForAllPlay = [];

function addPlayButton(content) {
  const safeContent = escapeHtml(content);
  contentForAllPlay.push(content);
  const playButton = `
    <button class="play-button" data-story="${safeContent}" data-state="play">
  <svg width="16" height="16" viewBox="0 0 16 16">
    <polygon points="4,2 13,8 4,14" fill="currentColor"></polygon>
  </svg>
</button>
  `;

  return safeContent.replace(
    /(\S+)\s*$/,
    `<span class="no-break">$1&nbsp;${playButton}</span>`,
  );
}

const textarea = document.getElementById("textarea");

textarea.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

const openModal = document.getElementById("open-modal");
const modalWindowWrite = document.getElementById("modal-window-write");
const modalWindowWriteCloseButton = document.getElementById(
  "modal-window-write-close-button",
);

openModal.addEventListener("click", function () {
  modalWindowWrite.style.display = "block";
});

modalWindowWriteCloseButton.addEventListener("click", function () {
  modalWindowWrite.style.display = "none";
});

const storyForm = document.querySelector("#storyForm");

storyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!textarea.value.trim()) return;

  await addDoc(collection(db, "users", currentUser, "stories"), {
    content: textarea.value,
    createdAt: serverTimestamp(),
  });

  textarea.value = "";
  window.location.reload();
});

const container = document.getElementById("storys-conatiner");

async function loadStories() {
  const storiesQuery = query(
    collection(db, "users", currentUser, "stories"),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await getDocs(storiesQuery);

  const stories = snapshot.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data(),
    };
  });

  container.innerHTML = stories
    .map((story) => {
      const createdAt = story.createdAt
        ? story.createdAt.toDate().toISOString()
        : "";

      return `
        <p class="story">
          <b>${createdAt ? formatGreenwich(createdAt) : ""}</b> - 
          ${addPlayButton(story.content)}

          <button
            class="modal-window-delete-story-call-button"
            data-id="${story.id}"
            data-created-at="${createdAt}"
          >
            &times;
          </button>
        </p>
        <hr>
      `;
    })
    .join("");
}

const playAllIcon = `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <polygon points="4,2 13,8 4,14" fill="currentColor"></polygon>
  </svg>
`;

const stopIcon = `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="4" y="4" width="8" height="8" fill="currentColor"></rect>
  </svg>
`;

listenToAll.innerHTML = playAllIcon;

let isPlayingAll = false;
let timeoutId = null;

function turnStoryButtonToPlay(button) {
  if (!button) return;

  button.innerHTML = playAllIcon;
  button.dataset.state = "play";
}

listenToAll.addEventListener("click", () => {
  if (lastButton) {
    turnStoryButtonToPlay(lastButton);
    lastButton = null;
  }

  if (isPlayingAll) {
    isPlayingAll = false;
    window.speechSynthesis.cancel();
    clearTimeout(timeoutId);
    listenToAll.innerHTML = playAllIcon;
    return;
  }

  isPlayingAll = true;
  window.speechSynthesis.cancel();
  listenToAll.innerHTML = stopIcon;

  let i = 0;

  function speakNext() {
    if (!isPlayingAll) return;

    if (i >= contentForAllPlay.length) {
      isPlayingAll = false;
      listenToAll.innerHTML = playAllIcon;
      return;
    }

    const msg = new SpeechSynthesisUtterance(contentForAllPlay[i]);
    msg.lang = "fr-FR";
    msg.rate = 0.8;

    msg.onend = () => {
      i++;

      timeoutId = setTimeout(() => {
        speakNext();
      }, 2000);
    };

    window.speechSynthesis.speak(msg);
  }

  speakNext();
});

const overlayBackgroundForDeleteStory = document.querySelector(
  ".overlay-background-for-delete-story-mode",
);

const modalWindowDeleteMessage = document.querySelector(
  ".modal-window-delete-message",
);

const modalWindowDeleteButtonYes = document.querySelector(
  ".modal-window-delete-button-yes",
);

const modalWindowDeleteButtonNo = document.querySelector(
  ".modal-window-delete-button-no",
);

let currentStoryId = null;

let lastButton = null;

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-window-delete-story-call-button")) {
    overlayBackgroundForDeleteStory.style.display = "flex";

    currentStoryId = e.target.dataset.id;

    const storyCreatedAt = e.target.dataset.createdAt;

    modalWindowDeleteMessage.innerHTML = `
      Do you want to delete Story created at <br><br>
      <b>${formatGreenwich(storyCreatedAt)}</b>?
    `;
  }

  if (e.target.closest(".play-button")) {
    isPlayingAll = false;
    clearTimeout(timeoutId);

    window.speechSynthesis.cancel();

    listenToAll.innerHTML = playAllIcon;

    const button = e.target.closest(".play-button");
    const currentStory = button.dataset.story;

    if (lastButton && lastButton !== button) {
      lastButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16">
        <polygon points="4,2 13,8 4,14" fill="currentColor"></polygon>
      </svg>
    `;

      lastButton.dataset.state = "play";
    }

    lastButton = button;

    sound(currentStory, button);
  }
});

modalWindowDeleteButtonYes.addEventListener("click", async () => {
  if (!currentStoryId) return;

  await deleteDoc(doc(db, "users", currentUser, "stories", currentStoryId));

  overlayBackgroundForDeleteStory.style.display = "none";
  location.reload();
});

modalWindowDeleteButtonNo.addEventListener("click", () => {
  overlayBackgroundForDeleteStory.style.display = "none";
  currentStoryId = null;
});

function sound(text, button) {
  if (button.dataset.state === "stop") {
    window.speechSynthesis.cancel();

    button.innerHTML = `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <polygon points="4,2 13,8 4,14" fill="currentColor"></polygon>
  </svg>
`;
    button.dataset.state = "play";

    lastButton = null;
    return;
  }

  window.speechSynthesis.cancel();

  const msg = new SpeechSynthesisUtterance(text);

  msg.lang = "fr-FR";
  msg.rate = 0.8;

  msg.onstart = () => {
    button.innerHTML = `
     <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="4" y="4" width="8" height="8" fill="currentColor"></rect>
  </svg>
  `;

    button.dataset.state = "stop";
  };

  msg.onend = () => {
    button.innerHTML = `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <polygon points="4,2 13,8 4,14" fill="currentColor"></polygon>
  </svg>
`;
    button.dataset.state = "play";

    lastButton = null;
  };

  setTimeout(() => {
    window.speechSynthesis.speak(msg);
  }, 500);
}
