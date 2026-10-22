"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
	deleteDoc,
	 updateDoc,
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
const sendButton = document.getElementById("send-button");

let currentUser = null;
let currentStoryId = null;
let lastButton = null;

let isPlayingAll = false;
let timeoutId = null;

let buttonInCyclePlayingNow = null;

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


function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function addPlayButton(content) {
  const safeContent = escapeHtml(content);

  const playButton = `
<button class="play-button" data-story="${safeContent}" data-state="play">
  <svg width="16" height="16" viewBox="0 0 16 16">
    <polygon points="4,2 13,8 4,14" fill="currentColor"></polygon>
  </svg>
</button>`;

  return `${playButton}${safeContent}`;
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

function openWriteModal() {
  openModal.style.display = "none";

  modalWindowWrite.style.display = "flex";
  modalWindowWrite.style.height = "0px";
  modalWindowWrite.style.overflow = "hidden";

  textarea.placeholder = "Écrivez ou collez votre texte...";

  requestAnimationFrame(() => {
    modalWindowWrite.style.height = modalWindowWrite.scrollHeight + "px";
  });
}

// sendButton.addEventListener("click", function () {
//   openModal.style.display = "block";
// });

function closeWriteModal() {
  modalWindowWrite.style.height = modalWindowWrite.scrollHeight + "px";

  modalWindowWrite.style.overflow = "hidden";

  // Фиксируем текущую высоту перед началом анимации
  modalWindowWrite.offsetHeight;

  requestAnimationFrame(() => {
    modalWindowWrite.style.height = "0px";
  });
}

openModal.addEventListener("click", openWriteModal);

modalWindowWriteCloseButton.addEventListener("click", (e) => {
  e.preventDefault();
  closeWriteModal();
});

modalWindowWrite.addEventListener("transitionend", (e) => {
  if (e.propertyName !== "height") return;

  if (modalWindowWrite.style.height === "0px") {
    modalWindowWrite.style.display = "none";
    modalWindowWrite.style.overflow = "hidden";
    openModal.style.display = "block";
  } else {
    modalWindowWrite.style.height = "auto";
    modalWindowWrite.style.overflow = "visible";
  }
});

const storyForm = document.querySelector("#storyForm");

let isSubmitting = false;

storyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Игнорируем повторные нажатия
  if (isSubmitting) return;

  if (!textarea.value.trim()) return;

  // Блокируем новую отправку немедленно
  isSubmitting = true;
  sendButton.disabled = true;

  try {
    await addDoc(collection(db, "users", currentUser, "stories"), {
      content: textarea.value,
      createdAt: serverTimestamp(),
    });

    textarea.value = "";
    textarea.placeholder = "";
    textarea.style.height = "auto";

    closeWriteModal();

    await loadStories();
  } catch (error) {
    console.error("Erreur lors de l'envoi :", error);
    alert("Impossible d'envoyer votre histoire. Réessayez.");
  } finally {
    isSubmitting = false;
    sendButton.disabled = false;
  }
});

async function loadStories() {
  // CRITICAL SAFETY CLEAR: Stop any active speech or timers running right now
  window.speechSynthesis.cancel();
  isPlayingAll = false;
  if (timeoutId) clearTimeout(timeoutId);
  listenToAll.innerHTML = playIcon;
  lastButton = null;
  buttonInCyclePlayingNow = null;

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

  // Re-render HTML matching your updated format perfectly
  container.innerHTML = stories
    .map((story) => {
      const createdAt = story.createdAt
        ? story.createdAt.toDate().toISOString()
        : "";

      return `
        <p class="story">
				
				<button
				class="modal-window-delete-story-call-button"
				data-id="${story.id}"
				data-created-at="${createdAt}"
				data-story="${escapeHtml(story.content)}"
				>
				&times;
				</button>
				${addPlayButton(story.content)}
        </p>
				
<form class="form-edit-story" data-id="${story.id}">
		    <div class="cut cut-left"></div>
		    <div class="cut cut-right">
				 <button class="modal-window-delete-story-call-button">		&times; </button>
				</div>

		      <div class="story-editor" contenteditable="true" spellcheck="false">${escapeHtml(story.content)}</div>
					<div class="edit-story-button-container">
					
		      <button type="submit" class="edit-story-send-button">
<svg viewBox="0 0 24 24" width="13.5" height="13.5" overflow="visible" fill="none" stroke="currentColor" stroke-width="3.9" stroke-linecap="butt" stroke-linejoin="miter"><path d="M5.16 12.76 L13.56 22.56 L23.91 4.16"/></svg>		</button>
					</div>

	</form>
        <hr>
      `;
    })
    .join("");
}




