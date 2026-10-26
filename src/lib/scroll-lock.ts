/**
 * Freeze page scrolling while a sheet or dialog is open. The shell scrolls
 * inside `main`, so hiding the body alone would leave the page behind moving.
 * Returns the function that restores both.
 */
export function lockPageScroll() {
  const main = document.querySelector("main");
  const bodyOverflow = document.body.style.overflow;
  const mainOverflow = main?.style.overflow ?? "";

  document.body.style.overflow = "hidden";

  if (main) {
    main.style.overflow = "hidden";
  }

  return () => {
    document.body.style.overflow = bodyOverflow;

    if (main) {
      main.style.overflow = mainOverflow;
    }
  };
}
