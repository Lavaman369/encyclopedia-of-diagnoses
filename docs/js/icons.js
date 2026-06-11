const ICON_COLS = 32;
const ICON_SRC_SIZE = 64;
const DISPLAY_SIZES = { sm: 45, md: 60, lg: 90, xl: 114 };

function calcStyle(index, displaySize) {
  const col = index % ICON_COLS;
  const row = Math.floor(index / ICON_COLS);
  const scale = displaySize / ICON_SRC_SIZE;
  const x = -(col * ICON_SRC_SIZE * scale);
  const y = -(row * ICON_SRC_SIZE * scale);
  const sheetW = 2048 * scale;
  const sheetH = 6144 * scale;
  return `background-position:${x}px ${y}px;background-size:${sheetW}px ${sheetH}px`;
}

// Accepts either an entity object (with .iconIndex / .modIcon) or a raw number for backward compat.
export function iconEl(entityOrIndex, size = 'md') {
  const px = DISPLAY_SIZES[size] || 60;
  const modIcon = typeof entityOrIndex === 'object' ? entityOrIndex?.modIcon : null;
  const iconIndex = typeof entityOrIndex === 'object' ? entityOrIndex?.iconIndex : entityOrIndex;

  if (modIcon) {
    const img = document.createElement('img');
    img.className = 'game-icon mod-icon';
    img.src = `assets/mod-icons/${modIcon}`;
    img.style.cssText = `width:${px}px;height:${px}px;object-fit:contain;`;
    img.alt = '';
    return img;
  }
  const span = document.createElement('span');
  if (!iconIndex) {
    span.className = `game-icon${size !== 'md' ? ` game-icon-${size}` : ''} no-icon`;
    span.style.cssText = `width:${px}px;height:${px}px;`;
    return span;
  }
  span.className = `game-icon${size !== 'md' ? ` game-icon-${size}` : ''}`;
  span.style.cssText = calcStyle(iconIndex, px) + `;width:${px}px;height:${px}px;`;
  return span;
}

// Accepts either an entity object (with .iconIndex / .modIcon) or a raw number for backward compat.
export function iconHtml(entityOrIndex, size = 'md') {
  const px = DISPLAY_SIZES[size] || 60;
  const modIcon = typeof entityOrIndex === 'object' ? entityOrIndex?.modIcon : null;
  const iconIndex = typeof entityOrIndex === 'object' ? entityOrIndex?.iconIndex : entityOrIndex;

  if (modIcon) {
    return `<img class="game-icon mod-icon" src="assets/mod-icons/${modIcon}" style="width:${px}px;height:${px}px;object-fit:contain;" alt="">`;
  }
  if (!iconIndex) {
    return `<span class="game-icon no-icon" style="width:${px}px;height:${px}px;"></span>`;
  }
  const style = calcStyle(iconIndex, px) + `;width:${px}px;height:${px}px;`;
  return `<span class="game-icon" style="${style}"></span>`;
}
