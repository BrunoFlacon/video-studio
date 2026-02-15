export function makeEditable(clip) {
  let isDragging = false;
  let startX = 0;

  clip.addEventListener('mousedown', e => {
    if (e.target.classList.contains('handle')) return;
    isDragging = true;
    startX = e.clientX - clip.offsetLeft;
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    clip.style.left = (e.clientX - startX) + 'px';
  });

  document.addEventListener('mouseup', () => isDragging = false);

  const handleLeft = document.createElement('div');
  handleLeft.className = 'handle';
  clip.appendChild(handleLeft);

  handleLeft.addEventListener('mousedown', e => {
    e.stopPropagation();
    const start = e.clientX;
    const startWidth = clip.offsetWidth;

    const resize = e2 => {
      clip.style.width = (startWidth - (e2.clientX - start)) + 'px';
    };

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', resize);
    }, { once: true });
  });

  const del = document.createElement('div');
  del.className = 'delete';
  del.innerText = '×';
  del.onclick = () => clip.remove();
  clip.appendChild(del);
}
