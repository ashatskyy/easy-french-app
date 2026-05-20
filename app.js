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

const overlayBackgroundForLogin = document.querySelector(
  ".overlay-background-for-login",
);
const container = document.getElementById("storys-conatiner");
const listenToAll = document.getElementById("listen-to-all-button");

let currentUser = null;
let currentStoryId = null;
let lastButton = null;

let isPlayingAll = false;
let timeoutId = null;

const contentForAllPlay = [];

const playIcon = `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <polygon points="4,2 13,8 4,14" fill="currentColor"></polygon>
  </svg>
`;

const stopIcon = `
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="4" y="4" width="8" height="8" fill="currentColor"></rect>
  </svg>
`;

//FORM HANDLING
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

//here we use story.content
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

async function loadStories() {
contentForAllPlay.length = 0;
  const storiesQuery = query(
    collection(db, "users", currentUser, "stories"),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await getDocs(storiesQuery);

  //stories массив их объектов
  const stories = snapshot.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data(),
    };
  });

  //HERE WE START TO FILL CONTAINER by JOIN in string all from array one by one
  container.innerHTML = stories
    .map((story) => {
      const createdAt = story.createdAt
        ? story.createdAt.toDate().toISOString()
        : "";

      return `
        <p class="story">
     
          ${addPlayButton(story.content)}

          <button
            class="modal-window-delete-story-call-button"
            data-id="${story.id}"
            data-created-at="${createdAt}"
						 data-story="${escapeHtml(story.content)}"
          >
            &times;
          </button>
        </p>
        <hr>
      `;
    })
    .join("");
}

listenToAll.innerHTML = playIcon;

function turnStoryButtonToPlay(button) {
  if (!button) return;

  button.innerHTML = playIcon;
  button.dataset.state = "play";
}

listenToAll.addEventListener("click", () => {
  // turn off previous played story button OK
  if (lastButton) {
    turnStoryButtonToPlay(lastButton);
    lastButton = null;
  }
  //here we turn off PlayAll but itself
  if (isPlayingAll) {
    isPlayingAll = false;
    window.speechSynthesis.cancel();
    clearTimeout(timeoutId);
    listenToAll.innerHTML = playIcon;

    //here we can turn off story stop buttons which are in the cycle
    document.querySelectorAll("#storys-conatiner > *").forEach((child) => {
      child.style.background = "";
      child.style.color = "";

      if (child.querySelector(".play-button")) {
        child.querySelector(".play-button").innerHTML = playIcon;

        child.querySelector(".play-button").dataset.state = "play";
      }
    });

    return;
  }

  isPlayingAll = true;
  window.speechSynthesis.cancel();
  listenToAll.innerHTML = stopIcon;

  let i = 0;

  function speakNext() {
    if (!isPlayingAll) return;

    const allChildren = document.querySelectorAll("#storys-conatiner > *");

    allChildren.forEach((child) => {
      child.style.background = "";
      child.style.color = "";
    });

    if (i >= contentForAllPlay.length) {
      isPlayingAll = false;
      listenToAll.innerHTML = playIcon;
      return;
    }

    const currentStory = allChildren[i * 2];
    const buttonInCycle = currentStory.querySelector(".play-button");

    if (currentStory) {
      currentStory.style.background = "#EAF0F9";

      buttonInCycle.innerHTML = `
     <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="4" y="4" width="8" height="8" fill="currentColor"></rect>
  </svg>
  `;

      buttonInCycle.dataset.state = "stop";
    }

    const msg = new SpeechSynthesisUtterance(contentForAllPlay[i]);
    msg.lang = "fr-FR";
    msg.rate = 0.8;

    msg.onend = () => {
      i++;

      timeoutId = setTimeout(() => {
        buttonInCycle.innerHTML = playIcon;

        buttonInCycle.dataset.state = "play";

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

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-window-delete-story-call-button")) {
    overlayBackgroundForDeleteStory.style.display = "flex";

    currentStoryId = e.target.dataset.id;

		const storyCreatedAt = e.target.dataset.createdAt;
		
		const storyItself = e.target.dataset.story;

console.log(storyItself);
    modalWindowDeleteMessage.innerHTML = `
      Voulez-vous supprimer<br><br>
      <b>${storyItself.length<=49? storyItself: storyItself.slice(0, 50)+"..."}</b>&nbsp?
    `;
  }

  const button = e.target.closest(".play-button");

  if (button) {
    isPlayingAll = false;

    document.querySelectorAll("#storys-conatiner > *").forEach((child) => {
      child.style.background = "";
      child.style.color = "";

      const playButton = child.querySelector(".play-button");

      if (playButton) {
        playButton.innerHTML = playIcon;
        playButton.dataset.state = "play";
      }
    });

    clearTimeout(timeoutId);

    window.speechSynthesis.cancel();

    listenToAll.innerHTML = playIcon;

    const currentStory = button.dataset.story;

    const storyElement = button.closest(".story");
    storyElement.style.background = "#EAF0F9";

    if (lastButton && lastButton !== button) {
      const lastStoryElement = lastButton.closest(".story");
      lastStoryElement.style.background = "transparent";

      lastButton.innerHTML = playIcon;

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
  const storyElement = button.closest(".story");

  if (button.dataset.state === "stop") {
    window.speechSynthesis.cancel();

    button.innerHTML = playIcon;
    button.dataset.state = "play";

    storyElement.style.background = "transparent";

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
    button.innerHTML = playIcon;
    button.dataset.state = "play";

    storyElement.style.background = "transparent";

    lastButton = null;
  };

  setTimeout(() => {
    window.speechSynthesis.speak(msg);
  }, 500);
}
