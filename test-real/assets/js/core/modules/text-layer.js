// assets/js/modules/text-layer.js
import { state } from './state.js';

let selectedElement = null;

export function addTextOverlay(layerDiv, text = "Novo Texto") {
    const el = document.createElement('div');
    el.className = 'overlay-item';
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.fontSize = '24px';
    el.style.color = '#ffffff';
    el.style.transform = 'translate(-50%, -50%)'; // Centraliza

    // Conteúdo interno (Padrão CSP: textContent em vez de innerHTML)
    const p = document.createElement('p');
    p.textContent = text;
    el.appendChild(p);

    // Eventos
    el.addEventListener('mousedown', (e) => startDrag(e, el));
    el.addEventListener('click', (e) => selectText(e, el));

    layerDiv.appendChild(el);

    // Salva no estado global
    state.overlays.push({
        id: Date.now(),
        element: el,
        data: { text, x: 50, y: 50, color: '#ffffff', fontSize: 24, shadow: false }
    });
}

function selectText(e, el) {
    e.stopPropagation();
    // Remove seleção anterior
    document.querySelectorAll('.overlay-item').forEach(i => i.classList.remove('selected'));

    selectedElement = el;
    el.classList.add('selected');

    // Abre painel de propriedades
    const propsPanel = document.getElementById('textProps');
    propsPanel.classList.remove('hidden');

    // Popula inputs
    const data = state.overlays.find(o => o.element === el).data;
    document.getElementById('propText').value = data.text;
    document.getElementById('propColor').value = data.color;
    document.getElementById('propSize').value = data.fontSize;
    document.getElementById('propShadow').checked = data.shadow;
}

// Atualiza o texto em tempo real quando mexe nos inputs
export function updateSelectedText(key, value) {
    if (!selectedElement) return;

    const overlayObj = state.overlays.find(o => o.element === selectedElement);
    const el = selectedElement;

    if (key === 'text') {
        el.querySelector('p').innerText = value;
        overlayObj.data.text = value;
    }
    if (key === 'color') {
        el.style.color = value;
        overlayObj.data.color = value;
    }
    if (key === 'size') {
        el.style.fontSize = value + 'px';
        overlayObj.data.fontSize = value;
    }
    if (key === 'shadow') {
        el.style.textShadow = value ? '2px 2px 2px black' : 'none';
        overlayObj.data.shadow = value;
    }
}

// Lógica de Arrastar (Simplificada para o teste)
function startDrag(e, el) {
    e.preventDefault();
    let startX = e.clientX;
    let startY = e.clientY;
    let startLeft = el.offsetLeft;
    let startTop = el.offsetTop;

    const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        el.style.left = (startLeft + dx) + 'px';
        el.style.top = (startTop + dy) + 'px';

        // Atualiza posição no objeto de dados (para exportação)
        const overlayObj = state.overlays.find(o => o.element === el);
        overlayObj.data.x = el.offsetLeft;
        overlayObj.data.y = el.offsetTop;
    };

    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}
