export function createText(text, lower = false) {
  const el = document.createElement('div');
  el.className = 'text-layer' + (lower ? ' lower-third' : '');
  el.contentEditable = true;
  el.innerText = text;

  let offsetX, offsetY, dragging = false;

  el.onmousedown = e => {
    dragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  };

  document.onmousemove = e => {
    if (!dragging) return;
    el.style.left = (e.pageX - offsetX) + 'px';
    el.style.top = (e.pageY - offsetY) + 'px';
  };

  document.onmouseup = () => dragging = false;

  document.body.appendChild(el);
}
