// --- NAJA® SCOPE V24 (PROGRESSIVE TOOLTIP + CURSOR UX) ---
(function() {
    // 1. FAXINA GERAL (Remove resquícios de versões antigas para acabar com a poluição)
    const oldIds = ['atlas-highlighter', 'atlas-locked-highlighter', 'atlas-designer-tooltip', 'atlas-control-panel', 'atlas-version-label'];
    oldIds.forEach(id => { const el = document.getElementById(id); if(el) el.remove(); });
    
    // Remove estilos antigos injetados
    document.querySelectorAll('style').forEach(style => {
        if (style.innerHTML.includes('.designer-mode') || style.innerHTML.includes('atlas-')) style.remove();
    });

    // 2. Variáveis e Temas
    let isActive = false;
    let lastHighlighted = null;
    let isLocked = false;
    let lockedElement = null;
    const THEMES = {
        PINK: { color: '#ff0064', bg: 'rgba(255, 0, 100, 0.1)' },
        GREEN: { color: '#00ff00', bg: 'rgba(0, 255, 0, 0.1)' }
    };
    let currentTheme = 'GREEN';
    const SCOPE_CURSOR_URL = (() => {
        try {
            const current = document.currentScript;
            const scriptSrc = current?.src || '';
            if (!scriptSrc) return 'NAJA® Scope/SVG/ScopeCursor.svg';
            return new URL('SVG/ScopeCursor.svg', scriptSrc).toString();
        } catch {
            return 'NAJA® Scope/SVG/ScopeCursor.svg';
        }
    })();

    // 3. Criação da UI Limpa
    
    // A. O Highlighter (Único elemento que dá destaque)
    const highlighter = document.createElement('div');
    highlighter.id = 'atlas-highlighter';
    Object.assign(highlighter.style, {
        position: 'fixed', display: 'none',
        border: `1px solid ${THEMES[currentTheme].color}`, 
        backgroundColor: THEMES[currentTheme].bg,
        zIndex: '999998', pointerEvents: 'none', 
        transition: 'all 0.05s linear', borderRadius: '2px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.1)' // Leve brilho interno
    });
    document.body.appendChild(highlighter);

    // A2. Highlighter Travado (fica no elemento selecionado)
    const lockedHighlighter = document.createElement('div');
    lockedHighlighter.id = 'atlas-locked-highlighter';
    Object.assign(lockedHighlighter.style, {
        position: 'fixed', display: 'none',
        border: `2px solid ${THEMES[currentTheme].color}`,
        backgroundColor: 'transparent',
        zIndex: '999997', pointerEvents: 'none',
        transition: 'all 0.05s linear', borderRadius: '3px',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.25)'
    });
    document.body.appendChild(lockedHighlighter);

    // B. A Tooltip (Branca e Moderna com Glass-Blur)
    const tooltip = document.createElement('div');
    ['mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'contextmenu'].forEach(evt => {
        tooltip.addEventListener(evt, (e) => {
            e.stopPropagation();
        });
    });
    tooltip.id = 'atlas-designer-tooltip';
    Object.assign(tooltip.style, {
        position: 'fixed', display: 'none', 
        background: 'rgba(255, 255, 255, 0.75)', 
        color: '#1a1a1a',
        fontSize: '12px', padding: '12px', borderRadius: '8px', zIndex: '999999',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontWeight: '500', minWidth: '180px', whiteSpace: 'pre-wrap',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.05)', 
        border: '1px solid rgba(255, 255, 255, 0.5)',
        lineHeight: '1.4', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'
    });
    document.body.appendChild(tooltip);
    tooltip.style.pointerEvents = 'none';
    const tooltipCloseId = 'atlas-tooltip-close';

    // C. Painel de Controle (Canto Inferior)
    const panel = document.createElement('div');
    panel.id = 'atlas-control-panel';
    Object.assign(panel.style, {
        position: 'fixed', bottom: '20px', right: '20px',
        display: 'none', alignItems: 'center', gap: '12px',
        background: '#1a1a1a', padding: '8px 14px', borderRadius: '100px',
        zIndex: '1000000', boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
        border: '1px solid #333', color: 'white', fontFamily: 'monospace'
    });
    
    const label = document.createElement('span');
    label.innerText = 'NAJA® SCOPE';
    label.style.fontWeight = 'bold';
    label.style.fontSize = '11px';
    label.style.letterSpacing = '1px';
    label.style.color = THEMES[currentTheme].color;
    
    const btn = document.createElement('button');
    btn.innerText = 'Mudar Cor';
    Object.assign(btn.style, {
        background: '#333', border: 'none', color: '#fff',
        fontSize: '10px', padding: '4px 10px', borderRadius: '20px',
        cursor: 'pointer', fontWeight: '600', transition: '0.2s'
    });
    btn.onmouseover = () => btn.style.background = '#444';
    btn.onmouseout = () => btn.style.background = '#333';
    btn.onclick = (e) => {
        e.stopPropagation();
        currentTheme = currentTheme === 'PINK' ? 'GREEN' : 'PINK';
        const t = THEMES[currentTheme];
        
        // Atualiza Cores
        highlighter.style.borderColor = t.color;
        highlighter.style.backgroundColor = t.bg;
        lockedHighlighter.style.borderColor = t.color;
        label.style.color = t.color;
    };

    panel.appendChild(label);
    panel.appendChild(btn);
    document.body.appendChild(panel);

    panel.style.transition = 'top 0.2s ease, left 0.2s ease';
    const panelDrag = {
        active: false,
        startX: 0,
        startY: 0,
        startTop: 0,
        startLeft: 0,
        width: 0,
        height: 0
    };

    panel.addEventListener('mousedown', (e) => {
        if (btn.contains(e.target)) return;
        const rect = panel.getBoundingClientRect();
        panelDrag.active = true;
        panelDrag.startX = e.clientX;
        panelDrag.startY = e.clientY;
        panelDrag.startTop = rect.top;
        panelDrag.startLeft = rect.left;
        panelDrag.width = rect.width;
        panelDrag.height = rect.height;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.transition = 'none';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!panelDrag.active) return;
        const deltaX = e.clientX - panelDrag.startX;
        const deltaY = e.clientY - panelDrag.startY;
        let nextLeft = panelDrag.startLeft + deltaX;
        let nextTop = panelDrag.startTop + deltaY;
        nextLeft = Math.min(window.innerWidth - panelDrag.width - 10, Math.max(10, nextLeft));
        nextTop = Math.min(window.innerHeight - panelDrag.height - 10, Math.max(10, nextTop));
        panel.style.left = `${nextLeft}px`;
        panel.style.top = `${nextTop}px`;
    });

    document.addEventListener('mouseup', () => {
        if (!panelDrag.active) return;
        panelDrag.active = false;
        panel.style.transition = 'top 0.2s ease, left 0.2s ease';
        document.body.style.userSelect = '';
    });

    // D. Estilos CSS Mínimos (Apenas cursor)
    const style = document.createElement('style');
    style.id = 'atlas-style';
    let cursorSvgObjectUrl = null;
    let cursorPngObjectUrl = null;
    const CURSOR_RENDER_SIZE = 40;
    const CURSOR_HOTSPOT = Math.floor(CURSOR_RENDER_SIZE / 2);
    const CURSOR_HOTSPOT_CSS = `${CURSOR_HOTSPOT} ${CURSOR_HOTSPOT}`;
    const escapeCssUrl = (url) => String(url).replace(/"/g, '\\"');
    const applyCursor = (primaryUrl, fallbackUrl) => {
        const safePrimary = escapeCssUrl(primaryUrl);
        const cursorPrimary = `url("${safePrimary}") ${CURSOR_HOTSPOT_CSS}`;
        const cursorFallback = fallbackUrl ? `, url("${escapeCssUrl(fallbackUrl)}") ${CURSOR_HOTSPOT_CSS}` : '';
        style.textContent =
            `.designer-mode * { cursor: ${cursorPrimary}${cursorFallback}, crosshair !important; } ` +
            `.designer-mode { cursor: ${cursorPrimary}${cursorFallback}, crosshair !important; } ` +
            `#atlas-designer-tooltip, #atlas-designer-tooltip * { user-select: text !important; -webkit-user-select: text !important; cursor: auto !important; } ` +
            `#atlas-designer-tooltip.atlas-tooltip-locked, #atlas-designer-tooltip.atlas-tooltip-locked * { cursor: auto !important; }`;
    };
    const setCursorUrls = ({ svgUrl, pngUrl }) => {
        if (cursorSvgObjectUrl) URL.revokeObjectURL(cursorSvgObjectUrl);
        if (cursorPngObjectUrl) URL.revokeObjectURL(cursorPngObjectUrl);
        cursorSvgObjectUrl = svgUrl || null;
        cursorPngObjectUrl = pngUrl || null;
        if (cursorSvgObjectUrl && cursorPngObjectUrl) applyCursor(cursorSvgObjectUrl, cursorPngObjectUrl);
        else if (cursorSvgObjectUrl) applyCursor(cursorSvgObjectUrl);
        else if (cursorPngObjectUrl) applyCursor(cursorPngObjectUrl);
    };

    applyCursor(SCOPE_CURSOR_URL);
    document.head.appendChild(style);

    const loadImage = (url) => new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });

    const rasterizeToPngObjectUrl = async (url, size = 32, oversample = 3) => {
        const img = await loadImage(url);

        const sourceSize = Math.max(1, Math.floor(size * oversample));
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = sourceSize;
        sourceCanvas.height = sourceSize;
        const sourceCtx = sourceCanvas.getContext('2d');
        if (!sourceCtx) throw new Error('Canvas 2d context unavailable');
        sourceCtx.imageSmoothingEnabled = true;
        sourceCtx.imageSmoothingQuality = 'high';
        sourceCtx.clearRect(0, 0, sourceSize, sourceSize);
        sourceCtx.drawImage(img, 0, 0, sourceSize, sourceSize);

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = size;
        outputCanvas.height = size;
        const outputCtx = outputCanvas.getContext('2d');
        if (!outputCtx) throw new Error('Canvas 2d context unavailable');
        outputCtx.imageSmoothingEnabled = true;
        outputCtx.imageSmoothingQuality = 'high';
        outputCtx.clearRect(0, 0, size, size);
        outputCtx.drawImage(sourceCanvas, 0, 0, size, size);

        const blob = await new Promise((resolve) => outputCanvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Canvas toBlob returned null');
        return URL.createObjectURL(blob);
    };

    const injectSvgSize = (svgText, size) => {
        const openTagMatch = svgText.match(/<svg\b[^>]*>/i);
        if (!openTagMatch) return svgText;
        const openTag = openTagMatch[0];
        if (/\bwidth\s*=/.test(openTag) && /\bheight\s*=/.test(openTag)) return svgText;
        const sizedOpenTag = openTag.replace(
            /<svg\b/i,
            `<svg width="${size}" height="${size}"`
        );
        return svgText.replace(openTag, sizedOpenTag);
    };

    const createSizedSvgCursorUrl = async (url, size) => {
        const resp = await fetch(url, { cache: 'no-cache' });
        if (!resp.ok) throw new Error(`Failed to fetch cursor svg: ${resp.status}`);
        const svgText = await resp.text();
        const sizedSvgText = injectSvgSize(svgText, size);
        return URL.createObjectURL(new Blob([sizedSvgText], { type: 'image/svg+xml' }));
    };

    (async () => {
        try {
            try {
                const svgBlobUrl = await createSizedSvgCursorUrl(SCOPE_CURSOR_URL, CURSOR_RENDER_SIZE);
                const pngBlobUrl = await rasterizeToPngObjectUrl(svgBlobUrl, CURSOR_RENDER_SIZE);
                setCursorUrls({ svgUrl: svgBlobUrl, pngUrl: pngBlobUrl });
            } catch {
                try {
                    const pngBlobUrl = await rasterizeToPngObjectUrl(SCOPE_CURSOR_URL, CURSOR_RENDER_SIZE);
                    setCursorUrls({ pngUrl: pngBlobUrl });
                } catch {
                    // Mantém fallback (crosshair) se o cursor custom não for suportado.
                }
            }
        } catch {}
    })();


    // 4. Lógica de Detecção
    function detectBestSearchTerm(el) {
        if (!el) return '';
        if (el.id) return '#' + el.id;

        if (el.classList && el.classList.length > 0) {
            const classes = [...el.classList].filter(c => c && c !== 'tick' && c !== 'domain');
            if (classes.length > 0) {
                return `${el.tagName.toLowerCase()}.${classes.join('.')}`;
            }
        }

        const attrPriority = ['data-name', 'data-title', 'data-label', 'data-key', 'data-value', 'aria-label', 'name'];
        for (const attr of attrPriority) {
            const attrValue = el.getAttribute?.(attr);
            if (attrValue) {
                const safeValue = attrValue.replace(/"/g, '\\"');
                return `${el.tagName.toLowerCase()}[${attr}="${safeValue}"]`;
            }
        }

        if (el.tagName === 'text' || el.tagName === 'tspan') {
            const txt = el.textContent.trim();
            if (isNaN(txt) && txt.length > 0) return txt;
        }

        if (el instanceof SVGElement) {
            const s = window.getComputedStyle(el);
            if (s.fill && s.fill !== 'none') return rgbToHex(s.fill);
            if (s.stroke && s.stroke !== 'none') return rgbToHex(s.stroke);
        }

        return buildShortCssPath(el);
    }

    function buildShortCssPath(element, depthLimit = 2) {
        if (!element) return '';
        const segments = [];
        let current = element;
        let depth = 0;

        while (current && depth <= depthLimit) {
            let segment = current.tagName.toLowerCase();
            if (current.id) {
                segment += `#${current.id}`;
                segments.unshift(segment);
                break;
            }

            if (current.classList && current.classList.length > 0) {
                const classTokens = [...current.classList].filter(Boolean);
                if (classTokens.length > 0) {
                    segment += '.' + classTokens.slice(0, 2).join('.');
                }
            }

            if (current.parentElement) {
                const siblings = Array.from(current.parentElement.children);
                const sameTag = siblings.filter(node => node.tagName === current.tagName);
                if (sameTag.length > 1) {
                    const index = siblings.indexOf(current);
                    if (index >= 0) {
                        segment += `:nth-child(${index + 1})`;
                    }
                }
            }

            segments.unshift(segment);
            current = current.parentElement;
            depth++;
        }

        return segments.join(' > ') || element.tagName.toLowerCase();
    }

    function truncateValue(value, max = 40) {
        if (typeof value !== 'string') return value;
        return value.length > max ? value.slice(0, max) + '...' : value;
    }

    function rgbToHex(rgb) {
        if (!rgb || typeof rgb !== 'string' || !rgb.startsWith('rgb')) return rgb;
        const raw = rgb.replace(/rgba?\(([^)]+)\)/, '$1').trim();
        const values = raw.split(/[, ]+/).filter(Boolean);
        if (values.length < 3) return rgb;
        const [r, g, b] = values;
        const toHex = (num) => {
            const value = Math.round(Number(num));
            if (Number.isNaN(value)) return '00';
            const hex = value.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }

    function getTechInfo(target) {
        const s = window.getComputedStyle(target);
        const entries = [];
        const lineStyles = 'display:flex; justify-content:space-between; align-items:center';

        if (target instanceof SVGElement) {
            if (target.tagName === 'text' || target.tagName === 'tspan') {
                entries.push(`<div style="${lineStyles}"><span>Font:</span> <span style="font-weight:bold">${s.fontFamily.split(',')[0]}</span></div>`);
                entries.push(`<div style="${lineStyles}"><span>Size:</span> <span style="font-weight:bold">${s.fontSize}</span></div>`);
            }

            if (s.fill && s.fill !== 'none') {
                const fillColor = rgbToHex(s.fill);
                entries.push(`<div style="${lineStyles}"><span>Fill:</span> <span style="display:flex; align-items:center; gap:6px; font-weight:bold"><span style="display:inline-block; width:14px; height:14px; background:${fillColor}; border-radius:3px; border:1px solid rgba(0,0,0,0.1)"></span>${fillColor}</span></div>`);
            } else if (s.stroke && s.stroke !== 'none') {
                const strokeColor = rgbToHex(s.stroke);
                entries.push(`<div style="${lineStyles}"><span>Stroke:</span> <span style="display:flex; align-items:center; gap:6px; font-weight:bold"><span style="display:inline-block; width:14px; height:14px; background:${strokeColor}; border-radius:3px; border:1px solid rgba(0,0,0,0.1)"></span>${strokeColor}</span></div>`);
            }

            const coordAttrs = ['x', 'y', 'cx', 'cy', 'd'];
            const coordValues = coordAttrs.map(attr => {
                const val = target.getAttribute(attr);
                return val ? `${attr}=${truncateValue(val)}` : null;
            }).filter(Boolean);

            if (coordValues.length) {
                entries.push(`<div style="${lineStyles}"><span>Coords:</span> <span style="font-weight:bold; font-family:monospace">${coordValues.join(' • ')}</span></div>`);
            }
        } else {
            const family = (s.fontFamily || '').split(',')[0] || 'system';
            entries.push(`<div style="${lineStyles}"><span>Font-family:</span> <span style="font-weight:bold">${family}</span></div>`);
            entries.push(`<div style="${lineStyles}"><span>Font-size:</span> <span style="font-weight:bold">${s.fontSize}</span></div>`);
            entries.push(`<div style="${lineStyles}"><span>Font-weight:</span> <span style="font-weight:bold">${s.fontWeight}</span></div>`);
            const colorValue = rgbToHex(s.color) || s.color || 'inherit';
            entries.push(`<div style="${lineStyles}"><span>Color:</span> <span style="display:flex; align-items:center; gap:6px; font-weight:bold"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${colorValue}; border:1px solid rgba(0,0,0,0.1)"></span>${colorValue}</span></div>`);

            const padding = `${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}`;
            const margin = `${s.marginTop} ${s.marginRight} ${s.marginBottom} ${s.marginLeft}`;
            entries.push(`<div style="${lineStyles}"><span style="font-weight:bold">Box Model:</span> <span style="font-weight:bold; font-family:monospace">padding ${padding} • margin ${margin}</span></div>`);
        }

        return entries.length ? `<div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(0,0,0,0.08); color:#666; font-size:11px">${entries.join('')}</div>` : '';
    }

    function positionTooltip(mouseX, mouseY) {
        tooltip.style.display = 'block';
        const tRect = tooltip.getBoundingClientRect();
        let top = mouseY + 20;
        let left = mouseX + 20;
        if (left + tRect.width > window.innerWidth) left = mouseX - tRect.width - 20;
        if (top + tRect.height > window.innerHeight) top = mouseY - tRect.height - 20;
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    function renderTooltipContent(target, rect, mouseX, mouseY, lockedStateOverride = null) {
        const lockedState = lockedStateOverride !== null ? lockedStateOverride : isLocked;
        const term = detectBestSearchTerm(target);
        const dims = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;

        if (!lockedState) {
            tooltip.innerHTML = `
                <span style="font-family:monospace; font-weight:600; font-size:12px; color:#000; word-break:break-word;">${term}</span>
            `;
            positionTooltip(mouseX, mouseY);
            return;
        }

        const tech = getTechInfo(target);
        tooltip.innerHTML = `
            <button id="${tooltipCloseId}" aria-label="Fechar" style="position:absolute; top:6px; right:6px; width:32px; height:32px; border:none; border-radius:50%; background:rgba(255,255,255,0.4); color:#111; font-weight:600; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 1px rgba(0,0,0,0.05);">×</button>
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin:24px 0 6px 0; flex-wrap:wrap;">
                <div style="flex:1; min-width:180px;">
                    <span style="font-size:10px; color:#999; text-transform:uppercase; letter-spacing:0.5px;">Selector</span>
                    <div style="font-family:monospace; font-size:14px; color:#111; font-weight:600; word-break:break-all; margin-top:4px;">${term}</div>
                </div>
                <span style="font-size:10px; letter-spacing:0.5px; text-transform:uppercase; padding:2px 10px; border-radius:12px; background:rgba(255,255,255,0.85); color:#555; border:1px solid rgba(15,23,42,0.12); height:fit-content;">${dims}</span>
            </div>
            ${tech}
        `;
        positionTooltip(mouseX, mouseY);
    }

    function lockTooltipView() {
        isLocked = true;
        lockedElement = lastHighlighted;
        updateLockedHighlighter();
        tooltip.classList.add('atlas-tooltip-locked');
        tooltip.style.pointerEvents = 'auto';
    }

    function unlockTooltip() {
        isLocked = false;
        lockedElement = null;
        lockedHighlighter.style.display = 'none';
        tooltip.classList.remove('atlas-tooltip-locked');
        tooltip.style.pointerEvents = 'none';
        tooltip.style.display = 'none';
        lastHighlighted = null;
        highlighter.style.display = 'none';
    }

    function updateLockedHighlighter() {
        if (!isActive || !isLocked || !lockedElement) {
            lockedHighlighter.style.display = 'none';
            return;
        }
        const rect = lockedElement.getBoundingClientRect();
        lockedHighlighter.style.display = 'block';
        lockedHighlighter.style.top = rect.top + 'px';
        lockedHighlighter.style.left = rect.left + 'px';
        lockedHighlighter.style.width = rect.width + 'px';
        lockedHighlighter.style.height = rect.height + 'px';
    }

    tooltip.addEventListener('click', (e) => {
        if (e.target.id === tooltipCloseId) {
            e.preventDefault();
            e.stopPropagation();
            unlockTooltip();
        }
    });

    // 5. Listeners
    window.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.key.toLowerCase() === 'i') {
            document.body.classList.toggle('designer-mode');
            isActive = document.body.classList.contains('designer-mode');
            panel.style.display = isActive ? 'flex' : 'none';
            if (!isActive) {
                unlockTooltip();
            }
        }
    });

    window.addEventListener('click', (e) => {
        if (!isActive) return;
        if (tooltip.contains(e.target) || panel.contains(e.target)) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        const clickedElement = e.target;
        const validTarget = lastHighlighted && (clickedElement === lastHighlighted || lastHighlighted.contains(clickedElement));

        if (isLocked) {
            if (!validTarget) {
                unlockTooltip();
                return;
            }
            const rect = clickedElement.getBoundingClientRect();
            renderTooltipContent(clickedElement, rect, e.clientX, e.clientY, true);
            lastHighlighted = clickedElement;
            lockedElement = clickedElement;
            updateLockedHighlighter();
            return;
        }

        if (!validTarget) return;

        const rect = clickedElement.getBoundingClientRect();
        renderTooltipContent(clickedElement, rect, e.clientX, e.clientY, false);
        lockTooltipView();
        renderTooltipContent(clickedElement, rect, e.clientX, e.clientY, true);
    }, true);

    document.addEventListener('mousemove', (e) => {
        if (!isActive) return;
        const target = document.elementFromPoint(e.clientX, e.clientY);
        
        if (!target || target === highlighter || panel.contains(target) || tooltip.contains(target)) return;

        lastHighlighted = target;
        const rect = target.getBoundingClientRect();
        
        // Atualiza Highlighter
        highlighter.style.display = 'block';
        highlighter.style.top = rect.top + 'px'; highlighter.style.left = rect.left + 'px';
        highlighter.style.width = rect.width + 'px'; highlighter.style.height = rect.height + 'px';

        if (!isLocked) {
            renderTooltipContent(target, rect, e.clientX, e.clientY);
        } else {
            updateLockedHighlighter();
        }
    });
    
    // Atualiza posição no scroll
    window.addEventListener('scroll', () => {
        if(isActive && lastHighlighted) {
            const rect = lastHighlighted.getBoundingClientRect();
            highlighter.style.top = rect.top + 'px'; highlighter.style.left = rect.left + 'px';
        }
        updateLockedHighlighter();
    }, { passive: true });

    window.addEventListener('resize', () => {
        updateLockedHighlighter();
    }, { passive: true });
})();
