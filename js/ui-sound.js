/* =========================================================
   UI BUTTON SOUND
   Hover  -> assets/hover.mp3
   Click  -> assets/click.mp3
========================================================= */

(() => {
  const hoverSound = new Audio("assets/hover.mp3");
  const clickSound = new Audio("assets/click.mp3");

  hoverSound.preload = "auto";
  clickSound.preload = "auto";

  hoverSound.volume = 0.45;
  clickSound.volume = 0.7;

  function soundEnabled() {
    // Respect the sound toggle used by the main menu, if present.
    return localStorage.getItem("soundEnabled") !== "false";
  }

  function playHoverSound() {
    if (!soundEnabled()) return;

    hoverSound.currentTime = 0;
    hoverSound.play().catch(() => {});
  }

  function playClickSound() {
    if (!soundEnabled()) return;

    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  }

  function setupButtonSounds() {
    const buttons = document.querySelectorAll("button");

    buttons.forEach((button) => {
      // Prevent duplicate listeners if this script is ever initialized again.
      if (button.dataset.uiSoundReady === "true") return;

      button.dataset.uiSoundReady = "true";

      // Desktop hover.
      button.addEventListener("mouseenter", () => {
        if (!button.disabled) {
          playHoverSound();
        }
      });

      // Click / tap sound.
      button.addEventListener("click", () => {
        if (!button.disabled) {
          playClickSound();
        }
      });
    });
  }

  // All current level buttons are already in the DOM.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupButtonSounds);
  } else {
    setupButtonSounds();
  }
})();
