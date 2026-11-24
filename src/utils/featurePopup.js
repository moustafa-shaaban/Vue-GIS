/**
 * Builds the content of a marker popup as real DOM nodes.
 *
 * Why not an HTML string? Titles and descriptions are user data (and can arrive via
 * the JSON import), so anything like `<img src=x onerror=...>` would execute if it
 * were interpolated into markup. Here every piece of user text goes through
 * `textContent`, which the browser never parses as HTML, and the click handlers are
 * attached with addEventListener (no inline onclick, no data-* lookups).
 */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text ?? "";
  return node;
}

function button(label, modifier, onClick) {
  const btn = el("button", `feature-popup__btn ${modifier}`, label);
  btn.type = "button"; // never submit a surrounding form
  btn.addEventListener("click", onClick);
  return btn;
}

export function buildFeaturePopup(feature, { onEdit, onDelete }) {
  const root = el("div", "feature-popup");

  root.appendChild(el("div", "feature-popup__title", feature.title));

  if (feature.description) {
    root.appendChild(
      el("div", "feature-popup__description", feature.description),
    );
  }

  const actions = el("div", "feature-popup__actions");
  actions.append(
    button("Edit", "feature-popup__btn--edit", () => onEdit(feature)),
    button("Delete", "feature-popup__btn--delete", () => onDelete(feature)),
  );
  root.appendChild(actions);

  return root;
}