document.addEventListener("dblclick", (e) => {
  const story = e.target.closest(".story");

  if (!story) return;
  if (e.target.closest("button")) return;

  const formEditStory = story.nextElementSibling;

	// if (!formEditStory?.classList.contains("formEditStory")) return;
	
	if (!formEditStory?.classList.contains("form-edit-story")) return;

  const isEditing = formEditStory.style.display === "block";

  story.style.display = isEditing ? "" : "none";
  formEditStory.style.display = isEditing ? "none" : "block";
});

// document.addEventListener("submit", (e) => {
//   const form = e.target.closest(".form-edit-story");
//   if (!form) return;

//   e.preventDefault(); 

//   form.style.display = "none";                       
//   form.previousElementSibling.style.display = "";    
// });




// document.addEventListener("submit", (e) => {
//   const form = e.target.closest(".form-edit-story");
//   if (!form) return;

//   e.preventDefault();

//   form.style.display = "none";
//   form.previousElementSibling.style.display = "";
// });



document.addEventListener("submit", async (e) => {
  const form = e.target.closest(".form-edit-story");
  if (!form) return;

  e.preventDefault();

  const storyId = form.dataset.id;
  const editor = form.querySelector(".story-editor");
  const editedContent = editor.textContent.trim();

  if (!storyId || !editedContent) {
    alert("Le texte ne peut pas être vide.");
    return;
  }

  const button = form.querySelector(".edit-story-send-button");
  button.disabled = true;

  try {
    // Сохраняем отредактированный текст в Firestore
    await updateDoc(
      doc(db, "users", currentUser, "stories", storyId),
      {
        content: editedContent,
        updatedAt: serverTimestamp(),
      }
    );

    // Перезагружаем истории с обновлёнными данными из базы
    await loadStories();

  } catch (error) {
    console.error("Erreur lors de la modification :", error);
    alert("Impossible d'enregistrer les modifications.");
    button.disabled = false;
  }
});




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

    if (i >= document.querySelectorAll("#storys-conatiner .story").length) {
      i = 0;
    }

    const stories = document.querySelectorAll("#storys-conatiner .story");
    const currentStory = stories[i];

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

    buttonInCyclePlayingNow = document
      .querySelectorAll("#storys-conatiner .story")
      [i].querySelector(".play-button");

    const msg = new SpeechSynthesisUtterance(
      document
        .querySelectorAll("#storys-conatiner .story")
        [i].querySelector(".play-button").dataset.story,
    );

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

function trimStory(text) {
  if (text.length <= 49) return text;

  let trimmed = text.slice(0, 50).replace(/\s+$/, "");

  let result = trimmed + "...";

  result = result.replace(/\.{4,}$/, "...");

  return result;
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-window-delete-story-call-button")) {
    overlayBackgroundForDeleteStory.style.display = "flex";

    currentStoryId = e.target.dataset.id;

    const storyCreatedAt = e.target.dataset.createdAt;

    const storyItself = e.target.dataset.story;

    modalWindowDeleteMessage.innerHTML = `
      Voulez-vous supprimer<br><br>
      <b>${trimStory(storyItself)}</b>&nbsp?
    `;
  }

  if (e.target.closest(".play-button")) {
    if (isPlayingAll && buttonInCyclePlayingNow) {
      buttonInCyclePlayingNow.innerHTML = playIcon;
      buttonInCyclePlayingNow.dataset.state = "play";
      window.speechSynthesis.cancel();
      clearTimeout(timeoutId);
      listenToAll.innerHTML = playIcon;
    }
    isPlayingAll = false;

    console.log(buttonInCyclePlayingNow);

    document.querySelectorAll("#storys-conatiner > *").forEach((child) => {
      if (child.querySelector(".play-button")) {
        child.style.background = "";
        child.style.color = "";
      }
    });

    clearTimeout(timeoutId);

    const button = e.target.closest(".play-button");
    const currentStory = button.dataset.story;

    const storyElement = button.closest(".story");
    storyElement.style.background = "#EAF0F9";

    window.speechSynthesis.cancel();

    listenToAll.innerHTML = playIcon;

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
  currentStoryId = null;

  // Dynamic refresh: instantly reflects the deletion on screen
  await loadStories();
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
