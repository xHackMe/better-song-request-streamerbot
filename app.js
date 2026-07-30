const DEFAULT_STREAMERBOT_WS_HOST = '127.0.0.1';

function normalizeWebsocketHost(value) {
    const fallback = DEFAULT_STREAMERBOT_WS_HOST;
    const rawValue = String(value || '').trim();
    if (!rawValue) return fallback;

    try {
        const url = new URL(rawValue.includes('://') ? rawValue : 'ws://' + rawValue);
        return url.hostname || fallback;
    } catch (error) {
        return rawValue
            .replace(/^wss?:\/\//i, '')
            .replace(/^https?:\/\//i, '')
            .replace(/\/.*$/, '')
            .replace(/:\d+$/, '')
            .trim() || fallback;
    }
}

function formatWebsocketHostForUrl(host) {
    if (host.includes(':') && !host.startsWith('[')) return '[' + host + ']';
    return host;
}

function buildStreamerBotWebsocketUrl(host, port) {
    return 'ws://' + formatWebsocketHostForUrl(normalizeWebsocketHost(host)) + ':' + String(port || '8080').trim() + '/';
}

function isTruthyParam(value) {
    return /^(1|true|yes|on)$/i.test(String(value || '').trim());
}

const WIDGET_LAYOUT_STORAGE_KEY = 'ytm_widget_layout_config';
const WIDGET_LAYOUT_REVISION_KEY = 'ytm_widget_layout_revision';
const WIDGET_LAYOUT_PRESETS_STORAGE_KEY = 'ytm_widget_layout_presets';
const WIDGET_EDITOR_SNAP_STORAGE_KEY = 'ytm_widget_editor_snap';
const WIDGET_EDITOR_PREVIEW_WIDTH_STORAGE_KEY = 'ytm_widget_editor_preview_width';
const WIDGET_EDITOR_PREVIEW_HEIGHT_STORAGE_KEY = 'ytm_widget_editor_preview_height';
const WIDGET_EDITOR_PREVIEW_MODE_STORAGE_KEY = 'ytm_widget_editor_preview_mode';
const WIDGET_EDITOR_PREVIEW_PRESETS = {
    default: { width: 600, height: 180 },
    square: { width: 500, height: 500 },
    portrait: { width: 225, height: 400 }
};
const WIDGET_LAYOUT_ELEMENT_KEYS = ['cover', 'infoBackground', 'title', 'author', 'requester', 'srStatus', 'meterBackground', 'currentTime', 'waveform', 'duration', 'progress'];
const WIDGET_LAYOUT_OBJECT_COLOR_KEYS = new Set(['infoBackground', 'meterBackground', 'requester', 'srStatus', 'waveform', 'progress']);
const WIDGET_LAYOUT_TEXT_KEYS = new Set(['title', 'author', 'requester', 'srStatus', 'currentTime', 'duration']);
const WIDGET_LAYOUT_AUTO_FIT_TEXT_KEYS = new Set(['requester', 'srStatus']);
const WIDGET_LAYOUT_TEXT_DEFAULTS = {
    title: { color: '#fff4dd', align: 'left' },
    author: { color: '#a9b8b7', align: 'left' },
    requester: { color: '#fff4dd', align: 'center' },
    srStatus: { color: '#121516', align: 'center' },
    currentTime: { color: '#fff4dd', align: 'center' },
    duration: { color: '#fff4dd', align: 'center' }
};
const WIDGET_LAYOUT_DEFAULT_OBJECT_COLOR = '#43b9a8';
const DEFAULT_WIDGET_LAYOUT_ORDER = ['cover', 'requester', 'srStatus', 'title', 'author', 'currentTime', 'waveform', 'duration', 'progress', 'meterBackground', 'infoBackground'];
const DEFAULT_WIDGET_LAYOUT_ELEMENTS = {
    cover: { x: 1.67, y: 5.56, width: 25, height: 83.33, rotation: 0, opacity: 1, backgroundOpacity: 0, visible: true },
    infoBackground: { x: 28.33, y: 5.56, width: 70, height: 56.67, rotation: 0, opacity: 1, backgroundOpacity: 0.92, visible: true },
    title: { x: 31.33, y: 16.67, width: 51.5, height: 17.78, rotation: 0, opacity: 1, backgroundOpacity: 0, visible: true },
    author: { x: 31.33, y: 39.44, width: 36, height: 10.56, rotation: 0, opacity: 1, backgroundOpacity: 0, visible: true },
    requester: { x: 70.5, y: 37.22, width: 26, height: 16.67, rotation: 0, opacity: 1, backgroundOpacity: 1, visible: true },
    srStatus: { x: 84.33, y: 8.33, width: 12.17, height: 17.78, rotation: 0, opacity: 1, backgroundOpacity: 1, visible: true },
    meterBackground: { x: 28.33, y: 63.33, width: 70, height: 18.89, rotation: 0, opacity: 1, backgroundOpacity: 0.92, visible: true },
    currentTime: { x: 30, y: 67.22, width: 10, height: 10, rotation: 0, opacity: 1, backgroundOpacity: 0, visible: true },
    waveform: { x: 41, y: 66.67, width: 44.5, height: 11.11, rotation: 0, opacity: 1, backgroundOpacity: 0, colorMode: 'custom', color: '#ffffff', visible: true },
    duration: { x: 87, y: 67.22, width: 9.5, height: 10, rotation: 0, opacity: 1, backgroundOpacity: 0, visible: true },
    progress: { x: 28.33, y: 85, width: 70, height: 3.89, rotation: 0, opacity: 1, backgroundOpacity: 0.28, visible: true }
};
const WIDGET_LAYOUT_BACKGROUND_KEYS = new Set(['infoBackground', 'meterBackground']);

function clampWidgetLayoutNumber(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function getWidgetLayoutMinSize(key) {
    return key === 'progress' ? 1 : 3;
}

function getWidgetLayoutMinPosition(size) {
    return Math.min(0, 3 - Number(size || 0));
}

function getWidgetLayoutMaxPosition(size) {
    return Math.max(0, 97);
}

function isWidgetLayoutOutOfBounds(layout) {
    if (!layout) return false;
    return layout.x < 0 || layout.y < 0 || layout.x + layout.width > 100 || layout.y + layout.height > 100;
}

function isWidgetLayoutObjectColorElement(key) {
    return WIDGET_LAYOUT_OBJECT_COLOR_KEYS.has(key);
}

function isWidgetLayoutTextElement(key) {
    return WIDGET_LAYOUT_TEXT_KEYS.has(key);
}

function normalizeWidgetHexColor(value, fallback = WIDGET_LAYOUT_DEFAULT_OBJECT_COLOR) {
    const text = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(text)) {
        return ('#' + text.slice(1).split('').map(char => char + char).join('')).toLowerCase();
    }
    return fallback;
}

function widgetHexColorToRgbString(value) {
    const color = normalizeWidgetHexColor(value);
    return [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16)
    ].join(', ');
}

function normalizeWidgetTextAlign(value, fallback = 'left') {
    return ['left', 'center', 'right'].includes(value) ? value : fallback;
}

function getWidgetTextDefault(key) {
    return WIDGET_LAYOUT_TEXT_DEFAULTS[key] || { color: '#121516', align: 'center' };
}

function getWidgetTextJustifyContent(align) {
    if (align === 'right') return 'flex-end';
    if (align === 'center') return 'center';
    return 'flex-start';
}

function getWidgetTextJustifyItems(align) {
    if (align === 'right') return 'end';
    if (align === 'center') return 'center';
    return 'start';
}

function normalizeWidgetLayoutOrder(value) {
    const source = Array.isArray(value) ? value : DEFAULT_WIDGET_LAYOUT_ORDER;
    const seen = new Set();
    const order = [];
    source.forEach(key => {
        if (!WIDGET_LAYOUT_ELEMENT_KEYS.includes(key) || seen.has(key)) return;
        seen.add(key);
        order.push(key);
    });
    DEFAULT_WIDGET_LAYOUT_ORDER.forEach(key => {
        if (!seen.has(key)) order.push(key);
    });
    return order;
}

function getWidgetLayoutOrder(config) {
    return normalizeWidgetLayoutOrder(config && config.order);
}

function getWidgetLayoutElementLayer(config, key) {
    const order = getWidgetLayoutOrder(config);
    const index = order.indexOf(key);
    return index >= 0 ? ((order.length - index) * 10) : 10;
}

function getWidgetLayoutHitTestOrder(config) {
    return getWidgetLayoutOrder(config);
}

function createDefaultWidgetLayoutConfig() {
    const elements = {};
    WIDGET_LAYOUT_ELEMENT_KEYS.forEach(key => {
        elements[key] = { ...DEFAULT_WIDGET_LAYOUT_ELEMENTS[key] };
    });
    return { version: 2, updatedAt: Date.now(), order: normalizeWidgetLayoutOrder(), elements };
}

function normalizeWidgetLayoutConfig(value) {
    if (!value) return null;

    let parsed = value;
    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value);
        } catch (error) {
            return null;
        }
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.elements || typeof parsed.elements !== 'object') return null;

    const normalized = createDefaultWidgetLayoutConfig();
    normalized.updatedAt = clampWidgetLayoutNumber(parsed.updatedAt, 0, Number.MAX_SAFE_INTEGER, Date.now());
    normalized.order = normalizeWidgetLayoutOrder(parsed.order);

    WIDGET_LAYOUT_ELEMENT_KEYS.forEach(key => {
        const fallback = DEFAULT_WIDGET_LAYOUT_ELEMENTS[key];
        const source = parsed.elements[key] && typeof parsed.elements[key] === 'object' ? parsed.elements[key] : {};
        const minSize = getWidgetLayoutMinSize(key);
        const width = clampWidgetLayoutNumber(source.width, minSize, 100, fallback.width);
        const height = clampWidgetLayoutNumber(source.height, minSize, 100, fallback.height);
        const textDefault = getWidgetTextDefault(key);

        normalized.elements[key] = {
            x: clampWidgetLayoutNumber(source.x, getWidgetLayoutMinPosition(width), getWidgetLayoutMaxPosition(width), fallback.x),
            y: clampWidgetLayoutNumber(source.y, getWidgetLayoutMinPosition(height), getWidgetLayoutMaxPosition(height), fallback.y),
            width,
            height,
            rotation: clampWidgetLayoutNumber(source.rotation, -180, 180, fallback.rotation),
            opacity: clampWidgetLayoutNumber(source.opacity, 0, 1, fallback.opacity),
            backgroundOpacity: clampWidgetLayoutNumber(source.backgroundOpacity, 0, 1, fallback.backgroundOpacity),
            colorMode: source.colorMode === 'custom' ? 'custom' : 'cover',
            color: normalizeWidgetHexColor(source.color, WIDGET_LAYOUT_DEFAULT_OBJECT_COLOR),
            textColorMode: source.textColorMode === 'custom' ? 'custom' : 'auto',
            textColor: normalizeWidgetHexColor(source.textColor, textDefault.color),
            textAlign: normalizeWidgetTextAlign(source.textAlign, textDefault.align),
            fontSize: isWidgetLayoutTextElement(key) && !WIDGET_LAYOUT_AUTO_FIT_TEXT_KEYS.has(key)
                ? clampWidgetLayoutNumber(source.fontSize, 0, 100, 0)
                : 0,
            visible: source.visible !== false
        };
    });

    return normalized;
}

function readWidgetLayoutConfig() {
    try {
        return normalizeWidgetLayoutConfig(localStorage.getItem(WIDGET_LAYOUT_STORAGE_KEY));
    } catch (error) {
        return null;
    }
}

function writeWidgetLayoutConfig(config) {
    const normalized = normalizeWidgetLayoutConfig(config);
    try {
        if (normalized) localStorage.setItem(WIDGET_LAYOUT_STORAGE_KEY, JSON.stringify(normalized));
        else localStorage.removeItem(WIDGET_LAYOUT_STORAGE_KEY);
        localStorage.setItem(WIDGET_LAYOUT_REVISION_KEY, String(Date.now()));
    } catch (error) {}
    return normalized;
}

function clearWidgetLayoutElementStyles(element) {
    if (!element) return;
    element.classList.remove('is-widget-element-hidden', 'is-widget-element-outside', 'is-widget-custom-color', 'is-widget-custom-text-color');
    element.removeAttribute('data-base-font-size');
    element.removeAttribute('data-widget-font-size-ratio');
    ['left', 'top', 'width', 'height', 'transform', 'opacity', 'z-index', 'font-size', 'color', 'text-align', 'justify-content', 'justify-items', '--widget-element-bg-opacity', '--widget-element-scale', '--widget-element-rgb']
        .forEach(property => element.style.removeProperty(property));
}

function fitWidgetOriginalTextElement(element, minScale) {
    if (!element) return;
    const currentSize = parseFloat(element.dataset.baseFontSize || getComputedStyle(element).fontSize);
    if (!element.dataset.baseFontSize) element.dataset.baseFontSize = String(currentSize);
    const minSize = Math.max(9, currentSize * minScale);
    let size = currentSize;

    element.style.fontSize = currentSize + 'px';
    while (size > minSize && (element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1)) {
        size -= 1;
        element.style.fontSize = size + 'px';
    }
}

function fitWidgetOriginalCardText(card) {
    if (!card || card.classList.contains('has-custom-layout')) return;
    fitWidgetOriginalTextElement(card.querySelector('.np-card-title'), 0.72);
    fitWidgetOriginalTextElement(card.querySelector('.np-card-author'), 0.68);
}

function getWidgetComputedBackgroundOpacity(value, fallback) {
    const color = String(value || '').trim().toLowerCase();
    if (!color || color === 'transparent') return color === 'transparent' ? 0 : fallback;
    const match = color.match(/^rgba?\((.+)\)$/);
    if (!match) return fallback;
    const parts = match[1].split(/[\s,\/]+/).filter(Boolean);
    if (parts.length < 4) return 1;
    return clampWidgetLayoutNumber(parts[3], 0, 1, fallback);
}

function measureWidgetLayoutFromCard(card) {
    if (!card) return createDefaultWidgetLayoutConfig();
    const cardRect = card.getBoundingClientRect();
    if (!cardRect.width || !cardRect.height) return createDefaultWidgetLayoutConfig();
    const measured = createDefaultWidgetLayoutConfig();
    const contentBoxTextKeys = new Set(['title', 'author', 'currentTime', 'duration']);

    WIDGET_LAYOUT_ELEMENT_KEYS.forEach(key => {
        let element = card.querySelector('[data-widget-element="' + key + '"]');
        if (!card.classList.contains('has-custom-layout') && key === 'infoBackground') element = card.querySelector('.np-card-info');
        if (!card.classList.contains('has-custom-layout') && key === 'meterBackground') element = card.querySelector('.np-card-meter');
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        const fallback = DEFAULT_WIDGET_LAYOUT_ELEMENTS[key];
        const useContentBox = contentBoxTextKeys.has(key);
        const paddingLeft = useContentBox ? (parseFloat(computed.paddingLeft) || 0) : 0;
        const paddingRight = useContentBox ? (parseFloat(computed.paddingRight) || 0) : 0;
        const paddingTop = useContentBox ? (parseFloat(computed.paddingTop) || 0) : 0;
        const paddingBottom = useContentBox ? (parseFloat(computed.paddingBottom) || 0) : 0;
        const textDefault = getWidgetTextDefault(key);
        const computedTextAlign = computed.textAlign === 'start' ? 'left' : computed.textAlign;
        const computedOpacity = parseFloat(computed.opacity);
        const fontSize = isWidgetLayoutTextElement(key)
            ? ((parseFloat(computed.fontSize) || 0) / cardRect.height) * 100
            : 0;
        measured.elements[key] = {
            ...fallback,
            x: ((rect.left + paddingLeft - cardRect.left) / cardRect.width) * 100,
            y: ((rect.top + paddingTop - cardRect.top) / cardRect.height) * 100,
            width: (Math.max(1, rect.width - paddingLeft - paddingRight) / cardRect.width) * 100,
            height: (Math.max(1, rect.height - paddingTop - paddingBottom) / cardRect.height) * 100,
            opacity: Number.isFinite(computedOpacity) ? computedOpacity : fallback.opacity,
            backgroundOpacity: isWidgetLayoutObjectColorElement(key)
                ? getWidgetComputedBackgroundOpacity(computed.backgroundColor, fallback.backgroundOpacity)
                : fallback.backgroundOpacity,
            textAlign: isWidgetLayoutTextElement(key)
                ? (WIDGET_LAYOUT_AUTO_FIT_TEXT_KEYS.has(key)
                    ? 'center'
                    : normalizeWidgetTextAlign(computedTextAlign, textDefault.align))
                : fallback.textAlign,
            fontSize
        };
    });

    return normalizeWidgetLayoutConfig(measured) || measured;
}

const widgetLayoutTextFitFrames = new WeakMap();
const widgetLayoutTextFitTimers = new WeakMap();

function fitWidgetLayoutCardText(card) {
    if (!card || !card.classList.contains('has-custom-layout')) return;
    const profiles = {
        title: { height: 0.55, width: 0.075, min: 11, max: 42, wrap: false },
        author: { height: 0.62, width: 0.07, min: 9, max: 24, wrap: false },
        requester: { height: 0.58, width: 0.1, min: 10, max: 30, wrap: false },
        srStatus: { height: 0.55, width: 0.18, min: 10, max: 28, wrap: false },
        currentTime: { height: 0.58, width: 0.18, min: 9, max: 24, wrap: false },
        duration: { height: 0.58, width: 0.18, min: 9, max: 24, wrap: false }
    };

    Object.entries(profiles).forEach(([key, profile]) => {
        const element = card.querySelector('[data-widget-element="' + key + '"]');
        if (!element || element.classList.contains('is-widget-element-hidden')) return;
        element.style.fontSize = '';
        const width = Math.max(1, element.clientWidth);
        const height = Math.max(1, element.clientHeight);
        const storedRatio = Number(element.dataset.widgetFontSizeRatio);
        let size = Number.isFinite(storedRatio) && storedRatio > 0
            ? Math.max(1, card.clientHeight * storedRatio / 100)
            : Math.min(profile.max, Math.max(profile.min, Math.min(height * profile.height, width * profile.width)));
        const minimumSize = Math.min(profile.min, size);
        element.style.fontSize = size + 'px';
        while (size > minimumSize && (element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1)) {
            size -= 1;
            element.style.fontSize = size + 'px';
        }
    });
}

function queueWidgetLayoutCardTextFit(card) {
    if (!card) return;
    const previous = widgetLayoutTextFitFrames.get(card);
    if (previous) cancelAnimationFrame(previous);
    const frame = requestAnimationFrame(() => {
        widgetLayoutTextFitFrames.delete(card);
        fitWidgetLayoutCardText(card);
    });
    widgetLayoutTextFitFrames.set(card, frame);
}

function scheduleWidgetLayoutCardTextFit(card) {
    if (!card) return;
    queueWidgetLayoutCardTextFit(card);
    const previous = widgetLayoutTextFitTimers.get(card);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => {
        widgetLayoutTextFitTimers.delete(card);
        queueWidgetLayoutCardTextFit(card);
    }, 340);
    widgetLayoutTextFitTimers.set(card, timer);
}

function applyWidgetLayoutToCard(card, config, options = {}) {
    if (!card) return null;
    const suppliedLayout = normalizeWidgetLayoutConfig(config);
    const isWidgetSurface = !!(card.ownerDocument && card.ownerDocument.body && card.ownerDocument.body.classList.contains('now-playing-widget-page'));
    const normalized = suppliedLayout || (isWidgetSurface ? normalizeWidgetLayoutConfig(createDefaultWidgetLayoutConfig()) : null);
    const layoutModeChanged = card.classList.contains('has-custom-layout') !== !!normalized;
    if (layoutModeChanged) card.classList.add('is-widget-layout-switching');
    card.classList.add('widget-layout-card');
    card.classList.toggle('has-custom-layout', !!normalized);
    card.classList.toggle('is-default-widget-layout', !suppliedLayout && isWidgetSurface);
    card.classList.toggle('is-layout-editor-card', !!options.editor);
    const cardHeight = Math.max(1, card.getBoundingClientRect().height);

    WIDGET_LAYOUT_ELEMENT_KEYS.forEach(key => {
        const element = card.querySelector('[data-widget-element="' + key + '"]');
        if (!element) return;
        clearWidgetLayoutElementStyles(element);
        if (!normalized) return;

        const layout = normalized.elements[key];
        const fallback = DEFAULT_WIDGET_LAYOUT_ELEMENTS[key];
        const areaScale = Math.sqrt((layout.width * layout.height) / Math.max(1, fallback.width * fallback.height));
        const elementScale = clampWidgetLayoutNumber(areaScale, 0.45, 3.2, 1);

        element.style.left = layout.x + '%';
        element.style.top = layout.y + '%';
        element.style.width = layout.width + '%';
        element.style.height = layout.height + '%';
        element.style.transform = 'rotate(' + layout.rotation + 'deg)';
        element.style.opacity = String(layout.opacity);
        element.style.zIndex = String(getWidgetLayoutElementLayer(normalized, key));
        element.style.setProperty('--widget-element-bg-opacity', String(layout.backgroundOpacity));
        element.style.setProperty('--widget-element-scale', String(elementScale));
        if (isWidgetLayoutObjectColorElement(key) && layout.colorMode === 'custom') {
            element.classList.add('is-widget-custom-color');
            element.style.setProperty('--widget-element-rgb', widgetHexColorToRgbString(layout.color));
        }
        if (isWidgetLayoutTextElement(key)) {
            const align = normalizeWidgetTextAlign(layout.textAlign, getWidgetTextDefault(key).align);
            element.style.textAlign = align;
            element.style.justifyContent = getWidgetTextJustifyContent(align);
            element.style.justifyItems = getWidgetTextJustifyItems(align);
            if (layout.textColorMode === 'custom') {
                element.classList.add('is-widget-custom-text-color');
                element.style.color = layout.textColor;
            }
            if (layout.fontSize > 0) {
                element.dataset.widgetFontSizeRatio = String(layout.fontSize);
                element.style.fontSize = (cardHeight * layout.fontSize / 100) + 'px';
            }
        }
        element.classList.toggle('is-widget-element-hidden', !layout.visible);
        element.classList.toggle('is-widget-element-outside', !!options.editor && isWidgetLayoutOutOfBounds(layout));
    });

    scheduleWidgetLayoutCardTextFit(card);
    if (layoutModeChanged) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            card.classList.remove('is-widget-layout-switching');
        }));
    }
    return normalized;
}

if (document.body.classList.contains('now-playing-widget-page')) {
const STORAGE_KEY = 'ytm_now_playing_widget_state';
const CHANNEL_NAME = 'ytm_now_playing_widget';
const root = document.getElementById('widget-root');
const widgetParams = new URLSearchParams(window.location.search || '');
const WIDGET_EDITOR_PREVIEW = isTruthyParam(widgetParams.get('editor') || widgetParams.get('preview'));
if (WIDGET_EDITOR_PREVIEW) document.body.classList.add('is-widget-editor-preview');
const WIDGET_WS_HOST = normalizeWebsocketHost(widgetParams.get('server') || widgetParams.get('host') || widgetParams.get('wsHost') || DEFAULT_STREAMERBOT_WS_HOST);
const WIDGET_WS_PORT = widgetParams.get('port') || widgetParams.get('wsPort') || '8080';
const WIDGET_WS_PASS = widgetParams.get('pass') || widgetParams.get('password') || widgetParams.get('wsPass') || '';
const WIDGET_LANG = widgetParams.get('lang') || widgetParams.get('language') || '';
const WIDGET_AUDIO_ENABLED = !WIDGET_EDITOR_PREVIEW && isTruthyParam(widgetParams.get('audio') || widgetParams.get('sound') || widgetParams.get('playAudio'));
const WIDGET_STALE_MS = 3500;
const WIDGET_CONNECTION_MESSAGE_DELAY_MS = 15000;
const WIDGET_AUTO_HIDE_MS = 30000;
const WIDGET_AUDIO_SYNC_THRESHOLD = 1.6;
const WIDGET_AUDIO_LOCK_KEY = 'ytm_widget_audio_master_lock';
const WIDGET_AUDIO_LOCK_TTL_MS = 4500;
const WIDGET_AUDIO_LOCK_RENEW_MS = 1200;
const WIDGET_INSTANCE_ID = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
let lastPayload = '';
let activeWidgetSongKey = '';
let lastWidgetStateAt = 0;
let lastWidgetPlayableState = null;
let widgetAutoHideTimeout = null;
let widgetAutoHideMode = '';
let widgetHiddenReason = '';
let widgetStatusKey = '';
let widgetWs = null;
let widgetWsReconnectTimeout = null;
let widgetWsFallbackSubscribeTimeout = null;
let widgetWsSubscribed = false;
let widgetAudioPlayer = null;
let widgetAudioReady = false;
let widgetAudioSongId = '';
let widgetAudioLastState = null;
let widgetAudioLastSeekAt = 0;
let widgetAudioApiLoading = false;
let widgetAudioHasLock = !WIDGET_AUDIO_ENABLED;
let widgetAudioLockInterval = null;
let activeWidgetLayoutConfig = readWidgetLayoutConfig();

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function cleanAuthorName(name) {
    if (!name) return 'YouTube';
    return String(name).replace(/\s*-\s*Topic$/i, '').replace(/\s*-\s*temat$/i, '').trim();
}

function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

const coverThemeCache = new Map();

function normalizeCoverThemeColor(color) {
    const luma = (color.r * 0.2126) + (color.g * 0.7152) + (color.b * 0.0722);
    let mixTarget = null;
    let mixAmount = 0;

    if (luma < 58) {
        mixTarget = { r: 125, g: 135, b: 145 };
        mixAmount = 0.38;
    } else if (luma > 178) {
        mixTarget = { r: 64, g: 68, b: 74 };
        mixAmount = 0.42;
    }

    if (!mixTarget) return color;
    return {
        r: Math.round(color.r * (1 - mixAmount) + mixTarget.r * mixAmount),
        g: Math.round(color.g * (1 - mixAmount) + mixTarget.g * mixAmount),
        b: Math.round(color.b * (1 - mixAmount) + mixTarget.b * mixAmount)
    };
}

function readAverageCoverColor(src) {
    if (!src) return Promise.reject(new Error('No cover source'));
    if (coverThemeCache.has(src)) return Promise.resolve(coverThemeCache.get(src));

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const size = 24;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(image, 0, 0, size, size);

                const data = ctx.getImageData(0, 0, size, size).data;
                let r = 0;
                let g = 0;
                let b = 0;
                let count = 0;

                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] < 32) continue;
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count += 1;
                }

                if (!count) throw new Error('No readable cover pixels');
                const color = normalizeCoverThemeColor({
                    r: Math.round(r / count),
                    g: Math.round(g / count),
                    b: Math.round(b / count)
                });
                coverThemeCache.set(src, color);
                resolve(color);
            } catch (error) {
                reject(error);
            }
        };
        image.onerror = reject;
        image.src = src;
    });
}

function applyCoverThemeToNowPlayingCard(card, src) {
    if (!card) return;
    if (!src) {
        card.style.removeProperty('--np-cover-image');
        return;
    }
    card.dataset.coverThemeSrc = src;
    card.dataset.coverTheme = 'loading';
    card.style.setProperty('--np-cover-image', 'url(' + JSON.stringify(String(src)) + ')');

    readAverageCoverColor(src).then(color => {
        if (card.dataset.coverThemeSrc !== src) return;
        const luma = (color.r * 0.2126) + (color.g * 0.7152) + (color.b * 0.0722);
        card.style.setProperty('--np-cover-rgb', color.r + ', ' + color.g + ', ' + color.b);
        card.style.setProperty('--np-cover-contrast-rgb', luma > 145 ? '18, 21, 22' : '255, 244, 221');
        card.dataset.coverTheme = 'ready';
    }).catch(() => {
        if (card.dataset.coverThemeSrc === src) card.dataset.coverTheme = 'image';
    });
}

function getNowPlayingWaveBarHeight(index) {
    const height = 55 + Math.sin(index * 0.83) * 11 + Math.sin(index * 1.71 + 0.9) * 8 + Math.sin(index * 0.29 + 2.4) * 6;
    return Math.round(Math.min(78, Math.max(34, height)));
}

function getNowPlayingWaveBarCount(width) {
    if (!width) return 28;
    return Math.min(96, Math.max(18, Math.round(width / 9)));
}

function createNowPlayingWaveBars(count = 28) {
    return Array.from({ length: count }, (_, index) => {
        const height = getNowPlayingWaveBarHeight(index);
        const stagger = (index * 0.026).toFixed(3);
        const skipStagger = ((((index * 37) % 29) * 0.006) + (((index * 11) % 5) * 0.002)).toFixed(3);
        const skipX = ((index % 2 ? -1 : 1) * (4 + (index % 4))).toFixed(1) + 'px';
        const skipXAlt = ((index % 2 ? 1 : -1) * (3 + (index % 5))).toFixed(1) + 'px';
        const skipXSoft = ((index % 2 ? -1 : 1) * (1.5 + (index % 3))).toFixed(1) + 'px';
        const duration = (2.45 + ((index * 7) % 11) * 0.09).toFixed(2);
        return '<i style="--bar-height: ' + height + '%; --bar-stagger: ' + stagger + 's; --bar-skip-stagger: ' + skipStagger + 's; --bar-skip-x: ' + skipX + '; --bar-skip-x-alt: ' + skipXAlt + '; --bar-skip-x-soft: ' + skipXSoft + '; --bar-duration: ' + duration + 's"></i>';
    }).join('');
}

function seededNowPlayingRandom(seed, index, salt = 0) {
    const numericSeed = Number(seed) || 1;
    const value = Math.sin((numericSeed * 12.9898) + (index * 78.233) + (salt * 37.719)) * 43758.5453;
    return value - Math.floor(value);
}

function randomizeNowPlayingSkipBars(waveEl, seed) {
    if (!waveEl) return;
    const bars = Array.from(waveEl.querySelectorAll('i'));
    const ordered = bars
        .map((bar, index) => ({ bar, index, order: seededNowPlayingRandom(seed, index, 1) }))
        .sort((a, b) => a.order - b.order);

    ordered.forEach(({ bar, index }, rank) => {
        const jitter = seededNowPlayingRandom(seed, index, 2);
        const direction = seededNowPlayingRandom(seed, index, 3) > 0.5 ? 1 : -1;
        const strength = 4 + Math.round(seededNowPlayingRandom(seed, index, 4) * 5);
        const reverseStrength = 3 + Math.round(seededNowPlayingRandom(seed, index, 5) * 4);

        bar.style.setProperty('--bar-skip-stagger', (rank * 0.0019 + jitter * 0.014).toFixed(3) + 's');
        bar.style.setProperty('--bar-skip-x', (direction * strength).toFixed(1) + 'px');
        bar.style.setProperty('--bar-skip-x-alt', (-direction * reverseStrength).toFixed(1) + 'px');
        bar.style.setProperty('--bar-skip-x-soft', (direction * strength * 0.35).toFixed(1) + 'px');
    });
}

function syncNowPlayingWaveBars(waveEl) {
    if (!waveEl) return;
    const width = waveEl.clientWidth || waveEl.getBoundingClientRect().width;
    const count = getNowPlayingWaveBarCount(width);
    if (waveEl.dataset.barCount !== String(count)) {
        waveEl.innerHTML = createNowPlayingWaveBars(count);
        waveEl.dataset.barCount = String(count);
    }
}

function getWidgetLanguage() {
    if (WIDGET_LANG) return WIDGET_LANG;

    try {
        return localStorage.getItem('ytm_lang') || document.documentElement.lang || 'en';
    } catch (error) {
        return 'en';
    }
}

function widgetT(key) {
    const fallback = {
        ui_widget_waiting_player: 'Waiting for player connection...'
    };

    try {
        if (typeof i18n !== 'undefined') {
            const lang = getWidgetLanguage();
            const dict = i18n[lang] || i18n.en || {};
            return dict[key] || (i18n.en && i18n.en[key]) || fallback[key] || key;
        }
    } catch (error) {}

    return fallback[key] || key;
}

function ensureWidgetAudioContainer() {
    let container = document.getElementById('widget-audio-player');
    if (container) return container;
    container = document.createElement('div');
    container.id = 'widget-audio-player';
    container.className = 'widget-audio-player';
    document.body.appendChild(container);
    return container;
}

function initWidgetAudioPlayer() {
    if (!WIDGET_AUDIO_ENABLED || widgetAudioPlayer || typeof YT === 'undefined' || !YT.Player) return;
    ensureWidgetAudioContainer();
    widgetAudioPlayer = new YT.Player('widget-audio-player', {
        height: '1',
        width: '1',
        playerVars: {
            enablejsapi: 1,
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            origin: window.location.origin
        },
        events: {
            onReady: () => {
                widgetAudioReady = true;
                if (widgetAudioLastState) syncWidgetAudio(widgetAudioLastState, true);
            }
        }
    });
}

function loadWidgetAudioApi() {
    if (!WIDGET_AUDIO_ENABLED || widgetAudioApiLoading) return;
    widgetAudioApiLoading = true;
    ensureWidgetAudioContainer();

    if (window.YT && window.YT.Player) {
        initWidgetAudioPlayer();
        return;
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === 'function') {
            try { previousReady(); } catch (error) {}
        }
        initWidgetAudioPlayer();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
    }
}

function readWidgetAudioLock() {
    try {
        const lock = JSON.parse(localStorage.getItem(WIDGET_AUDIO_LOCK_KEY) || 'null');
        if (!lock || typeof lock !== 'object') return null;
        return {
            owner: String(lock.owner || ''),
            updatedAt: Number(lock.updatedAt) || 0
        };
    } catch (error) {
        return null;
    }
}

function writeWidgetAudioLock() {
    localStorage.setItem(WIDGET_AUDIO_LOCK_KEY, JSON.stringify({
        owner: WIDGET_INSTANCE_ID,
        updatedAt: Date.now()
    }));
}

function isWidgetAudioLockExpired(lock, now = Date.now()) {
    return !lock || !lock.owner || now - lock.updatedAt > WIDGET_AUDIO_LOCK_TTL_MS;
}

function acquireWidgetAudioLock() {
    if (!WIDGET_AUDIO_ENABLED) return false;

    const lock = readWidgetAudioLock();
    if (lock && lock.owner !== WIDGET_INSTANCE_ID && !isWidgetAudioLockExpired(lock)) {
        widgetAudioHasLock = false;
        stopWidgetAudio();
        return false;
    }

    try {
        writeWidgetAudioLock();
        const confirmedLock = readWidgetAudioLock();
        widgetAudioHasLock = !!confirmedLock && confirmedLock.owner === WIDGET_INSTANCE_ID;
    } catch (error) {
        widgetAudioHasLock = true;
    }

    if (!widgetAudioHasLock) stopWidgetAudio();
    return widgetAudioHasLock;
}

function renewWidgetAudioLock() {
    if (!WIDGET_AUDIO_ENABLED) return;

    const lock = readWidgetAudioLock();
    if (lock && lock.owner !== WIDGET_INSTANCE_ID && !isWidgetAudioLockExpired(lock)) {
        widgetAudioHasLock = false;
        stopWidgetAudio();
        return;
    }

    acquireWidgetAudioLock();
}

function releaseWidgetAudioLock() {
    if (!WIDGET_AUDIO_ENABLED) return;
    try {
        const lock = readWidgetAudioLock();
        if (lock && lock.owner === WIDGET_INSTANCE_ID) {
            localStorage.removeItem(WIDGET_AUDIO_LOCK_KEY);
        }
    } catch (error) {}
}

function startWidgetAudioLockHeartbeat() {
    if (!WIDGET_AUDIO_ENABLED || widgetAudioLockInterval) return;
    acquireWidgetAudioLock();
    widgetAudioLockInterval = setInterval(renewWidgetAudioLock, WIDGET_AUDIO_LOCK_RENEW_MS);
    window.addEventListener('beforeunload', releaseWidgetAudioLock);
    window.addEventListener('pagehide', releaseWidgetAudioLock);
}

function handleWidgetAudioLockChange() {
    if (!WIDGET_AUDIO_ENABLED) return;
    const lock = readWidgetAudioLock();
    if (lock && lock.owner !== WIDGET_INSTANCE_ID && !isWidgetAudioLockExpired(lock)) {
        widgetAudioHasLock = false;
        stopWidgetAudio();
    }
}

function stopWidgetAudio() {
    widgetAudioSongId = '';
    if (!widgetAudioPlayer || !widgetAudioReady) return;
    try { widgetAudioPlayer.stopVideo(); } catch (error) {}
}

function syncWidgetAudio(state, force = false) {
    if (!WIDGET_AUDIO_ENABLED) return;
    widgetAudioLastState = state;
    startWidgetAudioLockHeartbeat();
    if (!widgetAudioHasLock && !acquireWidgetAudioLock()) return;

    if (!state || !state.hasSong || state.isStopped) {
        stopWidgetAudio();
        return;
    }

    if (state.source === 'spotify') {
        stopWidgetAudio();
        return;
    }

    loadWidgetAudioApi();
    if (!widgetAudioPlayer || !widgetAudioReady || !state.id) return;

    const targetTime = Math.max(0, Number(state.currentTime) || 0);
    const shouldPlay = !!state.isPlaying;

    try {
        if (widgetAudioSongId !== state.id) {
            widgetAudioSongId = state.id;
            if (shouldPlay) {
                widgetAudioPlayer.loadVideoById({ videoId: state.id, startSeconds: targetTime });
            } else {
                widgetAudioPlayer.cueVideoById({ videoId: state.id, startSeconds: targetTime });
                setTimeout(() => {
                    try { widgetAudioPlayer.pauseVideo(); } catch (error) {}
                }, 0);
            }
            return;
        }

        const now = Date.now();
        const currentTime = widgetAudioPlayer.getCurrentTime ? widgetAudioPlayer.getCurrentTime() : targetTime;
        const drift = Math.abs(currentTime - targetTime);
        if ((force || drift > WIDGET_AUDIO_SYNC_THRESHOLD) && now - widgetAudioLastSeekAt > 900) {
            widgetAudioPlayer.seekTo(targetTime, true);
            widgetAudioLastSeekAt = now;
        }

        const audioState = widgetAudioPlayer.getPlayerState ? widgetAudioPlayer.getPlayerState() : 0;
        if (shouldPlay) {
            if (audioState !== 1) widgetAudioPlayer.playVideo();
        } else if (audioState === 1 || audioState === 3) {
            widgetAudioPlayer.pauseVideo();
        }
    } catch (error) {}
}

function clearWidgetAutoHide() {
    clearTimeout(widgetAutoHideTimeout);
    widgetAutoHideTimeout = null;
    widgetAutoHideMode = '';
    widgetHiddenReason = '';
}

function showWidgetNow() {
    clearWidgetAutoHide();
    root.classList.add('is-widget-visible');
    root.classList.remove('is-widget-hidden');
}

function shouldKeepWidgetSilent(mode) {
    if (!root.classList.contains('is-widget-hidden')) return false;
    if (!widgetHiddenReason) return false;
    if (widgetHiddenReason === mode) return true;
    return ['paused', 'stopped', 'empty'].includes(widgetHiddenReason);
}

function showWidgetTemporarily(mode) {
    if (WIDGET_EDITOR_PREVIEW) {
        clearWidgetAutoHide();
        root.classList.add('is-widget-visible');
        root.classList.remove('is-widget-hidden');
        widgetHiddenReason = '';
        widgetAutoHideMode = '';
        return true;
    }

    if (shouldKeepWidgetSilent(mode)) return false;

    root.classList.add('is-widget-visible');
    root.classList.remove('is-widget-hidden');
    widgetHiddenReason = '';

    if (widgetAutoHideMode === mode && widgetAutoHideTimeout) return true;

    clearTimeout(widgetAutoHideTimeout);
    widgetAutoHideMode = mode;
    widgetAutoHideTimeout = setTimeout(() => {
        root.classList.add('is-widget-hidden');
        widgetHiddenReason = mode;
        widgetAutoHideTimeout = null;
    }, WIDGET_AUTO_HIDE_MS);
    return true;
}

function renderWidgetStatus(messageKey, mode = 'connection') {
    if (shouldKeepWidgetSilent(mode)) return;

    activeWidgetSongKey = '';
    if (widgetResizeObserver) widgetResizeObserver.disconnect();

    const message = escapeHtml(widgetT(messageKey));
    const statusEl = root.querySelector('.widget-status');

    if (!statusEl || widgetStatusKey !== messageKey) {
        root.innerHTML = '<div class="widget-status" role="status">' + message + '</div>';
    } else {
        statusEl.innerHTML = message;
    }

    widgetStatusKey = messageKey;
    showWidgetTemporarily(mode);
}

function renderEmpty() {
    renderWidgetStatus('ui_widget_waiting_player', 'empty');
}

function getWidgetSongKey(state) {
    return [
        state.source || '',
        state.id || '',
        state.title || '',
        state.author || '',
        state.user || '',
        state.thumbnail || ''
    ].join('|');
}

function syncWidgetLayoutConfigFromState(state) {
    if (!state || !Object.prototype.hasOwnProperty.call(state, 'widgetLayout')) return false;
    const nextConfig = normalizeWidgetLayoutConfig(state.widgetLayout);
    const currentPayload = activeWidgetLayoutConfig ? JSON.stringify(activeWidgetLayoutConfig) : '';
    const nextPayload = nextConfig ? JSON.stringify(nextConfig) : '';
    if (currentPayload === nextPayload) return false;

    activeWidgetLayoutConfig = WIDGET_EDITOR_PREVIEW ? nextConfig : writeWidgetLayoutConfig(nextConfig);
    const card = document.getElementById('widget-now-playing-card');
    if (card) {
        applyWidgetLayoutToCard(card, activeWidgetLayoutConfig, { editor: WIDGET_EDITOR_PREVIEW });
        syncNowPlayingWaveBars(document.getElementById('widget-now-playing-wave'));
        queueWidgetTextFit();
    }
    return true;
}

function updateWidgetCardState(state, progress) {
    const card = document.getElementById('widget-now-playing-card');
    const currentEl = document.getElementById('widget-now-playing-current');
    const durationEl = document.getElementById('widget-now-playing-duration');
    const progressEl = document.getElementById('widget-now-playing-progress');
    const waveEl = document.getElementById('widget-now-playing-wave');
    const srStatusEl = document.getElementById('widget-now-playing-sr-status');
    const isSkipEffect = state.waveEffect === 'skip';
    const isFadeEffect = state.waveEffect === 'fade';
    const isWaveHeld = !!state.waveHold && !isSkipEffect;
    const srEnabled = state.srEnabled === true || state.srEnabled === 'true';

    if (currentEl) currentEl.innerText = formatTime(state.currentTime);
    if (durationEl) durationEl.innerText = formatTime(state.duration);
    if (progressEl) progressEl.style.width = progress + '%';
    if (srStatusEl) {
        srStatusEl.innerText = '!SR ' + (srEnabled ? 'ON' : 'OFF');
        srStatusEl.classList.toggle('is-sr-on', srEnabled);
        srStatusEl.classList.toggle('is-sr-off', !srEnabled);
    }
    if (waveEl) {
        waveEl.style.setProperty('--np-progress', progress + '%');
        syncNowPlayingWaveBars(waveEl);
    }
    if (card) {
        const skipEffectId = String(state.waveEffectId || (isSkipEffect ? state.updatedAt || Date.now() : ''));
        if (isSkipEffect && card.dataset.skipEffectId !== skipEffectId) {
            card.dataset.skipEffectId = skipEffectId;
            randomizeNowPlayingSkipBars(waveEl, skipEffectId);
            card.classList.remove('is-skipping');
            void card.offsetWidth;
        } else if (!isSkipEffect) {
            card.dataset.skipEffectId = '';
        }

        card.classList.toggle('is-playing', !!state.isPlaying && !state.waveEnding && !isSkipEffect && !isFadeEffect && !isWaveHeld);
        card.classList.toggle('is-wave-ending', !!state.waveEnding);
        card.classList.toggle('is-skipping', isSkipEffect);
        card.classList.toggle('is-wave-fading', isFadeEffect);
        card.classList.toggle('is-wave-held', isWaveHeld);
    }
    queueWidgetTextFit();
}

let widgetTextFitFrame = 0;
let widgetResizeObserver = null;

function queueWidgetTextFit() {
    cancelAnimationFrame(widgetTextFitFrame);
    widgetTextFitFrame = requestAnimationFrame(() => {
        const card = document.getElementById('widget-now-playing-card');
        if (card && card.classList.contains('has-custom-layout')) {
            queueWidgetLayoutCardTextFit(card);
            return;
        }
        fitWidgetOriginalCardText(card);
    });
}

function observeWidgetCard() {
    const card = document.getElementById('widget-now-playing-card');
    if (!card || !('ResizeObserver' in window)) return;
    if (widgetResizeObserver) widgetResizeObserver.disconnect();
    widgetResizeObserver = new ResizeObserver(() => {
        syncNowPlayingWaveBars(document.getElementById('widget-now-playing-wave'));
        queueWidgetTextFit();
    });
    widgetResizeObserver.observe(card);
}

function renderState(state) {
    syncWidgetAudio(state);
    syncWidgetLayoutConfigFromState(state);

    if (!state || !state.hasSong || state.isStopped) {
        if (state && state.isStopped && lastWidgetPlayableState && document.getElementById('widget-now-playing-card')) {
            if (shouldKeepWidgetSilent('stopped')) return;

            const stoppedState = {
                ...lastWidgetPlayableState,
                isPlaying: false,
                waveEnding: false,
                waveEffect: 'fade'
            };
            const progress = Math.min(100, Math.max(0, stoppedState.progress || 0));
            updateWidgetCardState(stoppedState, progress);
            showWidgetTemporarily('stopped');
            return;
        }

        renderWidgetStatus('ui_widget_waiting_player', state && state.isStopped ? 'stopped' : 'empty');
        return;
    }

    lastWidgetPlayableState = { ...state };
    widgetStatusKey = '';

    const title = escapeHtml(state.title || 'Unknown Title');
    const author = escapeHtml(cleanAuthorName(state.author || 'YouTube'));
    const user = state.user === 'Auto' ? 'Auto' : escapeHtml(state.user || 'Viewer');
    const thumbnailUrl = state.thumbnail || (state.id ? 'https://i.ytimg.com/vi/' + state.id + '/mqdefault.jpg' : '');
    const thumbnail = escapeHtml(thumbnailUrl);
    const progress = Math.min(100, Math.max(0, state.progress || 0));
    const waveEffect = state.waveEffect || '';
    const playingClass = state.isPlaying && !state.waveEnding && waveEffect !== 'skip' && waveEffect !== 'fade' ? ' is-playing' : '';
    const waveEndingClass = state.waveEnding ? ' is-wave-ending' : '';
    const skipClass = waveEffect === 'skip' ? ' is-skipping' : '';
    const fadeClass = waveEffect === 'fade' ? ' is-wave-fading' : '';
    const holdClass = state.waveHold && waveEffect !== 'skip' ? ' is-wave-held' : '';
    const srEnabled = state.srEnabled === true || state.srEnabled === 'true';
    const srStatusClass = srEnabled ? ' is-sr-on' : ' is-sr-off';
    const srStatusText = '!SR ' + (srEnabled ? 'ON' : 'OFF');
    const songKey = getWidgetSongKey(state);

    if (songKey === activeWidgetSongKey && document.getElementById('widget-now-playing-card')) {
        updateWidgetCardState(state, progress);
        if (state.isPlaying) {
            showWidgetNow();
        } else {
            showWidgetTemporarily('paused');
        }
        return;
    }

    activeWidgetSongKey = songKey;
    root.innerHTML =
        '<div id="widget-now-playing-card" class="now-playing-card panel-card' + playingClass + waveEndingClass + skipClass + fadeClass + holdClass + '">' +
            '<img class="np-card-cover" data-widget-element="cover" src="' + thumbnail + '" alt="">' +
            '<div class="np-card-info-bg" data-widget-element="infoBackground" aria-hidden="true"></div>' +
            '<div class="np-card-meter-bg" data-widget-element="meterBackground" aria-hidden="true"></div>' +
            '<div class="np-card-main">' +
                '<div class="np-card-info">' +
                    '<div class="np-card-title" data-widget-element="title" title="' + title + '">' + title + '</div>' +
                    '<div class="np-card-author" data-widget-element="author" title="' + author + '">' + author + '</div>' +
                '</div>' +
                '<div class="np-card-meter">' +
                    '<span id="widget-now-playing-current" class="np-card-time" data-widget-element="currentTime">' + formatTime(state.currentTime) + '</span>' +
                    '<div id="widget-now-playing-wave" class="np-card-wave" data-widget-element="waveform" style="--np-progress: ' + progress + '%" aria-hidden="true">' + createNowPlayingWaveBars() + '</div>' +
                    '<span id="widget-now-playing-duration" class="np-card-time" data-widget-element="duration">' + formatTime(state.duration) + '</span>' +
                '</div>' +
            '</div>' +
            '<span class="np-card-user" data-widget-element="requester">' + user + '</span>' +
            '<span id="widget-now-playing-sr-status" class="np-card-sr-status' + srStatusClass + '" data-widget-element="srStatus">' + srStatusText + '</span>' +
            '<div class="np-card-progress" data-widget-element="progress"><div id="widget-now-playing-progress" class="np-card-progress-fill" style="width: ' + progress + '%"></div></div>' +
        '</div>';

    applyWidgetLayoutToCard(document.getElementById('widget-now-playing-card'), activeWidgetLayoutConfig, { editor: WIDGET_EDITOR_PREVIEW });
    updateWidgetCardState(state, progress);
    observeWidgetCard();
    applyCoverThemeToNowPlayingCard(document.getElementById('widget-now-playing-card'), thumbnailUrl);

    if (state.isPlaying) {
        showWidgetNow();
    } else {
        showWidgetTemporarily('paused');
    }
}

function consumePayload(payload, source = 'unknown') {
    if (!payload) return;
    try {
        const state = JSON.parse(payload);
        if (!state || state.type !== 'NOW_PLAYING_STATE') return;

        const now = Date.now();
        if (state.updatedAt && now - state.updatedAt > WIDGET_STALE_MS) {
            const hasFreshState = lastWidgetStateAt && now - lastWidgetStateAt <= WIDGET_STALE_MS;
            if (hasFreshState || source === 'storage' || source === 'storage-event') return;
            if (!lastWidgetStateAt || now - lastWidgetStateAt < WIDGET_CONNECTION_MESSAGE_DELAY_MS) return;

            renderWidgetStatus('ui_widget_waiting_player', 'connection');
            return;
        }

        if (payload === lastPayload) return;

        lastPayload = payload;
        lastWidgetStateAt = now;
        renderState(state);
    } catch (error) {
        renderWidgetStatus('ui_widget_waiting_player', 'connection');
    }
}

function handleWidgetState(state, source = 'message') {
    if (!state || state.type !== 'NOW_PLAYING_STATE') return;
    if (WIDGET_EDITOR_PREVIEW && source !== 'editor') return;
    consumePayload(JSON.stringify(state), source);
}

function readStorageState() {
    try {
        consumePayload(localStorage.getItem(STORAGE_KEY), 'storage');
    } catch (error) {}
}

function unwrapStreamerBotPayload(raw) {
    if (raw && raw.data && typeof raw.data === 'object' && raw.data.data) {
        try { return JSON.parse(raw.data.data); } catch (error) { return null; }
    }
    if (raw && raw.type) return raw;
    return null;
}

async function createStreamerBotAuthentication(password, salt, challenge) {
    const encoder = new TextEncoder();
    const toBase64 = buffer => btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const secretBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password + salt));
    const secret = toBase64(secretBuffer);
    const authBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secret + challenge));
    return toBase64(authBuffer);
}

function clearWidgetFallbackSubscribe() {
    clearTimeout(widgetWsFallbackSubscribeTimeout);
    widgetWsFallbackSubscribeTimeout = null;
}

function subscribeWidgetToStreamerBotEvents(socket = widgetWs) {
    if (socket && socket === widgetWs && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ request: 'Subscribe', events: { General: ['Custom'] }, id: 'WidgetSub' }));
        widgetWsSubscribed = true;
        clearWidgetFallbackSubscribe();
    }
}

async function handleWidgetStreamerBotHello(raw, socket = widgetWs) {
    if (socket !== widgetWs) return;
    clearWidgetFallbackSubscribe();

    if (raw.authentication) {
        if (!WIDGET_WS_PASS) return;
        try {
            const authentication = await createStreamerBotAuthentication(WIDGET_WS_PASS, raw.authentication.salt, raw.authentication.challenge);
            if (socket === widgetWs && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ request: 'Authenticate', authentication, id: 'WidgetAuth' }));
            }
        } catch (error) {}
        return;
    }

    subscribeWidgetToStreamerBotEvents(socket);
}

function connectWidgetWebsocket() {
    if (typeof WebSocket === 'undefined') return;
    clearTimeout(widgetWsReconnectTimeout);
    clearWidgetFallbackSubscribe();
    widgetWsSubscribed = false;
    const socket = new WebSocket(buildStreamerBotWebsocketUrl(WIDGET_WS_HOST, WIDGET_WS_PORT));
    widgetWs = socket;

    socket.onopen = () => {
        if (socket !== widgetWs || WIDGET_WS_PASS) return;
        widgetWsFallbackSubscribeTimeout = setTimeout(() => {
            if (socket === widgetWs && !widgetWsSubscribed) {
                subscribeWidgetToStreamerBotEvents(socket);
            }
        }, 750);
    };

    socket.onmessage = async event => {
        if (socket !== widgetWs) return;
        try {
            const raw = JSON.parse(event.data.toString());
            if (raw.request === 'Hello') {
                await handleWidgetStreamerBotHello(raw, socket);
                return;
            }
            if (raw.id === 'WidgetSub') {
                if (raw.status === 'ok') widgetWsSubscribed = true;
                return;
            }
            if (raw.id === 'WidgetAuth') {
                if (raw.status === 'ok') subscribeWidgetToStreamerBotEvents(socket);
                return;
            }

            handleWidgetState(unwrapStreamerBotPayload(raw), 'streamerbot');
        } catch (error) {}
    };

    socket.onerror = () => {
        if (socket !== widgetWs) return;
        try { socket.close(); } catch (error) {}
    };

    socket.onclose = () => {
        if (socket !== widgetWs) return;
        clearWidgetFallbackSubscribe();
        widgetWsSubscribed = false;
        widgetWsReconnectTimeout = setTimeout(connectWidgetWebsocket, 5000);
    };
}

try {
    if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = event => handleWidgetState(event.data, 'broadcast');
    }
} catch (error) {}

window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) consumePayload(event.newValue, 'storage-event');
    if (event.key === WIDGET_AUDIO_LOCK_KEY) handleWidgetAudioLockChange();
    if (event.key === WIDGET_LAYOUT_STORAGE_KEY) {
        activeWidgetLayoutConfig = normalizeWidgetLayoutConfig(event.newValue);
        const card = document.getElementById('widget-now-playing-card');
        if (card) {
            applyWidgetLayoutToCard(card, activeWidgetLayoutConfig, { editor: WIDGET_EDITOR_PREVIEW });
            syncNowPlayingWaveBars(document.getElementById('widget-now-playing-wave'));
            queueWidgetTextFit();
        }
    }
});

window.addEventListener('message', event => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'WIDGET_EDITOR_STATE' && data.state) {
        handleWidgetState(data.state, 'editor');
    } else if (data.type === 'NOW_PLAYING_STATE') {
        handleWidgetState(data, 'message');
    }
});

function monitorWidgetConnection() {
    if (!lastWidgetStateAt || Date.now() - lastWidgetStateAt > WIDGET_CONNECTION_MESSAGE_DELAY_MS) {
        stopWidgetAudio();
        renderWidgetStatus('ui_widget_waiting_player', 'connection');
    }
}

renderWidgetStatus('ui_widget_waiting_player', 'connection');
if (!WIDGET_EDITOR_PREVIEW) {
    readStorageState();
    connectWidgetWebsocket();
    setInterval(readStorageState, 500);
    setInterval(monitorWidgetConnection, 1000);
}
} else {
        // =========================================================================
        // PROJECT VERSION AND GITHUB DATA
        // =========================================================================
        const PROJECT_NAME = "Better Song Request";
        const CURRENT_VERSION = "v2.0.0";
        const GITHUB_REPO = "xHackMe/better-song-request-streamerbot";
        const REQUIRED_STREAMERBOT_IMPORT_VERSION = "1.1.0";
        const STREAMERBOT_DIAGNOSTICS_ACTION = "YtmImportDiagnostics";
        const SETTINGS_BACKUP_TYPE = "BETTER_SONG_REQUEST_SETTINGS_BACKUP";
        const LEGACY_SETTINGS_BACKUP_TYPES = ["YTM_SONG_REQUEST_SETTINGS_BACKUP"];
        const APP_THEME_STORAGE_KEY = "better_song_request_theme";
        const REQUIRED_IMPORT_FEATURES = [
            { key: 'IMPORT_DIAGNOSTICS', label: 'YtmImportDiagnostics' },
            { key: 'CHAT_MESSAGE', label: 'ChatMessage' },
            { key: 'SONG_REQUEST_SETTINGS', label: 'SongRequestSettings' },
            { key: 'NOW_PLAYING_WIDGET_STATE', label: 'NowPlayingWidgetState' },
            { key: 'VOTE_SKIP', label: 'SongVoteSkip / !voteskip' },
            { key: 'WHEN_SONG', label: 'SongWhen / !when' },
            { key: 'QUEUE_SONGS', label: 'SongQueue / !queue' },
            { key: 'CHANNEL_POINT_REWARD_TRIGGER', label: 'Twitch channel point reward trigger' },
            { key: 'KICK_CHANNEL_REWARD_TRIGGER', label: 'Kick channel reward trigger' },
            { key: 'MULTI_CHAT_SOURCE', label: 'Twitch/Kick/YouTube replies' },
            { key: 'SPOTIFY_TRACK_REQUEST', label: 'Spotify track link requests' }
        ];
        const REQUIRED_IMPORT_COMPONENTS = {
            actions: [
                { id: '94d7e904-65a5-4bc9-b740-5db4b15fb384', name: 'SongRequest' },
                { id: '20ca3b4c-2f87-4c87-8fe0-1a45d03fabda', name: 'SongSkip' },
                { id: '1dca93a1-93f4-4ccc-968a-ac0d51a36b48', name: 'SongName' },
                { id: '31afbb0e-1bd6-401d-a688-c74f4638a327', name: 'ChatMessage' },
                { id: '5dbca670-b09f-455c-be38-45efc897449e', name: 'SongWrong' },
                { id: '0ab19324-7816-4a2f-85b6-4485bb7559c2', name: 'SongVolume' },
                { id: '93c93f58-a2c0-44aa-9fcc-21eca6bd3639', name: 'SongRequestForce' },
                { id: '2810ecba-ba84-4a87-a876-db4ee21e7a67', name: 'SongPlay' },
                { id: '0bd4f3b1-a85e-47a5-b555-90047baf9a31', name: 'SongPause' },
                { id: 'dca0e174-4cb8-45aa-b319-254c7969bbf3', name: 'SongStop' },
                { id: '7b511689-cf6f-499e-a06e-980978bb4376', name: 'SongRequestSettings' },
                { id: '481f0f0a-dfae-4152-ad60-90ad1750b981', name: 'NowPlayingWidgetState' },
                { id: 'f878f3d8-096f-4e9a-b9f0-024c1458e8c1', name: 'SongVoteSkip' },
                { id: '60a417db-fd5d-4a39-82c1-9b8f8608f102', name: 'SongWhen' },
                { id: 'd5232b31-c096-4b71-a9b1-6b4a03aca0a7', name: 'SongQueue' },
                { name: 'YtmImportDiagnostics' }
            ],
            commands: [
                { id: '16422aad-ca07-43c6-b527-dc8f0a2f7c13', name: '!sr', aliases: ['!sr'], action: 'SongRequest' },
                { id: 'a306e7a2-e751-4f2d-8da9-1cb7190c937a', name: '!srForce', aliases: ['!srForce', '!srforce'], action: 'SongRequestForce' },
                { id: 'cfe7edd2-1ac5-49bf-bc06-1f7f96848937', name: '!song', aliases: ['!song', '!songname'], action: 'SongName' },
                { id: 'e9be62d5-3d98-4c5a-bc61-889b450e976a', name: '!when', aliases: ['!when'], action: 'SongWhen' },
                { id: 'dc2d8d53-b8ff-4dd5-b387-26e18d2ecf92', name: '!queue', aliases: ['!queue'], action: 'SongQueue' },
                { id: 'f0c06e4b-adf2-4224-9187-7d67a8a83451', name: '!skip', aliases: ['!skip', '!skipsong'], action: 'SongSkip' },
                { id: '5c6af3b5-f713-48ed-83bf-23c948ef9c37', name: '!voteskip', aliases: ['!voteskip', '!skipvote'], action: 'SongVoteSkip' },
                { id: 'c20bddc3-36d8-4a9f-b0e1-a507233b0c40', name: '!wrongsong', aliases: ['!wrongsong', '!songwrong'], action: 'SongWrong' },
                { id: '2c49515d-e91f-4078-a7fb-f24268ea4abb', name: '!volume', aliases: ['!volume', '!vol'], action: 'SongVolume' },
                { id: '20eb9753-9b5e-4e69-b81e-c606903bdc35', name: '!play', aliases: ['!play'], action: 'SongPlay' },
                { id: 'e520cf7f-b787-4ea8-b9c2-9af312730ed5', name: '!pause', aliases: ['!pause'], action: 'SongPause' },
                { id: '33a78c74-c9bd-4ae3-b7ca-2e269967d824', name: '!stop', aliases: ['!stop'], action: 'SongStop' }
            ]
        };
        
        function renderBranding() {
            document.title = `${PROJECT_NAME} ${CURRENT_VERSION}`;
            const brandNameEl = document.getElementById('app-brand-name');
            const footerProjectEl = document.getElementById('footer-project-name');
            const faviconLink = document.querySelector('link[rel~="icon"]');
            const brandFaviconEl = document.getElementById('app-brand-favicon');
            if (brandNameEl) brandNameEl.innerText = PROJECT_NAME;
            if (footerProjectEl) footerProjectEl.innerText = PROJECT_NAME;
            if (brandFaviconEl && faviconLink) brandFaviconEl.src = faviconLink.href;
        }

        renderBranding();
        document.getElementById('app-version-display').innerText = CURRENT_VERSION;
        if (document.getElementById('import-version-display')) {
            document.getElementById('import-version-display').innerText = `Import ${REQUIRED_STREAMERBOT_IMPORT_VERSION}`;
        }

        function isTestVersion(version) {
            return /t$/i.test(String(version || '').trim());
        }

        function renderTestVersionBadge() {
            const updateBtn = document.getElementById('update-btn');
            if (!updateBtn) return;
            updateBtn.style.display = 'block';
            updateBtn.removeAttribute('data-version');
            updateBtn.setAttribute('data-test-version', 'true');
            updateBtn.innerText = t('ui_test_version');
            updateBtn.onclick = null;
        }

        function normalizeVersionTag(version) {
            return String(version || '').trim().toLowerCase().replace(/^v/, '');
        }

        function getGithubReleaseUrl(tagName) {
            return `https://github.com/${GITHUB_REPO}/releases/tag/${encodeURIComponent(tagName)}`;
        }

        function renderGithubChangelogMessage(message, isError = false) {
            const clContent = document.getElementById('changelog-content');
            if (!clContent) return;
            clContent.innerHTML = '<div class="' + (isError ? 'ex-style-066' : 'ex-style-065') + '">' + escapeHtml(message) + '</div>';
        }

        async function fetchGithubJson(path) {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeout = controller ? setTimeout(() => controller.abort(), 12000) : null;
            try {
                const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`, {
                    cache: 'no-store',
                    headers: { 'Accept': 'application/vnd.github+json' },
                    signal: controller ? controller.signal : undefined
                });
                if (!res.ok) {
                    let detail = `${res.status} ${res.statusText}`.trim();
                    try {
                        const errorBody = await res.json();
                        if (errorBody && errorBody.message) detail += ` - ${errorBody.message}`;
                    } catch (error) {}
                    throw new Error(detail || 'GitHub request failed');
                }
                return await res.json();
            } finally {
                if (timeout) clearTimeout(timeout);
            }
        }

        function updateGithubVersionButton(latestTagName, latestUrl, localIsTestVersion) {
            const updateBtn = document.getElementById('update-btn');
            if (!updateBtn || !latestTagName) return;
            if (localIsTestVersion) {
                renderTestVersionBadge();
                return;
            }
            const cleanLocalVer = normalizeVersionTag(CURRENT_VERSION);
            const cleanGithubVer = normalizeVersionTag(latestTagName);
            console.log(`[Update Check] Local: ${cleanLocalVer} | GitHub: ${cleanGithubVer}`);
            if (cleanLocalVer !== cleanGithubVer) {
                updateBtn.style.display = 'block';
                updateBtn.removeAttribute('data-test-version');
                updateBtn.setAttribute('data-version', latestTagName);
                updateBtn.innerText = t('ui_update_btn', { version: latestTagName });
                updateBtn.onclick = () => window.open(latestUrl || `https://github.com/${GITHUB_REPO}/releases`, '_blank');
            } else {
                updateBtn.style.display = 'none';
            }
        }

        function formatGithubReleaseBody(bodyText) {
            return (bodyText || "No release notes provided.").split('\n').map(line => {
                let trimmed = escapeHtml(line.trim());
                if (trimmed.length === 0) return "<br>";

                let hasBadge = false;
                trimmed = trimmed.replace(/^(NEW|FIX|CHANGE|CHG)\s/i, function(match, type) {
                    hasBadge = true;
                    let cssClass = "cl-chg";
                    let tUpper = type.toUpperCase();
                    if (tUpper === "NEW") cssClass = "cl-new";
                    else if (tUpper === "FIX") cssClass = "cl-fix";
                    return `<span class="cl-badge ${cssClass}">${tUpper}</span> `;
                });

                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    trimmed = trimmed.substring(2);
                    hasBadge = true;
                }

                if (hasBadge) return `<li class="ex-style-062">${trimmed}</li>`;
                return `<div>${trimmed}</div>`;
            }).join('');
        }

        function renderGithubReleases(releases) {
            const clContent = document.getElementById('changelog-content');
            if (!clContent) return;
            const cleanLocalVer = normalizeVersionTag(CURRENT_VERSION);
            clContent.innerHTML = '';

            releases.forEach(rel => {
                const date = rel.published_at ? new Date(rel.published_at).toLocaleDateString() : '';
                const cleanRelVer = normalizeVersionTag(rel.tag_name);
                const isCurrent = (cleanRelVer === cleanLocalVer)
                    ? '<span class="ex-style-061">(Your Version)</span>'
                    : '';
                const releaseTitle = escapeHtml(rel.name || rel.tag_name || 'Release');
                const releaseUrl = escapeHtml(rel.html_url || `https://github.com/${GITHUB_REPO}/releases`);
                const formattedBody = formatGithubReleaseBody(rel.body);

                clContent.innerHTML += `
                    <div class="changelog-entry">
                        <h4 class="cl-version">
                            <a href="${releaseUrl}" target="_blank" title="View this release on GitHub" class="ex-style-063">
                                ${releaseTitle}
                            </a>
                            ${isCurrent}
                            <span class="cl-date">${escapeHtml(date)}</span>
                        </h4>
                        <div class="cl-body"><ul class="ex-style-064">${formattedBody}</ul></div>
                    </div>
                `;
            });
        }
        
        async function checkGithubUpdates() {
            const localIsTestVersion = isTestVersion(CURRENT_VERSION);
            if (localIsTestVersion) renderTestVersionBadge();

            try {
                const releases = await fetchGithubJson('/releases');

                if (Array.isArray(releases) && releases.length > 0) {
                    updateGithubVersionButton(releases[0].tag_name, releases[0].html_url, localIsTestVersion);
                    renderGithubReleases(releases);
                    return;
                }

                const tags = await fetchGithubJson('/tags');
                const latestTag = Array.isArray(tags) && tags.length > 0 ? tags[0].name : '';
                if (latestTag) {
                    updateGithubVersionButton(latestTag, getGithubReleaseUrl(latestTag), localIsTestVersion);
                    renderGithubChangelogMessage('No releases found on GitHub. Version was checked using repository tags.');
                } else {
                    const updateBtn = document.getElementById('update-btn');
                    if (updateBtn && !localIsTestVersion) updateBtn.style.display = 'none';
                    renderGithubChangelogMessage('No releases or tags found on GitHub.');
                }
            } catch(e) {
                console.error("GitHub API Error:", e);
                renderGithubChangelogMessage(`Error loading GitHub data for ${GITHUB_REPO}: ${e.message || e}`, true);
            }
        }

        // =========================================================================
        function normalizePositiveInteger(value, fallback) {
            const parsed = parseInt(value, 10);
            return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
        }

        const CUSTOM_MSGS_DISABLED_PREFIX = 'ytm_custom_msgs_disabled_';

        let currentLang = localStorage.getItem('ytm_lang') || 'en';
        let customMsgs = JSON.parse(localStorage.getItem('ytm_custom_msgs_' + currentLang)) || {};
        let disabledCustomMsgs = JSON.parse(localStorage.getItem(CUSTOM_MSGS_DISABLED_PREFIX + currentLang)) || {};

        function dateOnly(date) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        }

        function isLocalDateInRange(date, range) {
            const year = date.getFullYear();
            const current = dateOnly(date);
            for (let offset = -1; offset <= 1; offset++) {
                const startYear = year + offset;
                const endYear = range.em < range.sm ? startYear + 1 : startYear;
                const start = dateOnly(new Date(startYear, range.sm, range.sd));
                const end = dateOnly(new Date(endYear, range.em, range.ed));
                if (current >= start && current <= end) return true;
            }
            return false;
        }

        function getHolidayVariant(date = new Date()) {
            return HOLIDAY_VARIANTS.find(variant => variant.ranges.some(range => isLocalDateInRange(date, range))) || null;
        }

        function renderHolidayEffects(variant) {
            const root = document.getElementById('holiday-effects');
            if (!root) return;

            const holidayKey = variant
                ? String(variant.className || variant.key || '').replace(/^theme-/, '').toLowerCase()
                : '';
            if (root.dataset.holidayKey === holidayKey) return;

            root.dataset.holidayKey = holidayKey;
            root.className = holidayKey ? `holiday-effects holiday-effects-${holidayKey}` : 'holiday-effects';
            root.replaceChildren();
            if (!variant) return;

            const fragment = document.createDocumentFragment();
            const addParticle = (className, properties, text = '') => {
                const particle = document.createElement('span');
                particle.className = className;
                particle.textContent = text;
                Object.entries(properties).forEach(([name, value]) => particle.style.setProperty(name, value));
                fragment.appendChild(particle);
            };

            if (holidayKey === 'christmas') {
                for (let index = 0; index < 20; index++) {
                    addParticle('holiday-snowflake', {
                        '--holiday-x': `${Math.random() * 100}%`,
                        '--holiday-delay': `${-(Math.random() * 8).toFixed(2)}s`,
                        '--holiday-duration': `${(4 + Math.random() * 5).toFixed(2)}s`,
                        '--holiday-drift': `${Math.round(-20 + Math.random() * 40)}px`,
                        '--holiday-size': `${(7 + Math.random() * 9).toFixed(1)}px`
                    }, '\u2744');
                }
            } else if (holidayKey === 'newyear') {
                const colors = ['#ffcf45', '#ff5b4d', '#5ac5bd', '#9a76e8', '#f4f0df'];
                for (let index = 0; index < 8; index++) {
                    addParticle('holiday-firework', {
                        '--holiday-x': `${16 + Math.random() * 68}%`,
                        '--holiday-y': `${24 + Math.random() * 52}%`,
                        '--holiday-delay': `${-(Math.random() * 4.6).toFixed(2)}s`,
                        '--holiday-color': colors[index % colors.length]
                    });
                }
            } else if (holidayKey === 'valentine') {
                for (let index = 0; index < 12; index++) {
                    addParticle('holiday-heart', {
                        '--holiday-x': `${8 + Math.random() * 84}%`,
                        '--holiday-delay': `${-(Math.random() * 9).toFixed(2)}s`,
                        '--holiday-duration': `${(5 + Math.random() * 5).toFixed(2)}s`,
                        '--holiday-drift': `${Math.round(-24 + Math.random() * 48)}px`,
                        '--holiday-size': `${(10 + Math.random() * 12).toFixed(1)}px`
                    }, '\u2665');
                }
            } else if (holidayKey === 'april') {
                const colors = ['#ff4f45', '#ff9c39', '#f3d34a', '#4fc3b2', '#246c91', '#764ac7'];
                for (let index = 0; index < 18; index++) {
                    addParticle('holiday-bubble', {
                        '--holiday-x': `${5 + Math.random() * 90}%`,
                        '--holiday-delay': `${-(Math.random() * 10).toFixed(2)}s`,
                        '--holiday-duration': `${(5 + Math.random() * 6).toFixed(2)}s`,
                        '--holiday-drift': `${Math.round(-30 + Math.random() * 60)}px`,
                        '--holiday-color': colors[index % colors.length],
                        '--holiday-size': `${(7 + Math.random() * 15).toFixed(1)}px`
                    });
                }
            }

            root.appendChild(fragment);
        }

        function applyHolidayVariant() {
            const themeClasses = HOLIDAY_VARIANTS.map(variant => variant.className);
            document.body.classList.remove(...themeClasses);
            activeHolidayVariant = getHolidayVariant(new Date());

            const messageEl = document.getElementById('holiday-message');
            if (activeHolidayVariant) {
                document.body.classList.add(activeHolidayVariant.className);
                if (messageEl) messageEl.innerText = t(activeHolidayVariant.messageKey);
            } else if (messageEl) {
                messageEl.innerText = '';
            }
            renderHolidayEffects(activeHolidayVariant);
        }

        function isHolidayStartupSong(song) {
            return song && song.user === 'Auto' && HOLIDAY_VARIANTS.some(variant => variant.song.id === song.id);
        }

        function refreshHolidayVariant() {
            const previousHolidayKey = activeHolidayVariant ? activeHolidayVariant.key : null;
            applyHolidayVariant();

            if (previousHolidayKey && !activeHolidayVariant && isHolidayStartupSong(currentSongInfo) && player && player.getPlayerState && player.getPlayerState() !== 1) {
                currentSongInfo = null;
                currentSongStopped = false;
                initialSongLoaded = false;
                renderQueue();
                loadInitialPlayerSong();
            }
        }

        function t(key, vars = {}) {
            let dict = i18n[currentLang] || i18n['en'];
            
            let text = dict[key] || i18n['en'][key] || key;
            if (key.startsWith('msg_') && disabledCustomMsgs[key]) {
                return '';
            }
            if (key.startsWith('msg_') && customMsgs[key]) {
                text = customMsgs[key];
            }

            for (let k in vars) {
                text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
            }
            return text;
        }

        let appTheme = localStorage.getItem(APP_THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';

        function updateThemeToggleButton() {
            const button = document.getElementById('theme-toggle');
            if (!button) return;
            const isDark = appTheme !== 'light';
            const label = t('ui_theme_toggle');
            button.classList.toggle('is-dark', isDark);
            button.classList.toggle('is-light', !isDark);
            button.title = label;
            button.setAttribute('aria-label', label);
            button.setAttribute('aria-pressed', String(isDark));
        }

        function applyAppTheme(theme = appTheme) {
            appTheme = theme === 'light' ? 'light' : 'dark';
            document.body.classList.toggle('theme-dark', appTheme === 'dark');
            document.body.classList.toggle('theme-light', appTheme === 'light');
            updateThemeToggleButton();
        }

        function toggleAppTheme() {
            applyAppTheme(appTheme === 'dark' ? 'light' : 'dark');
            localStorage.setItem(APP_THEME_STORAGE_KEY, appTheme);
        }

        function changeLanguage(langCode) {
            currentLang = langCode;
            localStorage.setItem('ytm_lang', langCode);
            customMsgs = JSON.parse(localStorage.getItem('ytm_custom_msgs_' + currentLang)) || {};
            disabledCustomMsgs = JSON.parse(localStorage.getItem(CUSTOM_MSGS_DISABLED_PREFIX + currentLang)) || {};
            
            applyTranslations();
            log(`🌐 Language changed to: ${langCode.toUpperCase()}`);

            if(document.getElementById('settings-modal').style.display === 'flex') {
                renderSettingsMessages();
            }

            updateWidgetUrlDisplay();

            const widgetCustomizerModal = document.getElementById('widget-customizer-modal');
            if (widgetCustomizerModal && widgetCustomizerModal.style.display === 'flex') {
                renderWidgetCustomizerPreview();
                renderWidgetCustomizerElementList();
                renderWidgetCustomizerControls();
            }

            if(ws) {
                ws.onclose = null; 
                ws.close();
                clearTimeout(wsReconnectTimeout);
                connectWebsocket();
            }
        }

        function renderFooterVersions() {
            renderBranding();
            const appVersionEl = document.getElementById('app-version-display');
            const importVersionEl = document.getElementById('import-version-display');
            if (appVersionEl) appVersionEl.innerText = CURRENT_VERSION;
            if (importVersionEl) importVersionEl.innerText = `${t('ui_import_version_short')} ${REQUIRED_STREAMERBOT_IMPORT_VERSION}`;
        }

        function applyTranslations() {
            if(document.getElementById('lang-select')) document.getElementById('lang-select').value = currentLang;
            if(document.getElementById('tut-lang-select')) document.getElementById('tut-lang-select').value = currentLang;
            
            applyHolidayVariant();
            document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n')); });
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
            document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.getAttribute('data-i18n-title')); });
            updateThemeToggleButton();

            // UPDATE BUTTON DYNAMIC TRANSLATION:
            const updateBtn = document.getElementById('update-btn');
            if (updateBtn && updateBtn.getAttribute('data-test-version')) {
                updateBtn.innerText = t('ui_test_version');
            } else if (updateBtn && updateBtn.getAttribute('data-version')) {
                updateBtn.innerText = t('ui_update_btn', {version: updateBtn.getAttribute('data-version')});
            }

            renderBaseList();
            renderQueue();
            if(document.getElementById('ban-modal').style.display === 'flex') renderBanList();
            if(document.getElementById('playlist-modal').style.display === 'flex') renderPlaylistManager();
            
            updateApiStatusUI(document.getElementById('api-status-icon').getAttribute('data-last-status') || 'init');
            
            renderBaseActionButtons();
            renderFooterVersions();
            renderViewerHistory();
            renderSpotifyStatus();
            
            updateTutLink(); 
            renderWebsocketStatus();
            renderImportStatusBanner();
            renderDiagnosticsResults();
            if (document.getElementById('widget-customizer-modal')?.style.display === 'flex') {
                renderWidgetCustomizerElementList();
                renderWidgetCustomizerControls();
            }
        }

        const SONG_SOURCE_YOUTUBE = 'youtube';
        const SONG_SOURCE_SPOTIFY = 'spotify';
        const SPOTIFY_PLAYER_SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
        const PLAYER_VOLUME_STORAGE_KEY = 'ytm_player_volume';
        const SPOTIFY_AUTH_STATE_KEY = 'ytm_spotify_auth_state';
        const SPOTIFY_CODE_VERIFIER_KEY = 'ytm_spotify_code_verifier';
        const SPOTIFY_CLIENT_ID_KEY = 'ytm_spotify_client_id';
        const SPOTIFY_ENABLED_KEY = 'ytm_spotify_enabled';
        const SPOTIFY_ACCESS_TOKEN_KEY = 'ytm_spotify_access_token';
        const SPOTIFY_REFRESH_TOKEN_KEY = 'ytm_spotify_refresh_token';
        const SPOTIFY_TOKEN_EXPIRES_KEY = 'ytm_spotify_token_expires_at';
        const SPOTIFY_SCOPES = [
            'streaming',
            'user-read-email',
            'user-read-private',
            'user-modify-playback-state',
            'user-read-playback-state',
            'playlist-read-private',
            'playlist-read-collaborative'
        ];
        const FALLBACK_COVER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 160 160%22%3E%3Crect width=%22160%22 height=%22160%22 fill=%22%23141b22%22/%3E%3Ccircle cx=%2280%22 cy=%2280%22 r=%2242%22 fill=%22%23263544%22/%3E%3Cpath d=%22M70 55v58l45-29z%22 fill=%22%23b7c6d6%22/%3E%3C/svg%3E';

        // =========================================================================
        let API_KEY = localStorage.getItem('ytm_api_key') || ''; 
        let SPOTIFY_CLIENT_ID = localStorage.getItem(SPOTIFY_CLIENT_ID_KEY) || '';
        const storedSpotifyEnabled = localStorage.getItem(SPOTIFY_ENABLED_KEY);
        let SPOTIFY_ENABLED = storedSpotifyEnabled === null ? !!SPOTIFY_CLIENT_ID : storedSpotifyEnabled === 'true';
        if (storedSpotifyEnabled === null && SPOTIFY_CLIENT_ID) localStorage.setItem(SPOTIFY_ENABLED_KEY, 'true');
        let spotifyAccessToken = localStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY) || '';
        let spotifyRefreshToken = localStorage.getItem(SPOTIFY_REFRESH_TOKEN_KEY) || '';
        let spotifyTokenExpiresAt = parseInt(localStorage.getItem(SPOTIFY_TOKEN_EXPIRES_KEY) || '0', 10) || 0;
        let spotifySdkPromise = null;
        let spotifyPlayer = null;
        let spotifyDeviceId = '';
        let spotifyPlayerReady = false;
        let spotifyPlaybackState = null;
        let spotifyPlaybackMonitor = null;
        let spotifyTrackEndHandled = false;
        let spotifyLastError = '';
        const storedPlayerVolume = localStorage.getItem(PLAYER_VOLUME_STORAGE_KEY);
        let PLAYER_VOLUME = storedPlayerVolume === null
            ? null
            : Math.min(100, Math.max(0, Number(storedPlayerVolume) || 0));
        let playerVolumeSyncPending = false;
        let WS_HOST = normalizeWebsocketHost(localStorage.getItem('ytm_ws_host') || DEFAULT_STREAMERBOT_WS_HOST);
        let WS_PORT = localStorage.getItem('ytm_ws_port') || '8080';
        let WS_PASS = localStorage.getItem('ytm_ws_pass') || '';
        let wsConnectionAttempt = 0;
        let wsStreamerBotReady = false;
        let wsStatusKey = 'ui_bot_connecting';
        let wsStatusColor = '#ffaa00';
        const QUEUE_STORAGE_KEY = 'ytm_persisted_queue';
        const SR_REMEMBER_STATE_STORAGE_KEY = 'ytm_sr_remember_state';
        const SR_ENABLED_STORAGE_KEY = 'ytm_sr_enabled';
        const FAVORITE_SONGS_STORAGE_KEY = 'ytm_favorite_songs';
        const VIEWER_HISTORY_STORAGE_KEY = 'ytm_viewer_song_history';
        const VIEWER_HISTORY_LIMIT = 1000;
        let SHOULD_PERSIST_QUEUE = localStorage.getItem('ytm_persist_queue') === 'true';
        let SHOULD_REMEMBER_SR_STATE = localStorage.getItem(SR_REMEMBER_STATE_STORAGE_KEY) === 'true';
        let queuePersistenceReady = false;
        let SR_MAX_DURATION_MINUTES = normalizePositiveInteger(localStorage.getItem('ytm_sr_max_duration_minutes'), 15);
        let SR_REQUIRE_MUSIC_CATEGORY = localStorage.getItem('ytm_sr_require_music_category') !== 'false';
        let SR_VOTESKIP_REQUIRED = normalizePositiveInteger(localStorage.getItem('ytm_sr_voteskip_required'), 5);
        let SR_USER_QUEUE_LIMIT = normalizePositiveInteger(localStorage.getItem('ytm_sr_user_queue_limit'), 25);
        let SR_GLOBAL_QUEUE_LIMIT = normalizePositiveInteger(localStorage.getItem('ytm_sr_global_queue_limit'), 100);
        let SR_USER_QUEUE_LIMIT_ENABLED = localStorage.getItem('ytm_sr_user_queue_limit_enabled') === 'true';
        let SR_GLOBAL_QUEUE_LIMIT_ENABLED = localStorage.getItem('ytm_sr_global_queue_limit_enabled') === 'true';
        let voteSkipUsers = new Set();
        let initialSongLoaded = false;
        let activeHolidayVariant = null;
        const DEFAULT_STARTUP_SONGS = [
            { id: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', author: 'Ed Sheeran', duration: 263, user: 'Auto' },
            { id: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito ft. Daddy Yankee', author: 'Luis Fonsi', duration: 282, user: 'Auto' },
            { id: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody', author: 'Queen', duration: 354, user: 'Auto' },
            { id: 'hT_nvWreIhg', title: 'OneRepublic - Counting Stars', author: 'OneRepublic', duration: 257, user: 'Auto' }
        ];
        const HOLIDAY_VARIANTS = [
		//	{ key: 'TEST', className: 'theme-christmas', messageKey: 'ui_holiday_christmas', ranges: [{ sm: 0, sd: 1, em: 11, ed: 31 }], song: { id: 'aAkMkVFwAoo', title: 'Mariah Carey - All I Want for Christmas Is You', author: 'Mariah Carey', duration: 241, user: 'Auto' } },
		//	{ key: 'TEST', className: 'theme-newyear', messageKey: 'ui_holiday_newyear', ranges: [{ sm: 0, sd: 1, em: 11, ed: 31 }], song: { id: '9jK-NcRmVcw', title: 'Europe - The Final Countdown', author: 'Europe', duration: 318, user: 'Auto' } },
		  {key: 'TEST', className: 'theme-valentine', messageKey: 'ui_holiday_valentine', ranges: [{ sm: 0, sd: 1, em: 11, ed: 31 }], song: { id: '2Vv-BfVoq4g', title: 'Ed Sheeran - Perfect', author: 'Ed Sheeran', duration: 263, user: 'Auto' } },
		//	{ key: 'TEST', className: 'theme-april', messageKey: 'ui_holiday_april', ranges: [{ sm: 0, sd: 1, em: 11, ed: 31 }], song: { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', author: 'Rick Astley', duration: 213, user: 'Auto' } },
            { key: 'christmas', className: 'theme-christmas', messageKey: 'ui_holiday_christmas', ranges: [{ sm: 11, sd: 24, em: 11, ed: 27 }], song: { id: 'aAkMkVFwAoo', title: 'Mariah Carey - All I Want for Christmas Is You', author: 'Mariah Carey', duration: 241, user: 'Auto' } },
            { key: 'newyear', className: 'theme-newyear', messageKey: 'ui_holiday_newyear', ranges: [{ sm: 11, sd: 31, em: 0, ed: 1 }], song: { id: '9jK-NcRmVcw', title: 'Europe - The Final Countdown', author: 'Europe', duration: 318, user: 'Auto' } },
            { key: 'valentine', className: 'theme-valentine', messageKey: 'ui_holiday_valentine', ranges: [{ sm: 1, sd: 14, em: 1, ed: 14 }], song: { id: '2Vv-BfVoq4g', title: 'Ed Sheeran - Perfect', author: 'Ed Sheeran', duration: 263, user: 'Auto' } },
            { key: 'april', className: 'theme-april', messageKey: 'ui_holiday_april', ranges: [{ sm: 3, sd: 1, em: 3, ed: 1 }], song: { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', author: 'Rick Astley', duration: 213, user: 'Auto' } }
        ];
        const NOW_PLAYING_WIDGET_KEY = 'ytm_now_playing_widget_state';
        const NOW_PLAYING_WIDGET_CHANNEL = 'ytm_now_playing_widget';
        const NOW_PLAYING_STREAMERBOT_ACTION = 'NowPlayingWidgetState';
        const NOW_PLAYING_STREAMERBOT_PUSH_INTERVAL = 500;
        const WIDGET_LAST_COPIED_URL_KEY = 'ytm_widget_url_last_copied';
        let nowPlayingWidgetChannel = null;
        let lastNowPlayingStreamerBotPush = 0;
        let nowPlayingWidgetStartupBurstTimeouts = [];
        let WIDGET_AUDIO_ENABLED_CONFIG = localStorage.getItem('ytm_widget_audio_enabled') === 'true';
        let WIDGET_LAYOUT_CONFIG = readWidgetLayoutConfig();
        let WIDGET_LAYOUT_REVISION = Number(localStorage.getItem(WIDGET_LAYOUT_REVISION_KEY)) || 0;
        let widgetUrlBaseline = '';
        let widgetUrlWarningEnabled = false;
        let widgetTestState = null;
        let widgetTestStateUntil = 0;
        const WIDGET_CUSTOMIZER_DEMO_SONG = {
            id: 'dQw4w9WgXcQ',
            title: 'Rick Astley - Never Gonna Give You Up',
            author: 'Rick Astley',
            duration: 213,
            user: 'Source'
        };
        const WIDGET_LAYOUT_ELEMENT_LABEL_KEYS = {
            cover: 'ui_widget_element_cover',
            infoBackground: 'ui_widget_element_info_background',
            title: 'ui_widget_element_title',
            author: 'ui_widget_element_author',
            requester: 'ui_widget_element_requester',
            srStatus: 'ui_widget_element_sr_status',
            meterBackground: 'ui_widget_element_meter_background',
            currentTime: 'ui_widget_element_current_time',
            waveform: 'ui_widget_element_waveform',
            duration: 'ui_widget_element_duration',
            progress: 'ui_widget_element_progress'
        };
        let widgetLayoutDraft = null;
        let widgetCustomizerSelectedKey = 'title';
        let widgetCustomizerSelectionActive = true;
        let widgetCustomizerInteraction = null;
        let widgetCustomizerEventsBound = false;
        let widgetCustomizerResizeObserver = null;
        let widgetCustomizerPreviewHeartbeat = null;
        let widgetCustomizerDemoActive = false;
        let widgetLayoutHistory = [];
        let widgetLayoutPresets = loadWidgetLayoutPresets();
        let widgetCustomizerSnapEnabled = localStorage.getItem(WIDGET_EDITOR_SNAP_STORAGE_KEY) !== 'false';
        let widgetCustomizerPreviewMode = localStorage.getItem(WIDGET_EDITOR_PREVIEW_MODE_STORAGE_KEY) || 'default';
        let widgetCustomizerPreviewSize = loadWidgetCustomizerPreviewSize(widgetCustomizerPreviewMode);
        let widgetCustomizerUsesOriginalLayout = false;
        let widgetCustomizerDraftDirty = false;
        let widgetLayerDragSourceIndex = null;
        let importStatusState = 'unknown';
        let importStatusMissingItems = [];
        let importStatusVersion = '';
        let lastImportStatusToastKey = '';
        let importDiagnosticsWaiters = [];
        let streamerBotRequestWaiters = new Map();
        let importStatusCheckTimeout = null;
        let lastDiagnosticsResults = [];
        try {
            if ('BroadcastChannel' in window) nowPlayingWidgetChannel = new BroadcastChannel(NOW_PLAYING_WIDGET_CHANNEL);
        } catch (error) {
            nowPlayingWidgetChannel = null;
        }
        // =========================================================================
        
        let player, ws, wsReconnectTimeout;
        let masterList = [];   
        let playQueue = [];     
        let playHistory = [];   
        let currentSongInfo = null; 
        let activeChatReplyTarget = null;
        let currentSongStopped = false;
        let nowPlayingWaveEffect = '';
        let nowPlayingWaveEffectUntil = 0;
        let nowPlayingWaveEffectId = 0;
        let nowPlayingWaveHoldUntilStart = false;
        let skipTransitionTimeout = null;
        let stopTransitionTimeout = null;
        let titleCache = {};    
        let favoriteSongs = loadFavoriteSongs();
        hydrateFavoriteTitleCache();
        let viewerSongHistory = loadViewerSongHistory();
        hydrateViewerHistoryTitleCache();
        let dragSourceIndex = null;
        let favoriteDragSourceIndex = null;
        let playlistDragSourceIndex = null;
        let isSrEnabled = SHOULD_REMEMBER_SR_STATE && localStorage.getItem(SR_ENABLED_STORAGE_KEY) === 'true'; 
        let basePlaybackMode = 'ordered';
        let baseActionButtonMode = API_KEY ? 'downloading' : 'api-required';

        function bindStaticUiEvents() {
            const actionHandlers = {
                openPlaylistManager, startSystem, startSystemShuffle, openSettings, prevSong, togglePlay,
                stopSongUI, skipSong, addManualUrl, openBanList, toggleDebug,
                openChangelog, openTutorial, openSettingsFromTutorial, closeSettings, switchSettingsTab,
                saveWsConfig, toggleApiVisibility, saveApiKey, closeChangelog,
                clearAllBans, closeBanList, closePlaylistManager, addBasePlaylist,
                closeTutorial, copySbCode, copyWidgetUrl, clearQueueWithConfirm,
                runDiagnostics, checkImportStatus, exportSettings, chooseSettingsImport,
                sendWidgetTest, openViewerHistory, closeViewerHistory, clearViewerHistoryWithConfirm,
                openWidgetCustomizer, closeWidgetCustomizer, saveWidgetLayout, resetWidgetLayoutWithConfirm,
                undoWidgetLayout, saveSpotifyConfig, connectSpotify, disconnectSpotify, toggleAppTheme
            };

            const changeHandlers = { toggleSR, handleSrRememberStateToggle, handleQueuePersistenceToggle, saveSongRequestSettings, handleWidgetAudioToggle, handleSpotifyEnabledToggle, importSettingsFile, renderViewerHistory };
            const inputHandlers = { renderBaseList, updateTutLink, saveSongRequestSettings, updateWidgetUrlDisplay, renderViewerHistory, setSpotifyGuiVolume };

            document.querySelectorAll('[data-action]').forEach(el => {
                el.addEventListener('click', () => {
                    const handler = actionHandlers[el.dataset.action];
                    if (!handler) return;
                    if (el.dataset.actionValue !== undefined) handler(el.dataset.actionValue);
                    else handler();
                });
            });

            document.querySelectorAll('[data-change-action]').forEach(el => {
                el.addEventListener('change', () => {
                    if (el.dataset.changeAction === 'changeLanguage') changeLanguage(el.value);
                    else if (changeHandlers[el.dataset.changeAction]) changeHandlers[el.dataset.changeAction]();
                });
            });

            document.querySelectorAll('[data-input-action]').forEach(el => {
                el.addEventListener('input', () => {
                    const handler = inputHandlers[el.dataset.inputAction];
                    if (handler) handler();
                });
            });
        }

        function bindSongCardButtonEvents() {
            document.addEventListener('click', event => {
                const favoriteButton = event.target.closest('[data-favorite-action]');
                if (favoriteButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    const action = favoriteButton.dataset.favoriteAction;
                    if (action === 'base') toggleFavoriteFromBase(favoriteButton.dataset.songKey || '');
                    else if (action === 'queue') toggleFavoriteFromQueue(parseInt(favoriteButton.dataset.songIndex || '-1', 10));
                    else if (action === 'current') toggleFavoriteFromCurrentSong();
                    else if (action === 'history') toggleFavoriteFromHistory(favoriteButton.dataset.songKey || '');
                    return;
                }

                const addButton = event.target.closest('[data-add-song-action]');
                if (addButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    const action = addButton.dataset.addSongAction;
                    if (action === 'base') addBaseSongToQueue(addButton.dataset.songKey || '');
                    else if (action === 'history') addHistorySongToQueue(addButton.dataset.songKey || '');
                }
            });
        }

        function initializeSongRequestToggleState() {
            const srToggle = document.getElementById('sr-toggle-cb');
            const rememberToggle = document.getElementById('sr-remember-state-cb');
            if (rememberToggle) rememberToggle.checked = SHOULD_REMEMBER_SR_STATE;
            if (srToggle) srToggle.checked = isSrEnabled;
            toggleSR(true);
        }

        applyAppTheme(appTheme);
        bindStaticUiEvents();
        bindSongCardButtonEvents();
        bindWidgetCustomizerEvents();
        setupNowPlayingTitleAutoFit();
        const wsHostInput = document.getElementById('ws-host-input');
        const wsPortInput = document.getElementById('ws-port-input');
        const wsPassInput = document.getElementById('ws-pass-input');
        const tutWsPortInput = document.getElementById('tut-ws-port');
        const queuePersistInput = document.getElementById('queue-persist-cb');
        const srMaxDurationInput = document.getElementById('sr-max-duration-input');
        const srVoteSkipInput = document.getElementById('sr-voteskip-input');
        const srUserLimitInput = document.getElementById('sr-user-limit-input');
        const srGlobalLimitInput = document.getElementById('sr-global-limit-input');
        const srUserLimitEnabledInput = document.getElementById('sr-user-limit-enabled-cb');
        const srGlobalLimitEnabledInput = document.getElementById('sr-global-limit-enabled-cb');
        const srMusicCategoryInput = document.getElementById('sr-music-category-cb');
        const widgetAudioInput = document.getElementById('widget-audio-cb');
        const spotifyEnabledInput = document.getElementById('spotify-enabled-cb');
        const spotifyClientIdInput = document.getElementById('spotify-client-id-input');
        const spotifyRedirectInput = document.getElementById('spotify-redirect-uri-output');

        if (wsHostInput) wsHostInput.value = WS_HOST;
        if (wsPortInput) wsPortInput.value = WS_PORT;
        if (wsPassInput) wsPassInput.value = WS_PASS;
        if (tutWsPortInput) tutWsPortInput.value = WS_PORT;
        if (queuePersistInput) queuePersistInput.checked = SHOULD_PERSIST_QUEUE;
        if (srMaxDurationInput) srMaxDurationInput.value = SR_MAX_DURATION_MINUTES;
        if (srVoteSkipInput) srVoteSkipInput.value = SR_VOTESKIP_REQUIRED;
        if (srUserLimitInput) srUserLimitInput.value = SR_USER_QUEUE_LIMIT;
        if (srGlobalLimitInput) srGlobalLimitInput.value = SR_GLOBAL_QUEUE_LIMIT;
        if (srUserLimitEnabledInput) srUserLimitEnabledInput.checked = SR_USER_QUEUE_LIMIT_ENABLED;
        if (srGlobalLimitEnabledInput) srGlobalLimitEnabledInput.checked = SR_GLOBAL_QUEUE_LIMIT_ENABLED;
        if (srMusicCategoryInput) srMusicCategoryInput.checked = SR_REQUIRE_MUSIC_CATEGORY;
        if (widgetAudioInput) widgetAudioInput.checked = WIDGET_AUDIO_ENABLED_CONFIG;
        if (spotifyEnabledInput) spotifyEnabledInput.checked = SPOTIFY_ENABLED;
        if (spotifyClientIdInput) spotifyClientIdInput.value = SPOTIFY_CLIENT_ID;
        if (spotifyRedirectInput) spotifyRedirectInput.value = getSpotifyRedirectUri();
        initializeSongRequestToggleState();
        updateSongRequestLimitInputStates();

        applyHolidayVariant();
        window.addEventListener('focus', refreshHolidayVariant);
        window.addEventListener('pageshow', refreshHolidayVariant);
        setInterval(refreshHolidayVariant, 30000);
        setInterval(updateNowPlayingProgress, 500);
        setInterval(syncPlayerVolumePreference, 1000);
        
        window.onload = () => { 
            applyTranslations(); 
            handleSpotifyAuthCallback();
            if (canTryNativeSpotifyPlayback()) initSpotifyPlayer().catch(() => {});
            renderSpotifyStatus();
            checkGithubUpdates(); 
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', ensureWebsocketConnection, { once: true });
        } else {
            ensureWebsocketConnection();
        }

        // ===================== SETTINGS MODAL =====================
        function openSettings() { 
            document.getElementById('api-key-input').value = API_KEY;
            const spotifyClientIdInput = document.getElementById('spotify-client-id-input');
            const spotifyRedirectInput = document.getElementById('spotify-redirect-uri-output');
            if (spotifyClientIdInput) spotifyClientIdInput.value = SPOTIFY_CLIENT_ID;
            if (spotifyRedirectInput) spotifyRedirectInput.value = getSpotifyRedirectUri();
            renderSpotifyStatus();
            widgetUrlBaseline = getWidgetUrl();
            widgetUrlWarningEnabled = true;
            updateWidgetUrlDisplay();
            renderSettingsMessages();
            document.getElementById('settings-modal').style.display = 'flex'; 
        }

        function openSettingsFromTutorial(targetId = '') {
            document.getElementById('tutorial-modal').style.display = 'none';
            switchSettingsTab('general');
            openSettings();
            requestAnimationFrame(() => {
                const target = targetId ? document.getElementById(targetId) : null;
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }

        function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }
        
        function switchSettingsTab(tabName) {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`tab-btn-${tabName}`).classList.add('active');
            document.getElementById(`tab-content-${tabName}`).classList.add('active');
        }

        function cloneWidgetLayoutForEditor(config) {
            const source = normalizeWidgetLayoutConfig(config);
            return source ? normalizeWidgetLayoutConfig(JSON.parse(JSON.stringify(source))) : null;
        }

        function getWidgetLayoutElementLabel(key) {
            return t(WIDGET_LAYOUT_ELEMENT_LABEL_KEYS[key] || key);
        }

        function cloneWidgetLayoutSnapshot(config = widgetLayoutDraft) {
            return {
                layout: config ? normalizeWidgetLayoutConfig(JSON.parse(JSON.stringify(config))) : null,
                usesOriginalLayout: widgetCustomizerUsesOriginalLayout,
                isDirty: widgetCustomizerDraftDirty
            };
        }

        function updateWidgetUndoButton() {
            const button = document.getElementById('widget-customizer-undo');
            if (button) button.disabled = widgetLayoutHistory.length === 0;
        }

        function pushWidgetLayoutHistory() {
            if (!widgetLayoutDraft) return;
            const snapshot = cloneWidgetLayoutSnapshot();
            const payload = JSON.stringify(snapshot);
            if (widgetLayoutHistory.length && JSON.stringify(widgetLayoutHistory[widgetLayoutHistory.length - 1]) === payload) return;
            widgetLayoutHistory.push(snapshot);
            if (widgetLayoutHistory.length > 60) widgetLayoutHistory.shift();
            updateWidgetUndoButton();
        }

        function undoWidgetLayout() {
            if (!widgetLayoutHistory.length) return;
            const snapshot = widgetLayoutHistory.pop();
            widgetLayoutDraft = snapshot.layout;
            widgetCustomizerUsesOriginalLayout = snapshot.usesOriginalLayout;
            widgetCustomizerDraftDirty = snapshot.isDirty;
            renderWidgetCustomizerPreview();
            renderWidgetCustomizerElementList();
            renderWidgetCustomizerControls();
            updateWidgetUndoButton();
        }

        function markWidgetCustomizerLayoutChanged() {
            widgetCustomizerUsesOriginalLayout = false;
            widgetCustomizerDraftDirty = true;
        }

        function normalizeWidgetLayoutPreset(preset) {
            if (!preset || typeof preset !== 'object') return null;
            const layout = normalizeWidgetLayoutConfig(preset.layout);
            if (!layout) return null;
            const id = String(preset.id || '').trim() || ('preset-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7));
            const name = String(preset.name || '').trim().slice(0, 60) || 'Preset';
            return {
                id,
                name,
                favorite: preset.favorite === true,
                createdAt: Number(preset.createdAt) || Date.now(),
                updatedAt: Number(preset.updatedAt) || Date.now(),
                layout
            };
        }

        function loadWidgetLayoutPresets() {
            try {
                const parsed = JSON.parse(localStorage.getItem(WIDGET_LAYOUT_PRESETS_STORAGE_KEY) || '[]');
                if (!Array.isArray(parsed)) return [];
                return parsed.map(normalizeWidgetLayoutPreset).filter(Boolean).slice(0, 80);
            } catch (error) {
                return [];
            }
        }

        function saveWidgetLayoutPresets() {
            try {
                if (widgetLayoutPresets.length) localStorage.setItem(WIDGET_LAYOUT_PRESETS_STORAGE_KEY, JSON.stringify(widgetLayoutPresets));
                else localStorage.removeItem(WIDGET_LAYOUT_PRESETS_STORAGE_KEY);
            } catch (error) {}
        }

        function getNextWidgetPresetName() {
            let index = 1;
            const names = new Set(widgetLayoutPresets.map(preset => String(preset.name || '').trim().toLowerCase()));
            while (names.has(('preset ' + index).toLowerCase())) index += 1;
            return 'Preset ' + index;
        }

        function refreshWidgetPresetNameInput() {
            const input = document.getElementById('widget-preset-name-input');
            if (input && !input.value.trim()) input.value = getNextWidgetPresetName();
        }

        function renderWidgetLayoutPresets() {
            const list = document.getElementById('widget-preset-list');
            if (!list) return;
            refreshWidgetPresetNameInput();
            if (!widgetLayoutPresets.length) {
                list.innerHTML = '<div class="widget-preset-empty">' + escapeHtml(t('ui_widget_presets_empty')) + '</div>';
                return;
            }
            const sorted = widgetLayoutPresets
                .map((preset, index) => ({ preset, index }))
                .sort((a, b) => Number(b.preset.favorite) - Number(a.preset.favorite) || a.index - b.index);
            list.innerHTML = sorted.map(({ preset }) => {
                const name = escapeHtml(preset.name);
                const favoriteLabel = escapeHtml(t(preset.favorite ? 'ui_widget_preset_unfavorite' : 'ui_widget_preset_favorite'));
                const deleteLabel = escapeHtml(t('ui_widget_preset_delete'));
                return '<div class="widget-preset-item" data-widget-preset-id="' + escapeHtml(preset.id) + '">' +
                    '<button type="button" class="widget-preset-load" data-widget-preset-load="' + escapeHtml(preset.id) + '" title="' + name + '">' + name + '</button>' +
                    '<button type="button" class="btn-favorite widget-preset-favorite' + (preset.favorite ? ' is-active' : '') + '" data-widget-preset-favorite="' + escapeHtml(preset.id) + '" title="' + favoriteLabel + '" aria-label="' + favoriteLabel + '">&#9733;</button>' +
                    '<button type="button" class="widget-preset-delete" data-widget-preset-delete="' + escapeHtml(preset.id) + '" title="' + deleteLabel + '" aria-label="' + deleteLabel + '"><span class="widget-preset-delete-icon" aria-hidden="true"></span></button>' +
                '</div>';
            }).join('');
        }

        function addWidgetLayoutPreset() {
            if (!widgetLayoutDraft) {
                const card = getWidgetCustomizerPreviewCard();
                if (card) widgetLayoutDraft = measureWidgetLayoutFromCard(card);
                else measureWidgetCustomizerOriginalLayout();
            }
            const layout = normalizeWidgetLayoutConfig(widgetLayoutDraft);
            if (!layout) return;
            const input = document.getElementById('widget-preset-name-input');
            const name = String(input && input.value ? input.value : '').trim() || getNextWidgetPresetName();
            const preset = normalizeWidgetLayoutPreset({
                id: 'preset-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
                name,
                favorite: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                layout
            });
            if (!preset) return;
            widgetLayoutPresets.push(preset);
            saveWidgetLayoutPresets();
            if (input) input.value = getNextWidgetPresetName();
            renderWidgetLayoutPresets();
            showToast(t('ui_widget_preset_saved', { name: preset.name }), 'ok');
        }

        function loadWidgetLayoutPreset(id) {
            const preset = widgetLayoutPresets.find(item => item.id === id);
            if (!preset) return;
            pushWidgetLayoutHistory();
            widgetLayoutDraft = cloneWidgetLayoutForEditor(preset.layout);
            widgetCustomizerUsesOriginalLayout = false;
            widgetCustomizerDraftDirty = true;
            applyWidgetLayoutDraftToPreview({ elements: true });
            showToast(t('ui_widget_preset_loaded', { name: preset.name }), 'ok');
        }

        function toggleWidgetLayoutPresetFavorite(id) {
            const preset = widgetLayoutPresets.find(item => item.id === id);
            if (!preset) return;
            preset.favorite = !preset.favorite;
            preset.updatedAt = Date.now();
            saveWidgetLayoutPresets();
            renderWidgetLayoutPresets();
        }

        function deleteWidgetLayoutPreset(id) {
            const preset = widgetLayoutPresets.find(item => item.id === id);
            if (!preset) return;
            showConfirm(t('ui_widget_preset_delete_confirm', { name: preset.name }), () => {
                widgetLayoutPresets = widgetLayoutPresets.filter(item => item.id !== id);
                saveWidgetLayoutPresets();
                renderWidgetLayoutPresets();
                showToast(t('ui_widget_preset_deleted', { name: preset.name }), 'ok');
            }, { okText: t('ui_widget_preset_delete') });
        }

        function clampWidgetPreviewDimension(value, fallback) {
            return Math.round(clampWidgetLayoutNumber(value, 160, 3840, fallback));
        }

        function getWidgetCustomizerPreviewPreset(mode) {
            return WIDGET_EDITOR_PREVIEW_PRESETS[mode] || WIDGET_EDITOR_PREVIEW_PRESETS.default;
        }

        function loadWidgetCustomizerPreviewSize(mode = 'default') {
            const preset = getWidgetCustomizerPreviewPreset(mode);
            if (mode !== 'custom') return { ...preset };
            return {
                width: clampWidgetPreviewDimension(localStorage.getItem(WIDGET_EDITOR_PREVIEW_WIDTH_STORAGE_KEY), preset.width),
                height: clampWidgetPreviewDimension(localStorage.getItem(WIDGET_EDITOR_PREVIEW_HEIGHT_STORAGE_KEY), preset.height)
            };
        }

        function updateWidgetCustomizerPreviewInputs() {
            const widthInput = document.getElementById('widget-preview-width');
            const heightInput = document.getElementById('widget-preview-height');
            if (widthInput) widthInput.value = String(widgetCustomizerPreviewSize.width);
            if (heightInput) heightInput.value = String(widgetCustomizerPreviewSize.height);
            document.querySelectorAll('[data-widget-preview-ratio]').forEach(button => {
                button.classList.toggle('active', button.dataset.widgetPreviewRatio === widgetCustomizerPreviewMode);
            });
        }

        function applyWidgetCustomizerPreviewSize(options = {}) {
            const stage = document.getElementById('widget-customizer-stage');
            if (!stage) return;
            const fallback = getWidgetCustomizerPreviewPreset(widgetCustomizerPreviewMode);
            const width = clampWidgetPreviewDimension(widgetCustomizerPreviewSize.width, fallback.width);
            const height = clampWidgetPreviewDimension(widgetCustomizerPreviewSize.height, fallback.height);
            widgetCustomizerPreviewSize = { width, height };
            stage.style.setProperty('--widget-preview-width', String(width));
            stage.style.setProperty('--widget-preview-height', String(height));
            stage.style.setProperty('--widget-preview-width-px', width + 'px');
            stage.style.setProperty('--widget-preview-aspect', String(width / Math.max(1, height)));
            stage.classList.remove('ratio-default', 'ratio-wide', 'ratio-square', 'ratio-portrait');
            stage.classList.add('ratio-' + (widgetCustomizerPreviewMode === 'custom' ? 'wide' : widgetCustomizerPreviewMode));

            if (options.save !== false) {
                localStorage.setItem(WIDGET_EDITOR_PREVIEW_MODE_STORAGE_KEY, widgetCustomizerPreviewMode);
                localStorage.setItem(WIDGET_EDITOR_PREVIEW_WIDTH_STORAGE_KEY, String(width));
                localStorage.setItem(WIDGET_EDITOR_PREVIEW_HEIGHT_STORAGE_KEY, String(height));
            }

            updateWidgetCustomizerPreviewInputs();
            if (widgetLayoutDraft) renderWidgetCustomizerControls();

            if (options.sync === false) return;
            setTimeout(() => {
                postWidgetCustomizerPreviewState({ retry: true });
                if (widgetCustomizerUsesOriginalLayout) measureWidgetCustomizerOriginalLayout();
                else updateWidgetCustomizerSelectionOverlay();
            }, 120);
        }

        function buildWidgetCustomizerFrameUrl() {
            const url = new URL('now-playing-widget.html', window.location.href);
            url.searchParams.set('editor', '1');
            url.searchParams.set('lang', currentLang || 'en');
    url.searchParams.set('v', '20260731-uiR42');
            return url.toString();
        }

        function getWidgetCustomizerPreviewFrame() {
            return document.getElementById('widget-customizer-frame');
        }

        function getWidgetCustomizerPreviewCard() {
            const frame = getWidgetCustomizerPreviewFrame();
            try {
                return frame && frame.contentDocument ? frame.contentDocument.getElementById('widget-now-playing-card') : null;
            } catch (error) {
                return null;
            }
        }

        function getWidgetCustomizerDemoState() {
            return {
                type: 'NOW_PLAYING_STATE',
                hasSong: true,
                id: WIDGET_CUSTOMIZER_DEMO_SONG.id,
                source: SONG_SOURCE_YOUTUBE,
                sourceLabel: 'YouTube',
                link: 'https://youtu.be/' + WIDGET_CUSTOMIZER_DEMO_SONG.id,
                title: WIDGET_CUSTOMIZER_DEMO_SONG.title,
                author: WIDGET_CUSTOMIZER_DEMO_SONG.author,
                user: t('ui_widget_demo_requester'),
                thumbnail: 'https://i.ytimg.com/vi/' + WIDGET_CUSTOMIZER_DEMO_SONG.id + '/mqdefault.jpg',
                currentTime: 78,
                duration: WIDGET_CUSTOMIZER_DEMO_SONG.duration,
                progress: (78 / WIDGET_CUSTOMIZER_DEMO_SONG.duration) * 100,
                srEnabled: true,
                isPlaying: true,
                waveEnding: false,
                waveEffect: '',
                waveHold: false,
                isStopped: false,
                playerState: 1,
                updatedAt: Date.now(),
                widgetLayout: widgetCustomizerUsesOriginalLayout ? null : widgetLayoutDraft
            };
        }

        function postWidgetCustomizerPreviewState(options = {}) {
            const frame = getWidgetCustomizerPreviewFrame();
            if (!frame || !frame.contentWindow) return false;
            const state = getWidgetCustomizerDemoState();
            const deliver = () => {
                try {
                    const targetOrigin = window.location.protocol === 'file:' ? '*' : (window.location.origin || '*');
                    frame.contentWindow.postMessage({ type: 'WIDGET_EDITOR_STATE', state }, targetOrigin);
                    return true;
                } catch (error) {
                    return false;
                }
            };
            const delivered = deliver();
            if (options.retry) {
                setTimeout(deliver, 60);
                setTimeout(deliver, 180);
            }
            return delivered;
        }

        function stopWidgetCustomizerPreviewHeartbeat() {
            clearInterval(widgetCustomizerPreviewHeartbeat);
            widgetCustomizerPreviewHeartbeat = null;
        }

        function startWidgetCustomizerDemoMode() {
            widgetCustomizerDemoActive = true;
            publishNowPlayingWidgetState(getWidgetCustomizerDemoState(), true);
        }

        function stopWidgetCustomizerDemoMode() {
            if (!widgetCustomizerDemoActive) return;
            widgetCustomizerDemoActive = false;
            publishNowPlayingWidgetState(getNowPlayingWidgetState({ ignoreWidgetTestState: true }), true);
        }

        function startWidgetCustomizerPreviewHeartbeat() {
            stopWidgetCustomizerPreviewHeartbeat();
            postWidgetCustomizerPreviewState({ retry: true });
            widgetCustomizerPreviewHeartbeat = setInterval(() => {
                const modal = document.getElementById('widget-customizer-modal');
                if (!modal || modal.style.display !== 'flex') {
                    stopWidgetCustomizerPreviewHeartbeat();
                    return;
                }
                postWidgetCustomizerPreviewState();
                publishNowPlayingWidgetState(getActiveWidgetPublishState());
            }, 900);
        }

        function measureWidgetCustomizerOriginalLayout(options = {}) {
            if (!widgetCustomizerUsesOriginalLayout) return;
            const attempt = Number(options.attempt) || 0;
            const card = getWidgetCustomizerPreviewCard();
            if (!card || !card.getBoundingClientRect().width) {
                if (attempt < 12) {
                    setTimeout(() => measureWidgetCustomizerOriginalLayout({ attempt: attempt + 1 }), 80);
                }
                return;
            }
            widgetLayoutDraft = measureWidgetLayoutFromCard(card);
            renderWidgetCustomizerElementList();
            renderWidgetCustomizerControls();
            updateWidgetCustomizerSelectionOverlay();
        }

        function renderWidgetCustomizerPreview() {
            const preview = document.getElementById('widget-customizer-preview');
            if (!preview) return;
            preview.innerHTML = '<iframe id="widget-customizer-frame" class="widget-customizer-frame" title="OBS widget preview" src="' + escapeHtml(buildWidgetCustomizerFrameUrl()) + '"></iframe>';

            const frame = getWidgetCustomizerPreviewFrame();
            if (frame) {
                frame.addEventListener('load', () => {
                    postWidgetCustomizerPreviewState({ retry: true });
                    if (widgetCustomizerUsesOriginalLayout) measureWidgetCustomizerOriginalLayout();
                    else updateWidgetCustomizerSelectionOverlay();
                }, { once: true });
            }

            requestAnimationFrame(() => {
                postWidgetCustomizerPreviewState({ retry: true });
                startWidgetCustomizerPreviewHeartbeat();
                updateWidgetCustomizerSelectionOverlay();
            });
        }

        function renderWidgetCustomizerElementList() {
            const container = document.getElementById('widget-customizer-elements');
            if (!container) return;
            if (!widgetLayoutDraft) {
                container.innerHTML = '';
                return;
            }
            container.innerHTML = getWidgetLayoutOrder(widgetLayoutDraft).map((key, index) => {
                const layout = widgetLayoutDraft.elements[key];
                if (!layout) return '';
                const classes = [
                    'widget-element-button',
                    widgetCustomizerSelectionActive && key === widgetCustomizerSelectedKey ? 'is-selected' : '',
                    layout.visible ? '' : 'is-hidden-element'
                ].filter(Boolean).join(' ');
                const visibility = layout.visible ? '&#9673;' : '&#9675;';
                return '<div class="' + classes + '" draggable="true" data-widget-element-key="' + key + '" data-widget-layer-index="' + index + '">' +
                    '<span class="widget-layer-handle" aria-hidden="true">&#9776;</span>' +
                    '<span class="widget-element-label">' + escapeHtml(getWidgetLayoutElementLabel(key)) + '</span>' +
                    '<span class="widget-element-visibility" aria-hidden="true">' + visibility + '</span>' +
                '</div>';
            }).join('');
        }

        function formatWidgetControlValue(property, value) {
            if (property === 'rotation') return Math.round((normalizeWidgetRotation(value) + 360) % 360) + '\u00b0';
            if (property === 'opacity' || property === 'backgroundOpacity') return Math.round(value * 100) + '%';
            return Math.round(value * 10) / 10 + '%';
        }

        function formatWidgetRotationInputValue(value) {
            return String(Math.round((normalizeWidgetRotation(value) + 360) % 360));
        }

        function getWidgetCustomizerPreviewDimensions() {
            const fallback = WIDGET_EDITOR_PREVIEW_PRESETS.default;
            const size = widgetCustomizerPreviewSize || fallback;
            return {
                width: clampWidgetPreviewDimension(size.width, fallback.width),
                height: clampWidgetPreviewDimension(size.height, fallback.height)
            };
        }

        function getWidgetLayoutPixelAxis(property) {
            return property === 'y' || property === 'height' ? 'height' : 'width';
        }

        function widgetLayoutPercentToPx(property, percent) {
            const dimensions = getWidgetCustomizerPreviewDimensions();
            const axis = getWidgetLayoutPixelAxis(property);
            return Math.round((Number(percent) || 0) * dimensions[axis] / 100);
        }

        function widgetLayoutPxToPercent(property, pixels) {
            const dimensions = getWidgetCustomizerPreviewDimensions();
            const axis = getWidgetLayoutPixelAxis(property);
            return ((Number(pixels) || 0) / Math.max(1, dimensions[axis])) * 100;
        }

        function normalizeWidgetRotation(value) {
            return ((Number(value || 0) + 180) % 360 + 360) % 360 - 180;
        }

        function getWidgetPointerAngleDegrees(clientX, clientY, centerX, centerY) {
            return (Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI) + 90;
        }

        function getWidgetShortestAngleDelta(currentAngle, previousAngle) {
            return normalizeWidgetRotation(Number(currentAngle || 0) - Number(previousAngle || 0));
        }

        function setWidgetRotationKnobValue(rotation) {
            const knob = document.getElementById('widget-rotation-knob');
            if (knob) knob.style.setProperty('--widget-rotation-deg', normalizeWidgetRotation(rotation) + 'deg');
        }

        function renderWidgetCustomizerControls() {
            if (!widgetLayoutDraft) return;
            const layout = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
            if (!layout) return;

            const nameEl = document.getElementById('widget-selected-element-name');
            const visibleInput = document.getElementById('widget-element-visible');
            const objectColorAutoRow = document.getElementById('widget-object-color-auto-row');
            const objectColorRow = document.getElementById('widget-object-color-row');
            const objectColorAutoInput = document.getElementById('widget-object-color-auto');
            const objectColorInput = document.getElementById('widget-object-color-input');
            const textAlignRow = document.getElementById('widget-text-align-row');
            const textColorAutoRow = document.getElementById('widget-text-color-auto-row');
            const textColorRow = document.getElementById('widget-text-color-row');
            const textColorAutoInput = document.getElementById('widget-text-color-auto');
            const textColorInput = document.getElementById('widget-text-color-input');
            const rotationInput = document.getElementById('widget-control-rotation-input');
            if (nameEl) nameEl.innerText = getWidgetLayoutElementLabel(widgetCustomizerSelectedKey);
            if (visibleInput) visibleInput.checked = layout.visible;

            document.querySelectorAll('[data-widget-layout-property]').forEach(input => {
                const property = input.dataset.widgetLayoutProperty;
                let value = layout[property];
                const usePixels = input.dataset.widgetLayoutUnit === 'px';
                if (usePixels) {
                    if (property === 'x') {
                        input.min = String(widgetLayoutPercentToPx(property, getWidgetLayoutMinPosition(layout.width)));
                        input.max = String(widgetLayoutPercentToPx(property, getWidgetLayoutMaxPosition(layout.width)));
                    }
                    if (property === 'y') {
                        input.min = String(widgetLayoutPercentToPx(property, getWidgetLayoutMinPosition(layout.height)));
                        input.max = String(widgetLayoutPercentToPx(property, getWidgetLayoutMaxPosition(layout.height)));
                    }
                    if (property === 'width' || property === 'height') {
                        input.min = String(Math.max(1, widgetLayoutPercentToPx(property, getWidgetLayoutMinSize(widgetCustomizerSelectedKey))));
                        input.max = String(getWidgetCustomizerPreviewDimensions()[getWidgetLayoutPixelAxis(property)]);
                    }
                    value = widgetLayoutPercentToPx(property, value);
                } else if (property === 'rotation') {
                    value = formatWidgetRotationInputValue(value);
                } else if (property === 'opacity' || property === 'backgroundOpacity') {
                    value *= 100;
                }
                input.value = String(value);

                const output = document.getElementById('widget-control-' + property + '-value');
                if (output) output.innerText = formatWidgetControlValue(property, layout[property]);
            });
            if (rotationInput) rotationInput.value = formatWidgetRotationInputValue(layout.rotation);
            setWidgetRotationKnobValue(layout.rotation);

            const hasObjectColor = isWidgetLayoutObjectColorElement(widgetCustomizerSelectedKey);
            if (objectColorAutoRow) objectColorAutoRow.hidden = !hasObjectColor;
            if (objectColorRow) objectColorRow.hidden = !hasObjectColor;
            if (objectColorAutoInput) objectColorAutoInput.checked = layout.colorMode !== 'custom';
            if (objectColorInput) {
                objectColorInput.value = normalizeWidgetHexColor(layout.color, WIDGET_LAYOUT_DEFAULT_OBJECT_COLOR);
                objectColorInput.disabled = !hasObjectColor || layout.colorMode !== 'custom';
            }

            const hasTextControls = isWidgetLayoutTextElement(widgetCustomizerSelectedKey);
            if (textAlignRow) textAlignRow.hidden = !hasTextControls;
            if (textColorAutoRow) textColorAutoRow.hidden = !hasTextControls;
            if (textColorRow) textColorRow.hidden = !hasTextControls;
            if (textColorAutoInput) textColorAutoInput.checked = layout.textColorMode !== 'custom';
            if (textColorInput) {
                textColorInput.value = normalizeWidgetHexColor(layout.textColor, getWidgetTextDefault(widgetCustomizerSelectedKey).color);
                textColorInput.disabled = !hasTextControls || layout.textColorMode !== 'custom';
            }
            document.querySelectorAll('[data-widget-text-align]').forEach(button => {
                button.classList.toggle('active', hasTextControls && button.dataset.widgetTextAlign === layout.textAlign);
            });
        }

        function updateWidgetCustomizerSelectionOverlay() {
            const overlay = document.getElementById('widget-customizer-selection');
            updateWidgetCustomizerOutsideState();
            if (!overlay || !widgetLayoutDraft) return;
            const layout = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
            if (!widgetCustomizerSelectionActive || !layout || !layout.visible) {
                overlay.classList.add('is-hidden');
                overlay.classList.remove('is-outside');
                return;
            }

            overlay.classList.remove('is-hidden');
            overlay.classList.toggle('is-outside', isWidgetLayoutOutOfBounds(layout));
            overlay.style.left = layout.x + '%';
            overlay.style.top = layout.y + '%';
            overlay.style.width = layout.width + '%';
            overlay.style.height = layout.height + '%';
            overlay.style.transform = 'rotate(' + layout.rotation + 'deg)';
        }

        function clearWidgetCustomizerSelection() {
            widgetCustomizerSelectionActive = false;
            updateWidgetCustomizerSelectionOverlay();
            renderWidgetCustomizerElementList();
        }

        function updateWidgetCustomizerOutsideState() {
            const stage = document.getElementById('widget-customizer-stage');
            const hasOutsideElement = !!(widgetLayoutDraft && WIDGET_LAYOUT_ELEMENT_KEYS.some(key => {
                const layout = widgetLayoutDraft.elements[key];
                return layout && layout.visible && isWidgetLayoutOutOfBounds(layout);
            }));
            if (stage) stage.classList.toggle('has-widget-outside-elements', hasOutsideElement);
        }

        function shouldKeepWidgetCustomizerSelectionForTarget(target) {
            return !!(target && target.closest([
                '#widget-customizer-stage',
                '#widget-customizer-elements',
                '.widget-customizer-controls',
                '.widget-editor-options',
                '.widget-source-settings',
                '.widget-preset-panel',
                '.widget-preview-toolbar-actions',
                '.widget-customizer-footer',
                'button',
                'input',
                'select',
                'textarea',
                'label'
            ].join(',')));
        }

        function applyWidgetLayoutDraftToPreview(options = {}) {
            if (!widgetLayoutDraft) return;
            postWidgetCustomizerPreviewState({ retry: true });
            if (widgetCustomizerDemoActive) publishNowPlayingWidgetState(getActiveWidgetPublishState());
            updateWidgetCustomizerOutsideState();
            updateWidgetCustomizerSelectionOverlay();
            if (options.controls !== false) renderWidgetCustomizerControls();
            if (options.elements) renderWidgetCustomizerElementList();
        }

        function selectWidgetCustomizerElement(key) {
            if (!WIDGET_LAYOUT_ELEMENT_KEYS.includes(key) || !widgetLayoutDraft) return;
            widgetCustomizerSelectedKey = key;
            widgetCustomizerSelectionActive = true;
            renderWidgetCustomizerElementList();
            renderWidgetCustomizerControls();
            updateWidgetCustomizerSelectionOverlay();
        }

        function reorderWidgetCustomizerLayer(fromIndex, toIndex) {
            if (!widgetLayoutDraft) return;
            const order = getWidgetLayoutOrder(widgetLayoutDraft);
            if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex === toIndex) return;
            if (fromIndex < 0 || toIndex < 0 || fromIndex >= order.length || toIndex >= order.length) return;
            pushWidgetLayoutHistory();
            markWidgetCustomizerLayoutChanged();
            const [movedKey] = order.splice(fromIndex, 1);
            order.splice(toIndex, 0, movedKey);
            widgetLayoutDraft.order = normalizeWidgetLayoutOrder(order);
            widgetCustomizerSelectedKey = movedKey;
            widgetCustomizerSelectionActive = true;
            widgetLayoutDraft.updatedAt = Date.now();
            applyWidgetLayoutDraftToPreview({ elements: true });
        }

        function setWidgetCustomizerElementVisibility(visible) {
            if (!widgetLayoutDraft || !widgetLayoutDraft.elements[widgetCustomizerSelectedKey]) return;
            pushWidgetLayoutHistory();
            markWidgetCustomizerLayoutChanged();
            widgetLayoutDraft.elements[widgetCustomizerSelectedKey].visible = !!visible;
            widgetLayoutDraft.updatedAt = Date.now();
            applyWidgetLayoutDraftToPreview({ elements: true });
        }

        function updateWidgetCustomizerObjectColorMode(matchCover) {
            if (!widgetLayoutDraft || !isWidgetLayoutObjectColorElement(widgetCustomizerSelectedKey)) return;
            const layout = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
            pushWidgetLayoutHistory();
            markWidgetCustomizerLayoutChanged();
            layout.colorMode = matchCover ? 'cover' : 'custom';
            layout.color = normalizeWidgetHexColor(layout.color, WIDGET_LAYOUT_DEFAULT_OBJECT_COLOR);
            widgetLayoutDraft.updatedAt = Date.now();
            applyWidgetLayoutDraftToPreview();
        }

        function updateWidgetCustomizerObjectColor(value, input) {
            if (!widgetLayoutDraft || !isWidgetLayoutObjectColorElement(widgetCustomizerSelectedKey)) return;
            if (input && input.dataset.widgetHistoryActive !== 'true') {
                pushWidgetLayoutHistory();
                input.dataset.widgetHistoryActive = 'true';
            }
            const layout = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
            markWidgetCustomizerLayoutChanged();
            layout.colorMode = 'custom';
            layout.color = normalizeWidgetHexColor(value, WIDGET_LAYOUT_DEFAULT_OBJECT_COLOR);
            widgetLayoutDraft.updatedAt = Date.now();
            applyWidgetLayoutDraftToPreview();
        }

        function updateWidgetCustomizerTextColorMode(useDefault) {
            if (!widgetLayoutDraft || !isWidgetLayoutTextElement(widgetCustomizerSelectedKey)) return;
            const layout = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
            pushWidgetLayoutHistory();
            markWidgetCustomizerLayoutChanged();
            layout.textColorMode = useDefault ? 'auto' : 'custom';
            layout.textColor = normalizeWidgetHexColor(layout.textColor, getWidgetTextDefault(widgetCustomizerSelectedKey).color);
            widgetLayoutDraft.updatedAt = Date.now();
            applyWidgetLayoutDraftToPreview();
        }

        function updateWidgetCustomizerTextColor(value, input) {
            if (!widgetLayoutDraft || !isWidgetLayoutTextElement(widgetCustomizerSelectedKey)) return;
            if (input && input.dataset.widgetHistoryActive !== 'true') {
                pushWidgetLayoutHistory();
                input.dataset.widgetHistoryActive = 'true';
            }
            const layout = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
            markWidgetCustomizerLayoutChanged();
            layout.textColorMode = 'custom';
            layout.textColor = normalizeWidgetHexColor(value, getWidgetTextDefault(widgetCustomizerSelectedKey).color);
            widgetLayoutDraft.updatedAt = Date.now();
            applyWidgetLayoutDraftToPreview();
        }

        function updateWidgetCustomizerTextAlign(align) {
            if (!widgetLayoutDraft || !isWidgetLayoutTextElement(widgetCustomizerSelectedKey)) return;
            const layout = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
            const nextAlign = normalizeWidgetTextAlign(align, getWidgetTextDefault(widgetCustomizerSelectedKey).align);
            if (layout.textAlign === nextAlign) return;
            pushWidgetLayoutHistory();
            markWidgetCustomizerLayoutChanged();
            layout.textAlign = nextAlign;
            widgetLayoutDraft.updatedAt = Date.now();
            applyWidgetLayoutDraftToPreview();
        }

        function setWidgetCustomizerPreviewRatio(ratio) {
            widgetCustomizerPreviewMode = WIDGET_EDITOR_PREVIEW_PRESETS[ratio] ? ratio : 'default';
            widgetCustomizerPreviewSize = { ...getWidgetCustomizerPreviewPreset(widgetCustomizerPreviewMode) };
            applyWidgetCustomizerPreviewSize();
        }

        function setWidgetCustomizerCustomPreviewSize() {
            const widthInput = document.getElementById('widget-preview-width');
            const heightInput = document.getElementById('widget-preview-height');
            const fallback = widgetCustomizerPreviewSize || WIDGET_EDITOR_PREVIEW_PRESETS.default;
            widgetCustomizerPreviewMode = 'custom';
            widgetCustomizerPreviewSize = {
                width: clampWidgetPreviewDimension(widthInput && widthInput.value, fallback.width),
                height: clampWidgetPreviewDimension(heightInput && heightInput.value, fallback.height)
            };
            applyWidgetCustomizerPreviewSize();
        }

        function openWidgetCustomizer() {
            const modal = document.getElementById('widget-customizer-modal');
            if (!modal) return;
            WIDGET_LAYOUT_CONFIG = readWidgetLayoutConfig();
            widgetLayoutDraft = cloneWidgetLayoutForEditor(WIDGET_LAYOUT_CONFIG);
            widgetCustomizerSelectedKey = 'title';
            widgetCustomizerSelectionActive = false;
            widgetCustomizerInteraction = null;
            widgetLayoutHistory = [];
            widgetCustomizerUsesOriginalLayout = !WIDGET_LAYOUT_CONFIG;
            widgetCustomizerDraftDirty = false;
            updateWidgetUndoButton();
            widgetUrlBaseline = getWidgetUrl();
            widgetUrlWarningEnabled = true;
            updateWidgetUrlDisplay();
            const snapInput = document.getElementById('widget-snap-enabled');
            if (snapInput) snapInput.checked = widgetCustomizerSnapEnabled;
            widgetLayoutPresets = loadWidgetLayoutPresets();
            renderWidgetLayoutPresets();
            modal.style.display = 'flex';
            startWidgetCustomizerDemoMode();
            widgetCustomizerPreviewMode = localStorage.getItem(WIDGET_EDITOR_PREVIEW_MODE_STORAGE_KEY) || widgetCustomizerPreviewMode || 'default';
            widgetCustomizerPreviewSize = loadWidgetCustomizerPreviewSize(widgetCustomizerPreviewMode);
            applyWidgetCustomizerPreviewSize({ save: false, sync: false });
            renderWidgetCustomizerPreview();
            if (widgetLayoutDraft) {
                renderWidgetCustomizerElementList();
                renderWidgetCustomizerControls();
            } else {
                measureWidgetCustomizerOriginalLayout();
            }

            const stage = document.getElementById('widget-customizer-stage');
            if (widgetCustomizerResizeObserver) widgetCustomizerResizeObserver.disconnect();
            if (stage && 'ResizeObserver' in window) {
                widgetCustomizerResizeObserver = new ResizeObserver(() => {
                    postWidgetCustomizerPreviewState();
                    if (widgetCustomizerUsesOriginalLayout) measureWidgetCustomizerOriginalLayout();
                    updateWidgetCustomizerSelectionOverlay();
                });
                widgetCustomizerResizeObserver.observe(stage);
            }
        }

        function closeWidgetCustomizer() {
            const modal = document.getElementById('widget-customizer-modal');
            if (modal) modal.style.display = 'none';
            widgetCustomizerInteraction = null;
            hideWidgetSnapGuides();
            stopWidgetCustomizerPreviewHeartbeat();
            if (widgetCustomizerResizeObserver) widgetCustomizerResizeObserver.disconnect();
            stopWidgetCustomizerDemoMode();
        }

        function saveWidgetLayout() {
            if (widgetCustomizerUsesOriginalLayout && !widgetCustomizerDraftDirty) {
                WIDGET_LAYOUT_CONFIG = writeWidgetLayoutConfig(null);
                WIDGET_LAYOUT_REVISION = Number(localStorage.getItem(WIDGET_LAYOUT_REVISION_KEY)) || Date.now();
                publishNowPlayingWidgetState(getActiveWidgetPublishState(), true);
                showToast(t('ui_widget_layout_saved'), 'ok');
                return;
            }
            const normalized = normalizeWidgetLayoutConfig(widgetLayoutDraft);
            if (!normalized) return;
            normalized.updatedAt = Date.now();
            WIDGET_LAYOUT_CONFIG = writeWidgetLayoutConfig(normalized);
            WIDGET_LAYOUT_REVISION = Number(localStorage.getItem(WIDGET_LAYOUT_REVISION_KEY)) || Date.now();
            widgetCustomizerUsesOriginalLayout = false;
            widgetCustomizerDraftDirty = false;
            publishNowPlayingWidgetState(getActiveWidgetPublishState(), true);
            showToast(t('ui_widget_layout_saved'), 'ok');
        }

        function resetWidgetLayoutWithConfirm() {
            showConfirm(t('ui_widget_reset_layout_confirm'), () => {
                WIDGET_LAYOUT_CONFIG = writeWidgetLayoutConfig(null);
                WIDGET_LAYOUT_REVISION = Number(localStorage.getItem(WIDGET_LAYOUT_REVISION_KEY)) || Date.now();
                widgetLayoutDraft = null;
                widgetCustomizerUsesOriginalLayout = true;
                widgetCustomizerDraftDirty = false;
                widgetCustomizerSelectionActive = false;
                widgetLayoutHistory = [];
                updateWidgetUndoButton();
                renderWidgetCustomizerPreview();
                renderWidgetLayoutPresets();
                renderWidgetCustomizerElementList();
                renderWidgetCustomizerControls();
                measureWidgetCustomizerOriginalLayout();
                publishNowPlayingWidgetState(getActiveWidgetPublishState(), true);
                showToast(t('ui_widget_layout_reset'), 'ok');
            }, { okText: t('ui_widget_reset_layout') });
        }

        function hideWidgetSnapGuides() {
            document.querySelectorAll('.widget-snap-guide').forEach(guide => guide.classList.remove('is-visible'));
        }

        function showWidgetSnapGuide(axis, value) {
            const guide = document.querySelector('.widget-snap-guide-' + axis);
            if (!guide) return;
            guide.style[axis === 'x' ? 'left' : 'top'] = value + '%';
            guide.classList.add('is-visible');
        }

        function getWidgetSnapCandidates(axis, excludedKey) {
            const candidates = [0, 50, 100];
            if (!widgetLayoutDraft) return candidates;
            WIDGET_LAYOUT_ELEMENT_KEYS.forEach(key => {
                if (key === excludedKey) return;
                const element = widgetLayoutDraft.elements[key];
                if (!element || !element.visible) return;
                if (axis === 'x') candidates.push(element.x, element.x + element.width / 2, element.x + element.width);
                else candidates.push(element.y, element.y + element.height / 2, element.y + element.height);
            });
            return candidates;
        }

        function findWidgetSnap(points, candidates, threshold) {
            let best = null;
            points.forEach(point => {
                candidates.forEach(candidate => {
                    const delta = candidate - point;
                    if (Math.abs(delta) > threshold) return;
                    if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { delta, candidate };
                });
            });
            return best;
        }

        function applyWidgetMoveSnapping(layout, event, interaction) {
            hideWidgetSnapGuides();
            if (!widgetCustomizerSnapEnabled || event.altKey) return;
            const thresholdX = (8 / Math.max(1, interaction.rect.width)) * 100;
            const thresholdY = (8 / Math.max(1, interaction.rect.height)) * 100;
            const snapX = findWidgetSnap(
                [layout.x, layout.x + layout.width / 2, layout.x + layout.width],
                getWidgetSnapCandidates('x', widgetCustomizerSelectedKey),
                thresholdX
            );
            const snapY = findWidgetSnap(
                [layout.y, layout.y + layout.height / 2, layout.y + layout.height],
                getWidgetSnapCandidates('y', widgetCustomizerSelectedKey),
                thresholdY
            );
            if (snapX) {
                layout.x = clampWidgetLayoutNumber(layout.x + snapX.delta, getWidgetLayoutMinPosition(layout.width), getWidgetLayoutMaxPosition(layout.width), layout.x);
                showWidgetSnapGuide('x', snapX.candidate);
            }
            if (snapY) {
                layout.y = clampWidgetLayoutNumber(layout.y + snapY.delta, getWidgetLayoutMinPosition(layout.height), getWidgetLayoutMaxPosition(layout.height), layout.y);
                showWidgetSnapGuide('y', snapY.candidate);
            }
        }

        function applyWidgetResizeSnapping(layout, direction, event, interaction) {
            hideWidgetSnapGuides();
            if (!widgetCustomizerSnapEnabled || event.altKey) return;
            const minSize = getWidgetLayoutMinSize(widgetCustomizerSelectedKey);
            const thresholdX = (8 / Math.max(1, interaction.rect.width)) * 100;
            const thresholdY = (8 / Math.max(1, interaction.rect.height)) * 100;
            const xCandidates = getWidgetSnapCandidates('x', widgetCustomizerSelectedKey);
            const yCandidates = getWidgetSnapCandidates('y', widgetCustomizerSelectedKey);

            if (direction.includes('e')) {
                const snap = findWidgetSnap([layout.x + layout.width], xCandidates, thresholdX);
                if (snap) {
                    layout.width = Math.max(minSize, snap.candidate - layout.x);
                    showWidgetSnapGuide('x', snap.candidate);
                }
            } else if (direction.includes('w')) {
                const right = layout.x + layout.width;
                const snap = findWidgetSnap([layout.x], xCandidates, thresholdX);
                if (snap && right - snap.candidate >= minSize) {
                    const nextX = clampWidgetLayoutNumber(snap.candidate, getWidgetLayoutMinPosition(layout.width), getWidgetLayoutMaxPosition(layout.width), layout.x);
                    layout.x = nextX;
                    layout.width = right - nextX;
                    showWidgetSnapGuide('x', snap.candidate);
                }
            }

            if (direction.includes('s')) {
                const snap = findWidgetSnap([layout.y + layout.height], yCandidates, thresholdY);
                if (snap) {
                    layout.height = Math.max(minSize, snap.candidate - layout.y);
                    showWidgetSnapGuide('y', snap.candidate);
                }
            } else if (direction.includes('n')) {
                const bottom = layout.y + layout.height;
                const snap = findWidgetSnap([layout.y], yCandidates, thresholdY);
                if (snap && bottom - snap.candidate >= minSize) {
                    const nextY = clampWidgetLayoutNumber(snap.candidate, getWidgetLayoutMinPosition(layout.height), getWidgetLayoutMaxPosition(layout.height), layout.y);
                    layout.y = nextY;
                    layout.height = bottom - nextY;
                    showWidgetSnapGuide('y', snap.candidate);
                }
            }
        }

        function getWidgetCustomizerElementAtPoint(clientX, clientY) {
            const stage = document.getElementById('widget-customizer-stage');
            if (!stage || !widgetLayoutDraft) return '';
            const rect = stage.getBoundingClientRect();
            if (!rect.width || !rect.height) return '';
            const x = ((clientX - rect.left) / rect.width) * 100;
            const y = ((clientY - rect.top) / rect.height) * 100;
            return getWidgetLayoutHitTestOrder(widgetLayoutDraft).find(key => {
                const layout = widgetLayoutDraft.elements[key];
                if (!layout || !layout.visible) return false;
                return x >= layout.x && x <= layout.x + layout.width && y >= layout.y && y <= layout.y + layout.height;
            }) || '';
        }

        function beginWidgetRotationControl(event) {
            if (!widgetLayoutDraft) return;
            const layout = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
            const knob = event.target.closest('[data-widget-rotation-knob]');
            if (!layout || !knob) return;
            hideWidgetSnapGuides();
            const rect = knob.getBoundingClientRect();
            const pointerAngle = getWidgetPointerAngleDegrees(event.clientX, event.clientY, rect.left + rect.width / 2, rect.top + rect.height / 2);
            widgetCustomizerInteraction = {
                mode: 'control-rotate',
                startX: event.clientX,
                startY: event.clientY,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2,
                lastPointerAngle: pointerAngle,
                unwrappedRotation: Number(layout.rotation) || 0,
                layout: { ...layout },
                hasChanged: false
            };
            const card = getWidgetCustomizerPreviewCard();
            const activeElement = card && card.querySelector('[data-widget-element="' + widgetCustomizerSelectedKey + '"]');
            const overlay = document.getElementById('widget-customizer-selection');
            if (activeElement) activeElement.classList.add('is-layout-active');
            if (overlay) overlay.classList.add('is-interacting');
            knob.classList.add('is-rotating');
            event.preventDefault();
            event.stopPropagation();
        }

        function beginWidgetCustomizerInteraction(event, mode) {
            if (!widgetLayoutDraft) return;
            const layout = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
            const stage = document.getElementById('widget-customizer-stage');
            const overlay = document.getElementById('widget-customizer-selection');
            if (!layout || !layout.visible || !stage || !overlay) return;

            hideWidgetSnapGuides();
            const rect = stage.getBoundingClientRect();
            const centerX = rect.left + ((layout.x + layout.width / 2) / 100) * rect.width;
            const centerY = rect.top + ((layout.y + layout.height / 2) / 100) * rect.height;
            widgetCustomizerInteraction = {
                mode,
                rect,
                startX: event.clientX,
                startY: event.clientY,
                centerX,
                centerY,
                lastPointerAngle: getWidgetPointerAngleDegrees(event.clientX, event.clientY, centerX, centerY),
                unwrappedRotation: Number(layout.rotation) || 0,
                layout: { ...layout },
                hasChanged: false
            };

            const card = getWidgetCustomizerPreviewCard();
            const activeElement = card && card.querySelector('[data-widget-element="' + widgetCustomizerSelectedKey + '"]');
            if (activeElement) activeElement.classList.add('is-layout-active');
            overlay.classList.add('is-interacting');
            event.preventDefault();
        }

        function handleWidgetCustomizerPointerMove(event) {
            if (!widgetCustomizerInteraction || !widgetLayoutDraft) return;
            const interaction = widgetCustomizerInteraction;
            const next = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
            const start = interaction.layout;
            const minSize = getWidgetLayoutMinSize(widgetCustomizerSelectedKey);
            if (!interaction.hasChanged) {
                const pointerDistance = Math.hypot(
                    event.clientX - interaction.startX,
                    event.clientY - interaction.startY
                );
                if (pointerDistance < 2) return;
                interaction.hasChanged = true;
                pushWidgetLayoutHistory();
            }
            markWidgetCustomizerLayoutChanged();
            if (interaction.mode === 'control-rotate') {
                hideWidgetSnapGuides();
                const angle = getWidgetPointerAngleDegrees(event.clientX, event.clientY, interaction.centerX, interaction.centerY);
                const delta = getWidgetShortestAngleDelta(angle, interaction.lastPointerAngle);
                interaction.lastPointerAngle = angle;
                interaction.unwrappedRotation += delta;
                let rotation = normalizeWidgetRotation(interaction.unwrappedRotation);
                if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
                next.rotation = rotation;
                widgetLayoutDraft.updatedAt = Date.now();
                applyWidgetLayoutDraftToPreview();
                return;
            }
            const dx = ((event.clientX - interaction.startX) / Math.max(1, interaction.rect.width)) * 100;
            const dy = ((event.clientY - interaction.startY) / Math.max(1, interaction.rect.height)) * 100;

            if (interaction.mode === 'move') {
                next.x = clampWidgetLayoutNumber(start.x + dx, getWidgetLayoutMinPosition(start.width), getWidgetLayoutMaxPosition(start.width), start.x);
                next.y = clampWidgetLayoutNumber(start.y + dy, getWidgetLayoutMinPosition(start.height), getWidgetLayoutMaxPosition(start.height), start.y);
                applyWidgetMoveSnapping(next, event, interaction);
            } else if (interaction.mode.startsWith('resize-')) {
                const direction = interaction.mode.replace('resize-', '');
                if (direction === 'se') {
                    const scaleFromWidth = 1 + (dx / Math.max(1, start.width));
                    const scaleFromHeight = 1 + (dy / Math.max(1, start.height));
                    const dominantScale = Math.abs(scaleFromWidth - 1) >= Math.abs(scaleFromHeight - 1) ? scaleFromWidth : scaleFromHeight;
                    const minScale = Math.max(minSize / Math.max(1, start.width), minSize / Math.max(1, start.height));
                    const maxScale = Math.min((100 - start.x) / Math.max(1, start.width), (100 - start.y) / Math.max(1, start.height));
                    const scale = clampWidgetLayoutNumber(dominantScale, minScale, Math.max(minScale, maxScale), 1);
                    next.width = start.width * scale;
                    next.height = start.height * scale;
                    hideWidgetSnapGuides();
                } else {
                    if (direction.includes('e')) next.width = clampWidgetLayoutNumber(start.width + dx, minSize, Math.max(minSize, 100 - start.x + 3), start.width);
                    if (direction.includes('s')) next.height = clampWidgetLayoutNumber(start.height + dy, minSize, Math.max(minSize, 100 - start.y + 3), start.height);
                    if (direction.includes('w')) {
                        const right = start.x + start.width;
                        next.x = clampWidgetLayoutNumber(start.x + dx, getWidgetLayoutMinPosition(start.width), right - minSize, start.x);
                        next.width = right - next.x;
                    }
                    if (direction.includes('n')) {
                        const bottom = start.y + start.height;
                        next.y = clampWidgetLayoutNumber(start.y + dy, getWidgetLayoutMinPosition(start.height), bottom - minSize, start.y);
                        next.height = bottom - next.y;
                    }
                    applyWidgetResizeSnapping(next, direction, event, interaction);
                }
            } else if (interaction.mode === 'rotate') {
                hideWidgetSnapGuides();
                const angle = getWidgetPointerAngleDegrees(event.clientX, event.clientY, interaction.centerX, interaction.centerY);
                const delta = getWidgetShortestAngleDelta(angle, interaction.lastPointerAngle);
                interaction.lastPointerAngle = angle;
                interaction.unwrappedRotation += delta;
                let rotation = normalizeWidgetRotation(interaction.unwrappedRotation);
                if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
                next.rotation = rotation;
            }

            widgetLayoutDraft.updatedAt = Date.now();
            applyWidgetLayoutDraftToPreview();
        }

        function endWidgetCustomizerInteraction() {
            if (!widgetCustomizerInteraction) return;
            widgetCustomizerInteraction = null;
            hideWidgetSnapGuides();
            const overlay = document.getElementById('widget-customizer-selection');
            const card = getWidgetCustomizerPreviewCard();
            if (overlay) overlay.classList.remove('is-interacting');
            if (card) card.querySelectorAll('.is-layout-active').forEach(element => element.classList.remove('is-layout-active'));
            document.querySelectorAll('.widget-rotation-knob.is-rotating').forEach(knob => knob.classList.remove('is-rotating'));
            renderWidgetCustomizerControls();
        }

        function bindWidgetCustomizerEvents() {
            if (widgetCustomizerEventsBound) return;
            const modal = document.getElementById('widget-customizer-modal');
            const stage = document.getElementById('widget-customizer-stage');
            const workspace = document.querySelector('.widget-customizer-workspace');
            const overlay = document.getElementById('widget-customizer-selection');
            const elements = document.getElementById('widget-customizer-elements');
            const controls = document.querySelector('.widget-customizer-controls');
            const visibleInput = document.getElementById('widget-element-visible');
            const snapInput = document.getElementById('widget-snap-enabled');
            const deleteButton = overlay && overlay.querySelector('.widget-editor-delete');
            const previewWidthInput = document.getElementById('widget-preview-width');
            const previewHeightInput = document.getElementById('widget-preview-height');
            const presetAddButton = document.getElementById('widget-preset-add');
            const presetList = document.getElementById('widget-preset-list');
            const presetNameInput = document.getElementById('widget-preset-name-input');
            const objectColorAutoInput = document.getElementById('widget-object-color-auto');
            const objectColorInput = document.getElementById('widget-object-color-input');
            const textColorAutoInput = document.getElementById('widget-text-color-auto');
            const textColorInput = document.getElementById('widget-text-color-input');
            const textAlignRow = document.getElementById('widget-text-align-row');
            const rotationKnob = document.getElementById('widget-rotation-knob');
            if (!modal || !stage || !workspace || !overlay || !elements || !controls || !visibleInput || !snapInput || !deleteButton || !presetAddButton || !presetList || !presetNameInput) return;
            widgetCustomizerEventsBound = true;

            elements.addEventListener('click', event => {
                const button = event.target.closest('[data-widget-element-key]');
                if (button) selectWidgetCustomizerElement(button.dataset.widgetElementKey);
            });
            elements.addEventListener('dragstart', event => {
                const item = event.target.closest('[data-widget-element-key]');
                if (!item) return;
                widgetLayerDragSourceIndex = Number(item.dataset.widgetLayerIndex);
                item.classList.add('is-dragging');
                if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', item.dataset.widgetElementKey || '');
                }
            });
            elements.addEventListener('dragover', event => {
                const item = event.target.closest('[data-widget-element-key]');
                if (!item || widgetLayerDragSourceIndex === null) return;
                event.preventDefault();
                item.classList.add('drag-over');
                if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            });
            elements.addEventListener('dragleave', event => {
                const item = event.target.closest('[data-widget-element-key]');
                if (item) item.classList.remove('drag-over');
            });
            elements.addEventListener('drop', event => {
                const item = event.target.closest('[data-widget-element-key]');
                if (!item || widgetLayerDragSourceIndex === null) return;
                event.preventDefault();
                const targetIndex = Number(item.dataset.widgetLayerIndex);
                item.classList.remove('drag-over');
                reorderWidgetCustomizerLayer(widgetLayerDragSourceIndex, targetIndex);
                widgetLayerDragSourceIndex = null;
            });
            elements.addEventListener('dragend', () => {
                widgetLayerDragSourceIndex = null;
                elements.querySelectorAll('.is-dragging, .drag-over').forEach(item => item.classList.remove('is-dragging', 'drag-over'));
            });

            controls.addEventListener('input', event => {
                const input = event.target.closest('[data-widget-layout-property]');
                if (!input || !widgetLayoutDraft) return;
                const property = input.dataset.widgetLayoutProperty;
                const layout = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
                let value = Number(input.value);
                if (!Number.isFinite(value)) return;
                if (input.dataset.widgetHistoryActive !== 'true') {
                    pushWidgetLayoutHistory();
                    input.dataset.widgetHistoryActive = 'true';
                }
                markWidgetCustomizerLayoutChanged();
                if (input.dataset.widgetLayoutUnit === 'px') {
                    value = widgetLayoutPxToPercent(property, value);
                    if (property === 'x') value = clampWidgetLayoutNumber(value, getWidgetLayoutMinPosition(layout.width), getWidgetLayoutMaxPosition(layout.width), layout.x);
                    if (property === 'y') value = clampWidgetLayoutNumber(value, getWidgetLayoutMinPosition(layout.height), getWidgetLayoutMaxPosition(layout.height), layout.y);
                    if (property === 'width' || property === 'height') value = clampWidgetLayoutNumber(value, getWidgetLayoutMinSize(widgetCustomizerSelectedKey), 100, layout[property]);
                } else if (property === 'rotation') {
                    value = normalizeWidgetRotation(clampWidgetLayoutNumber(value, 0, 359, formatWidgetRotationInputValue(layout.rotation)));
                } else if (property === 'opacity' || property === 'backgroundOpacity') {
                    value = clampWidgetLayoutNumber(value / 100, 0, 1, layout[property]);
                }
                layout[property] = value;
                if (property === 'rotation') setWidgetRotationKnobValue(value);
                layout.x = clampWidgetLayoutNumber(layout.x, getWidgetLayoutMinPosition(layout.width), getWidgetLayoutMaxPosition(layout.width), 0);
                layout.y = clampWidgetLayoutNumber(layout.y, getWidgetLayoutMinPosition(layout.height), getWidgetLayoutMaxPosition(layout.height), 0);
                widgetLayoutDraft.updatedAt = Date.now();
                applyWidgetLayoutDraftToPreview();
            });

            controls.addEventListener('change', event => {
                const input = event.target.closest('[data-widget-layout-property]');
                if (!input) return;
                delete input.dataset.widgetHistoryActive;
                if (input.dataset.widgetLayoutProperty === 'rotation' && widgetLayoutDraft) {
                    const layout = widgetLayoutDraft.elements[widgetCustomizerSelectedKey];
                    if (layout) input.value = formatWidgetRotationInputValue(layout.rotation);
                }
            });

            visibleInput.addEventListener('change', () => setWidgetCustomizerElementVisibility(visibleInput.checked));
            if (objectColorAutoInput) objectColorAutoInput.addEventListener('change', () => updateWidgetCustomizerObjectColorMode(objectColorAutoInput.checked));
            if (objectColorInput) {
                objectColorInput.addEventListener('input', () => updateWidgetCustomizerObjectColor(objectColorInput.value, objectColorInput));
                objectColorInput.addEventListener('change', () => { delete objectColorInput.dataset.widgetHistoryActive; });
            }
            if (textColorAutoInput) textColorAutoInput.addEventListener('change', () => updateWidgetCustomizerTextColorMode(textColorAutoInput.checked));
            if (textColorInput) {
                textColorInput.addEventListener('input', () => updateWidgetCustomizerTextColor(textColorInput.value, textColorInput));
                textColorInput.addEventListener('change', () => { delete textColorInput.dataset.widgetHistoryActive; });
            }
            if (textAlignRow) {
                textAlignRow.addEventListener('click', event => {
                    const button = event.target.closest('[data-widget-text-align]');
                    if (button) updateWidgetCustomizerTextAlign(button.dataset.widgetTextAlign);
                });
            }
            if (rotationKnob) rotationKnob.addEventListener('pointerdown', beginWidgetRotationControl);
            snapInput.addEventListener('change', () => {
                widgetCustomizerSnapEnabled = snapInput.checked;
                localStorage.setItem(WIDGET_EDITOR_SNAP_STORAGE_KEY, widgetCustomizerSnapEnabled ? 'true' : 'false');
                hideWidgetSnapGuides();
            });
            if (previewWidthInput && previewHeightInput) {
                const updateCustomPreviewSize = () => setWidgetCustomizerCustomPreviewSize();
                previewWidthInput.addEventListener('input', updateCustomPreviewSize);
                previewHeightInput.addEventListener('input', updateCustomPreviewSize);
                previewWidthInput.addEventListener('change', updateCustomPreviewSize);
                previewHeightInput.addEventListener('change', updateCustomPreviewSize);
            }
            presetAddButton.addEventListener('click', addWidgetLayoutPreset);
            presetNameInput.addEventListener('keydown', event => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                addWidgetLayoutPreset();
            });
            presetList.addEventListener('click', event => {
                const deleteButton = event.target.closest('[data-widget-preset-delete]');
                if (deleteButton) {
                    deleteWidgetLayoutPreset(deleteButton.dataset.widgetPresetDelete);
                    return;
                }
                const favoriteButton = event.target.closest('[data-widget-preset-favorite]');
                if (favoriteButton) {
                    toggleWidgetLayoutPresetFavorite(favoriteButton.dataset.widgetPresetFavorite);
                    return;
                }
                const loadButton = event.target.closest('[data-widget-preset-load]');
                if (loadButton) loadWidgetLayoutPreset(loadButton.dataset.widgetPresetLoad);
            });

            modal.addEventListener('click', event => {
                const ratioButton = event.target.closest('[data-widget-preview-ratio]');
                if (ratioButton) setWidgetCustomizerPreviewRatio(ratioButton.dataset.widgetPreviewRatio);
            });

            workspace.addEventListener('pointerdown', event => {
                if (event.target.closest('#widget-customizer-stage')) return;
                if (event.target.closest('.widget-preset-panel, .widget-preview-toolbar-actions')) return;
                clearWidgetCustomizerSelection();
            });

            modal.addEventListener('pointerdown', event => {
                if (event.target === modal || !shouldKeepWidgetCustomizerSelectionForTarget(event.target)) {
                    clearWidgetCustomizerSelection();
                }
            });

            stage.addEventListener('pointerdown', event => {
                if (event.target.closest('#widget-customizer-selection')) return;
                const target = event.target.closest('[data-widget-element]');
                const key = getWidgetCustomizerElementAtPoint(event.clientX, event.clientY) || (target ? target.dataset.widgetElement : '');
                if (!key) {
                    clearWidgetCustomizerSelection();
                    return;
                }
                selectWidgetCustomizerElement(key);
                beginWidgetCustomizerInteraction(event, 'move');
            });

            overlay.addEventListener('pointerdown', event => {
                if (event.target.closest('.widget-editor-delete')) return;
                const resizeHandle = event.target.closest('[data-resize-direction]');
                const rotateHandle = event.target.closest('.widget-editor-rotate');
                if (!resizeHandle && !rotateHandle) {
                    const key = getWidgetCustomizerElementAtPoint(event.clientX, event.clientY);
                    if (key && key !== widgetCustomizerSelectedKey) selectWidgetCustomizerElement(key);
                }
                const mode = resizeHandle ? 'resize-' + resizeHandle.dataset.resizeDirection :
                    (rotateHandle ? 'rotate' : 'move');
                beginWidgetCustomizerInteraction(event, mode);
            });

            deleteButton.addEventListener('pointerdown', event => event.stopPropagation());
            deleteButton.addEventListener('click', () => setWidgetCustomizerElementVisibility(false));
            window.addEventListener('pointermove', handleWidgetCustomizerPointerMove);
            window.addEventListener('pointerup', endWidgetCustomizerInteraction);
            window.addEventListener('pointercancel', endWidgetCustomizerInteraction);
            window.addEventListener('keydown', event => {
                if (modal.style.display !== 'flex' || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.shiftKey) return;
                event.preventDefault();
                undoWidgetLayout();
            });
        }

        function showToast(message, type = 'normal', durationMs = 6500, options = {}) {
            const rootEl = document.getElementById('toast-root');
            if (!rootEl) return;
            const toast = document.createElement('div');
            const isError = type === 'error';
            toast.className = 'toast' + (isError ? ' is-error is-sticky' : (type === 'ok' ? ' is-ok' : (type === 'warn' ? ' is-warn' : '')));
            const messageEl = document.createElement('span');
            messageEl.className = 'toast-message';
            messageEl.textContent = message;
            toast.appendChild(messageEl);
            let actionsEl = null;
            const getActionsEl = () => {
                if (actionsEl) return actionsEl;
                actionsEl = document.createElement('div');
                actionsEl.className = 'toast-actions';
                toast.appendChild(actionsEl);
                return actionsEl;
            };
            if (typeof options.onAction === 'function') {
                const actionEl = document.createElement('button');
                actionEl.type = 'button';
                actionEl.className = 'toast-action toast-import-action';
                actionEl.textContent = options.actionIcon || '⚙️';
                actionEl.title = options.actionTitle || '';
                actionEl.setAttribute('aria-label', options.actionTitle || '');
                actionEl.addEventListener('click', event => {
                    event.stopPropagation();
                    toast.remove();
                    options.onAction();
                });
                getActionsEl().appendChild(actionEl);
            }
            if (isError) {
                const closeEl = document.createElement('button');
                closeEl.type = 'button';
                closeEl.className = 'toast-close';
                closeEl.textContent = t('ui_confirm_ok');
                closeEl.addEventListener('click', event => {
                    event.stopPropagation();
                    toast.remove();
                });
                toast.addEventListener('click', () => toast.remove());
                getActionsEl().appendChild(closeEl);
            }
            rootEl.appendChild(toast);
            if (isError) return;
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(8px)';
                setTimeout(() => toast.remove(), 180);
            }, Math.max(1200, durationMs));
        }

        function openStreamerBotImportHelp() {
            openTutorial();
            requestAnimationFrame(() => {
                const importSection = document.getElementById('streamerbot-import-help');
                if (importSection) importSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }

        function showImportRequiredToast(message) {
            showToast(message, 'error', 6500, {
                actionIcon: '⚙️',
                actionTitle: t('ui_tut_4_title'),
                onAction: openStreamerBotImportHelp
            });
        }

        function showConfirm(message, onConfirm, options = {}) {
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-title');
            const messageEl = document.getElementById('confirm-message');
            const okBtn = document.getElementById('confirm-ok-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');
            if (!modal || !messageEl || !okBtn || !cancelBtn) return;

            titleEl.innerText = options.title || t('ui_confirm_title');
            messageEl.innerText = message;
            okBtn.innerText = options.okText || t('ui_confirm_ok');
            cancelBtn.innerText = options.cancelText || t('ui_confirm_cancel');

            const cleanup = () => {
                modal.style.display = 'none';
                okBtn.onclick = null;
                cancelBtn.onclick = null;
            };

            okBtn.onclick = () => {
                cleanup();
                if (typeof onConfirm === 'function') onConfirm();
            };
            cancelBtn.onclick = cleanup;
            modal.style.display = 'flex';
        }

        function normalizeDiagnosticId(value) {
            return String(value || '').trim().toLowerCase();
        }

        function isComponentEnabled(component) {
            if (!component || typeof component !== 'object') return false;
            if (component.enabled === false || component.isEnabled === false || component.active === false) return false;
            if (component.disabled === true || component.isDisabled === true) return false;
            const textValue = String(component.enabled ?? component.isEnabled ?? component.active ?? '').toLowerCase();
            if (textValue === 'false' || textValue === 'disabled' || textValue === '0') return false;
            return true;
        }

        function componentName(component) {
            return component && (component.name || component.Name || component.title || component.id || component.Id || '');
        }

        function componentId(component) {
            return component && (component.id || component.Id || component.actionId || component.commandId || component.queueId || '');
        }

        function findComponent(list, required) {
            if (!Array.isArray(list)) return null;
            const requiredName = normalizeDiagnosticId(required.name);
            const requiredId = normalizeDiagnosticId(required.id);
            return list.find(item => {
                const itemName = normalizeDiagnosticId(componentName(item));
                const itemId = normalizeDiagnosticId(componentId(item));
                return (requiredId && itemId === requiredId) || (requiredName && itemName === requiredName);
            }) || null;
        }

        function collectArraysByKey(value, keys, found = [], visited = new Set()) {
            if (!value || typeof value !== 'object' || visited.has(value)) return found;
            visited.add(value);

            Object.keys(value).forEach(key => {
                const child = value[key];
                if (keys.includes(key.toLowerCase()) && Array.isArray(child)) found.push(child);
                else if (child && typeof child === 'object') collectArraysByKey(child, keys, found, visited);
            });

            return found;
        }

        function extractComponentList(response, keys) {
            if (!response || typeof response !== 'object') return null;
            const arrays = collectArraysByKey(response, keys.map(key => key.toLowerCase()));
            if (!arrays.length) return null;
            return arrays.find(array => array.length > 0) || arrays[0];
        }

        function getCommandAliases(command) {
            const raw = [
                command.command,
                command.commands,
                command.value,
                command.name
            ].filter(Boolean).join('\n');
            return raw
                .split(/[\r\n,]+/)
                .map(alias => normalizeDiagnosticId(alias))
                .filter(Boolean);
        }

        function getActionTriggerCommandIds(action) {
            const triggers = Array.isArray(action && action.triggers) ? action.triggers : [];
            return triggers.map(trigger => normalizeDiagnosticId(
                typeof trigger === 'string'
                    ? trigger
                    : (trigger.commandId || trigger.command || trigger.id || trigger.Id)
            )).filter(Boolean);
        }

        function summarizeImportProblems(items, limit = 6) {
            if (!Array.isArray(items) || items.length === 0) return '';
            const visible = items.slice(0, limit);
            const extra = items.length - visible.length;
            return visible.join(', ') + (extra > 0 ? ', ' + t('ui_import_problem_more', { count: extra }) : '');
        }

        function resolveStreamerBotRequest(raw) {
            if (!raw || !raw.id || !streamerBotRequestWaiters.has(raw.id)) return false;
            const waiter = streamerBotRequestWaiters.get(raw.id);
            streamerBotRequestWaiters.delete(raw.id);
            clearTimeout(waiter.timeoutId);
            waiter.resolve(raw);
            return true;
        }

        function requestStreamerBotApi(requestName, extra = {}, timeoutMs = 1800) {
            if (!canUseStreamerBotWebsocket()) return Promise.resolve(null);
            const id = requestName + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

            return new Promise(resolve => {
                const timeoutId = setTimeout(() => {
                    streamerBotRequestWaiters.delete(id);
                    resolve(null);
                }, timeoutMs);

                streamerBotRequestWaiters.set(id, { resolve, timeoutId });

                try {
                    ws.send(JSON.stringify({ request: requestName, id, ...extra }));
                } catch (error) {
                    clearTimeout(timeoutId);
                    streamerBotRequestWaiters.delete(id);
                    resolve(null);
                }
            });
        }

        async function inspectStreamerBotImportComponents() {
            if (!canUseStreamerBotWebsocket()) {
                return { issues: [], warnings: [t('ui_diag_ws_fail')], checked: { actions: false, commands: false } };
            }

            const [actionsResponse, commandsResponse] = await Promise.all([
                requestStreamerBotApi('GetActions'),
                requestStreamerBotApi('GetCommands')
            ]);

            const actions = extractComponentList(actionsResponse, ['actions']);
            const commands = extractComponentList(commandsResponse, ['commands']);
            const issues = [];
            const warnings = [];

            if (!actions) {
                warnings.push(t('ui_import_live_actions_unavailable'));
            } else {
                REQUIRED_IMPORT_COMPONENTS.actions.forEach(required => {
                    const action = findComponent(actions, required);
                    if (!action) {
                        issues.push(t('ui_import_problem_missing', { type: t('ui_import_component_action'), name: required.name }));
                        return;
                    }
                    if (!isComponentEnabled(action)) issues.push(t('ui_import_problem_disabled', { type: t('ui_import_component_action'), name: required.name }));
                });
            }

            if (!commands) {
                warnings.push(t('ui_import_live_commands_unavailable'));
            } else {
                REQUIRED_IMPORT_COMPONENTS.commands.forEach(required => {
                    const command = findComponent(commands, required);
                    if (!command) {
                        issues.push(t('ui_import_problem_missing', { type: t('ui_import_component_command'), name: required.name }));
                        return;
                    }
                    if (!isComponentEnabled(command)) issues.push(t('ui_import_problem_disabled', { type: t('ui_import_component_command'), name: required.name }));

                    const aliases = getCommandAliases(command);
                    required.aliases.forEach(alias => {
                        if (!aliases.includes(normalizeDiagnosticId(alias))) {
                            issues.push(t('ui_import_problem_command_alias', { command: required.name, alias }));
                        }
                    });

                    if (actions) {
                        const action = findComponent(actions, { name: required.action });
                        const triggerIds = getActionTriggerCommandIds(action);
                        const commandId = normalizeDiagnosticId(componentId(command));
                        if (action && triggerIds.length > 0 && commandId && !triggerIds.includes(commandId)) {
                            issues.push(t('ui_import_problem_command_link', { command: required.name, action: required.action }));
                        }
                    }
                });
            }

            return {
                issues,
                warnings,
                checked: {
                    actions: !!actions,
                    commands: !!commands
                }
            };
        }

        function getImportValidationResult(payload, componentInspection = null) {
            const version = String((payload && (payload.version || payload.importVersion)) || '').trim();
            const features = new Set(
                Array.isArray(payload && payload.features)
                    ? payload.features.map(feature => String(feature).trim()).filter(Boolean)
                    : []
            );

            const missing = [];
            if (version !== REQUIRED_STREAMERBOT_IMPORT_VERSION) {
                missing.push(t('ui_import_missing_version', {
                    version: REQUIRED_STREAMERBOT_IMPORT_VERSION,
                    current: version || '?'
                }));
            }

            REQUIRED_IMPORT_FEATURES.forEach(feature => {
                if (!features.has(feature.key)) missing.push(feature.label);
            });

            if (componentInspection && Array.isArray(componentInspection.issues)) {
                missing.push(...componentInspection.issues);
            }

            return {
                ok: missing.length === 0,
                version,
                missing,
                warnings: componentInspection && Array.isArray(componentInspection.warnings) ? componentInspection.warnings : [],
                componentInspection
            };
        }

        function renderImportStatusBanner() {
            const banner = document.getElementById('import-status-banner');
            if (!banner) return;

            let message = '';
            let toneClass = '';

            if (importStatusState === 'checking') {
                message = t('ui_import_status_checking');
                toneClass = 'is-warn';
            } else if (importStatusState === 'missing') {
                const missing = importStatusMissingItems.length ? summarizeImportProblems(importStatusMissingItems) : t('ui_import_required');
                message = t('ui_import_status_missing', { missing });
                toneClass = 'is-error';
            }

            banner.className = 'import-status-banner' + (toneClass ? ' ' + toneClass : '') + (message ? '' : ' is-hidden');
            banner.textContent = '';

            if (!message) {
                lastImportStatusToastKey = '';
                return;
            }

            const toastKey = `${importStatusState}|${message}`;
            if (toastKey !== lastImportStatusToastKey && importStatusState !== 'checking') {
                lastImportStatusToastKey = toastKey;
                if (importStatusState === 'missing') showImportRequiredToast(message);
                else showToast(message, toneClass === 'is-warn' ? 'warn' : 'normal');
            }
        }

        function setImportStatus(state, missingItems = [], version = '') {
            importStatusState = state;
            importStatusMissingItems = missingItems;
            importStatusVersion = version;
            renderImportStatusBanner();
        }

        function resolveImportDiagnosticsWaiters(payload) {
            const waiters = importDiagnosticsWaiters.splice(0);
            waiters.forEach(waiter => {
                clearTimeout(waiter.timeoutId);
                waiter.resolve(payload);
            });
        }

        function resolveStreamerBotRequestWaiters(payload) {
            streamerBotRequestWaiters.forEach(waiter => {
                clearTimeout(waiter.timeoutId);
                waiter.resolve(payload);
            });
            streamerBotRequestWaiters.clear();
        }

        function handleImportDiagnosticsPayload(payload) {
            const result = getImportValidationResult(payload);
            setImportStatus(result.ok ? 'ok' : 'missing', result.missing, result.version);
            resolveImportDiagnosticsWaiters(payload);
            return result;
        }

        function requestImportDiagnostics(timeoutMs = 2500) {
            if (!canUseStreamerBotWebsocket()) return Promise.resolve(null);

            return new Promise(resolve => {
                const waiter = {
                    resolve,
                    timeoutId: null
                };

                waiter.timeoutId = setTimeout(() => {
                    importDiagnosticsWaiters = importDiagnosticsWaiters.filter(item => item !== waiter);
                    resolve(null);
                }, timeoutMs);

                importDiagnosticsWaiters.push(waiter);

                try {
                    ws.send(JSON.stringify({
                        request: 'DoAction',
                        action: { name: STREAMERBOT_DIAGNOSTICS_ACTION },
                        args: { expectedVersion: REQUIRED_STREAMERBOT_IMPORT_VERSION },
                        id: 'ImportDiagnostics'
                    }));
                } catch (error) {
                    clearTimeout(waiter.timeoutId);
                    importDiagnosticsWaiters = importDiagnosticsWaiters.filter(item => item !== waiter);
                    resolve(null);
                }
            });
        }

        async function checkImportStatus(silent = false) {
            if (!canUseStreamerBotWebsocket()) {
                setImportStatus('unknown');
                if (!silent) showToast(t('ui_diag_ws_fail'), 'error');
                return { ok: false, version: '', missing: [t('ui_diag_ws')] };
            }

            setImportStatus('checking');
            const payload = await requestImportDiagnostics();
            if (!payload) {
                const missing = [
                    t('ui_import_missing_version', { version: REQUIRED_STREAMERBOT_IMPORT_VERSION, current: '?' }),
                    'YtmImportDiagnostics'
                ];
                setImportStatus('missing', missing);
                return { ok: false, version: '', missing };
            }

            const componentInspection = await inspectStreamerBotImportComponents();
            const result = getImportValidationResult(payload, componentInspection);
            setImportStatus(result.ok ? 'ok' : 'missing', result.missing, result.version);
            if (!silent && result.ok) showToast(t('ui_import_status_ok'), 'ok');
            return result;
        }

        function scheduleImportStatusCheck() {
            clearTimeout(importStatusCheckTimeout);
            importStatusCheckTimeout = setTimeout(() => {
                checkImportStatus(true);
            }, 900);
        }

        function renderDiagnosticsResults() {
            const container = document.getElementById('diagnostics-results');
            if (!container) return;

            if (!lastDiagnosticsResults.length) {
                container.innerHTML = `<div class="diagnostic-item diagnostic-muted">${escapeHtml(t('ui_diagnostics_waiting'))}</div>`;
                return;
            }

            container.innerHTML = lastDiagnosticsResults.map(item => {
                const statusClass = item.status === 'ok'
                    ? 'diagnostic-ok'
                    : (item.status === 'warn' ? 'diagnostic-warn' : (item.status === 'error' ? 'diagnostic-error' : 'diagnostic-muted'));
                return `<div class="diagnostic-item ${statusClass}"><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.message)}</div>`;
            }).join('');
        }

        function getRecentWidgetStateAgeSeconds() {
            try {
                const state = JSON.parse(localStorage.getItem(NOW_PLAYING_WIDGET_KEY) || '{}');
                if (!state || state.type !== 'NOW_PLAYING_STATE' || !state.updatedAt) return null;
                return Math.max(0, Math.round((Date.now() - Number(state.updatedAt)) / 1000));
            } catch (error) {
                return null;
            }
        }

        async function runDiagnostics() {
            lastDiagnosticsResults = [
                { title: t('ui_diag_ws'), status: canUseStreamerBotWebsocket() ? 'ok' : 'error', message: canUseStreamerBotWebsocket() ? t('ui_diag_ws_ok') : t('ui_diag_ws_fail') },
                { title: t('ui_diag_import'), status: 'warn', message: t('ui_diag_import_checking') }
            ];
            renderDiagnosticsResults();

            const importResult = await checkImportStatus(true);
            const hasImport = !!(importResult && importResult.ok);
            const componentInspection = importResult && importResult.componentInspection ? importResult.componentInspection : { issues: [], warnings: [] };
            const hasComponentIssues = componentInspection.issues && componentInspection.issues.length > 0;
            const hasComponentWarnings = componentInspection.warnings && componentInspection.warnings.length > 0;
            const hasWidgetStorage = getRecentWidgetStateAgeSeconds() !== null;
            const widgetBridgeReady = hasWidgetStorage || !!nowPlayingWidgetChannel;
            const widgetStateAge = getRecentWidgetStateAgeSeconds();

            lastDiagnosticsResults = [
                { title: t('ui_diag_ws'), status: canUseStreamerBotWebsocket() ? 'ok' : 'error', message: canUseStreamerBotWebsocket() ? t('ui_diag_ws_ok') : t('ui_diag_ws_fail') },
                { title: t('ui_diag_import'), status: hasImport ? 'ok' : 'error', message: hasImport ? t('ui_diag_import_ok', { version: importResult.version || REQUIRED_STREAMERBOT_IMPORT_VERSION }) : t('ui_diag_import_missing', { missing: summarizeImportProblems(importResult.missing || []) }) },
                { title: t('ui_diag_components'), status: hasComponentIssues ? 'error' : (hasComponentWarnings ? 'warn' : 'ok'), message: hasComponentIssues ? t('ui_diag_components_missing', { count: componentInspection.issues.length, details: summarizeImportProblems(componentInspection.issues, 8) }) : (hasComponentWarnings ? summarizeImportProblems(componentInspection.warnings, 4) : t('ui_diag_components_ok')) },
                { title: t('ui_diag_widget_bridge'), status: widgetBridgeReady ? 'ok' : 'error', message: widgetBridgeReady ? t('ui_diag_widget_bridge_ok') : t('ui_diag_widget_bridge_fail') },
                { title: t('ui_diag_settings_sync'), status: hasImport ? 'ok' : 'error', message: hasImport ? t('ui_diag_settings_sync_ok') : t('ui_diag_settings_sync_fail') },
                { title: t('ui_diag_widget_state'), status: widgetStateAge !== null && widgetStateAge <= 10 ? 'ok' : 'warn', message: widgetStateAge !== null && widgetStateAge <= 10 ? t('ui_diag_widget_state_ok', { seconds: widgetStateAge }) : t('ui_diag_widget_state_warn') },
                { title: t('ui_diag_api'), status: API_KEY ? 'ok' : 'warn', message: API_KEY ? t('ui_diag_api_ok') : t('ui_diag_api_warn') }
            ];
            renderDiagnosticsResults();
        }

        function getActiveWidgetPublishState() {
            if (widgetCustomizerDemoActive) {
                return getWidgetCustomizerDemoState();
            }
            if (widgetTestState) {
                if (Date.now() < widgetTestStateUntil) {
                    return { ...widgetTestState, srEnabled: isSrEnabled, updatedAt: Date.now() };
                }
                widgetTestState = null;
            }
            return getNowPlayingWidgetState();
        }

        function sendWidgetTest() {
            widgetTestState = {
                type: 'NOW_PLAYING_STATE',
                hasSong: true,
                id: 'dQw4w9WgXcQ',
                source: SONG_SOURCE_YOUTUBE,
                sourceLabel: 'YouTube',
                link: 'https://youtu.be/dQw4w9WgXcQ',
                title: t('ui_widget_test_title'),
                author: PROJECT_NAME,
                user: 'OBS',
                thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
                currentTime: 42,
                duration: 180,
                progress: 23,
                srEnabled: isSrEnabled,
                isPlaying: false,
                waveEnding: false,
                waveEffect: '',
                waveEffectId: 0,
                waveHold: false,
                isStopped: false,
                playerState: 2,
                updatedAt: Date.now()
            };
            widgetTestStateUntil = Date.now() + 8000;
            publishNowPlayingWidgetState(getActiveWidgetPublishState(), true);
            showToast(t('ui_widget_test_sent'), 'ok');

            setTimeout(() => {
                if (!widgetTestState || Date.now() < widgetTestStateUntil) return;
                widgetTestState = null;
                publishNowPlayingWidgetState(getNowPlayingWidgetState({ ignoreWidgetTestState: true }), true);
            }, 8300);
        }

        function getVarsDesc(key) {
            let text = i18n['en'][key];
            let vars = text.match(/\{[a-zA-Z0-9_]+\}/g) || [];
            return [...new Set(vars)].join(' ');
        }

        function normalizeChatSource(source, fallback = '') {
            const value = String(source || '').trim().toLowerCase();
            if (value === 'all' || value === '*') return 'all';
            if (value === 'youtube' || value === 'yt' || value.includes('youtube')) return 'youtube';
            if (value === 'kick' || value.includes('kick')) return 'kick';
            if (value === 'twitch' || value.includes('twitch')) return 'twitch';
            return fallback;
        }

        function normalizeChatTarget(target) {
            if (!target) return null;
            const chatSource = normalizeChatSource(target.chatSource || target.source || target.platform || target.eventSource, '');
            const youtubeBroadcastId = String(target.youtubeBroadcastId || target.broadcastId || target.youTubeBroadcastId || '').trim();
            if (!chatSource && !youtubeBroadcastId) return null;
            return {
                chatSource: chatSource || 'twitch',
                youtubeBroadcastId
            };
        }

        function getPayloadChatTarget(payload) {
            return normalizeChatTarget(payload);
        }

        function getSongChatTarget(song) {
            return normalizeChatTarget(song);
        }

        function attachChatTargetToSong(song, target = activeChatReplyTarget) {
            const chatTarget = normalizeChatTarget(song) || normalizeChatTarget(target);
            if (!chatTarget) return song;
            return {
                ...song,
                chatSource: chatTarget.chatSource,
                youtubeBroadcastId: chatTarget.youtubeBroadcastId || ''
            };
        }

        function getExplicitSongQueueOrigin(song) {
            const origin = String(song && song.queueOrigin || '').trim().toLowerCase();
            return origin === 'playlist' || origin === 'manual' ? origin : '';
        }

        function getSongQueueOrigin(song, fallback = 'playlist') {
            const explicitOrigin = getExplicitSongQueueOrigin(song);
            if (explicitOrigin) return explicitOrigin;
            const user = String(song && song.user || '').trim();
            if (user && user !== 'Auto' && user !== 'Favorite') return 'manual';
            return fallback === 'manual' ? 'manual' : 'playlist';
        }

        function normalizeSongForStorage(song) {
            if (!song || !song.id) return null;
            const chatTarget = normalizeChatTarget(song);
            const source = getSongSource(song);
            const identityId = getSongIdentityId(song);
            if (!identityId) return null;
            return {
                id: identityId,
                source,
                youtubeId: source === SONG_SOURCE_YOUTUBE ? identityId : (song.youtubeId || song.youtubeFallbackId || ''),
                spotifyId: source === SONG_SOURCE_SPOTIFY ? identityId : (song.spotifyId || ''),
                spotifyUri: source === SONG_SOURCE_SPOTIFY ? (song.spotifyUri || ('spotify:track:' + identityId)) : (song.spotifyUri || ''),
                spotifyUrl: source === SONG_SOURCE_SPOTIFY ? (song.spotifyUrl || ('https://open.spotify.com/track/' + identityId)) : (song.spotifyUrl || ''),
                youtubeFallbackId: song.youtubeFallbackId || '',
                thumbnail: song.thumbnail || '',
                title: song.title || 'Unknown Title',
                author: song.author || 'Unknown Author',
                user: song.user || 'Auto',
                duration: normalizePositiveInteger(song.duration, 210),
                queueOrigin: getSongQueueOrigin(song),
                fallbackFromSpotify: !!song.fallbackFromSpotify,
                chatSource: chatTarget ? chatTarget.chatSource : '',
                youtubeBroadcastId: chatTarget ? chatTarget.youtubeBroadcastId : ''
            };
        }

        function normalizeFavoriteSong(song) {
            const normalized = normalizeSongForStorage(song);
            if (!normalized) return null;
            return {
                id: normalized.id,
                source: normalized.source,
                youtubeId: normalized.youtubeId,
                spotifyId: normalized.spotifyId,
                spotifyUri: normalized.spotifyUri,
                spotifyUrl: normalized.spotifyUrl,
                youtubeFallbackId: normalized.youtubeFallbackId,
                thumbnail: normalized.thumbnail,
                title: normalized.title,
                author: normalized.author,
                duration: normalized.duration,
                queueOrigin: getExplicitSongQueueOrigin(song) || (song && song.user ? getSongQueueOrigin(song) : '')
            };
        }

        function loadFavoriteSongs() {
            try {
                const parsed = JSON.parse(localStorage.getItem(FAVORITE_SONGS_STORAGE_KEY) || '[]');
                if (!Array.isArray(parsed)) return [];
                const seen = new Set();
                return parsed.map(normalizeFavoriteSong).filter(song => {
                    const key = getSongKey(song);
                    if (!song || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            } catch (error) {
                return [];
            }
        }

        function hydrateFavoriteTitleCache() {
            favoriteSongs.forEach(song => {
                if (!song || !song.id) return;
                cacheSongInfo(song);
            });
        }

        function saveFavoriteSongs() {
            if (favoriteSongs.length > 0) localStorage.setItem(FAVORITE_SONGS_STORAGE_KEY, JSON.stringify(favoriteSongs));
            else localStorage.removeItem(FAVORITE_SONGS_STORAGE_KEY);
            hydrateFavoriteTitleCache();
            updateBaseCount();
            if (baseActionButtonMode === 'ready' || baseActionButtonMode === 'empty') {
                setBaseActionButtonMode(getBasePoolItems().length > 0 ? 'ready' : 'empty');
            }
        }

        function isFavoriteSong(id) {
            const key = getSongKey(id);
            return favoriteSongs.some(song => getSongKey(song) === key);
        }

        function getBaseSongInfo(id) {
            const key = getSongKey(id);
            const favorite = favoriteSongs.find(song => getSongKey(song) === key);
            if (favorite) return favorite;
            return titleCache[key] || titleCache[id] || null;
        }

        function getBasePoolItems() {
            const seen = new Set();
            const items = [];
            const playlistKeys = new Set(masterList.map(item => getSongKey(item)).filter(Boolean));

            favoriteSongs.forEach((song, index) => {
                const key = getSongKey(song);
                if (!song || !song.id || seen.has(key)) return;
                seen.add(key);
                const queueOrigin = playlistKeys.has(key) ? 'playlist' : getSongQueueOrigin(song, 'manual');
                items.push({ id: song.id, key, info: song, isFavorite: true, favoriteIndex: index, queueOrigin });
            });

            let regularIndex = 1;
            masterList.forEach(item => {
                const key = typeof item === 'string' ? getSongKey(item) : getSongKey(item);
                if (!key || seen.has(key)) return;
                const info = titleCache[key] || (typeof item === 'object' ? item : titleCache[item]);
                if (!info) return;
                seen.add(key);
                items.push({ id: info.id, key, info, isFavorite: false, originalIndex: regularIndex, queueOrigin: 'playlist' });
                regularIndex += 1;
            });

            return items;
        }

        function updateBaseCount() {
            const countEl = document.getElementById('base-count');
            if (countEl) countEl.innerText = '\u{1F3B5} ' + getBasePoolItems().length;
        }

        function renderFavoriteButton(songId, dataAttrs = '') {
            const active = isFavoriteSong(songId);
            const label = active ? t('ui_favorite_remove') : t('ui_favorite_add');
            return `<button type="button" class="btn-favorite ${active ? 'is-active' : ''}" draggable="false" ${dataAttrs} title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" aria-pressed="${active ? 'true' : 'false'}">&#9733;</button>`;
        }

        function toggleFavoriteSong(song) {
            const favorite = normalizeFavoriteSong(song);
            if (!favorite) return;
            const favoriteKey = getSongKey(favorite);
            const existingIndex = favoriteSongs.findIndex(item => getSongKey(item) === favoriteKey);
            const removing = existingIndex !== -1;

            if (removing) {
                favoriteSongs.splice(existingIndex, 1);
            } else {
                favoriteSongs.push(favorite);
            }

            saveFavoriteSongs();
            renderBaseList();
            renderQueue();
            renderViewerHistory();
            showToast(t(removing ? 'ui_favorite_removed' : 'ui_favorite_added', { title: favorite.title }), removing ? 'warn' : 'ok');
        }

        function toggleFavoriteFromBase(id) {
            const info = getBaseSongInfo(id);
            if (!info) return;
            const baseItem = getBasePoolItems().find(item => item.key === getSongKey(id));
            toggleFavoriteSong({ ...info, user: 'Favorite', queueOrigin: baseItem ? baseItem.queueOrigin : 'playlist' });
        }

        function toggleFavoriteFromQueue(index) {
            const song = playQueue[index];
            if (!song) return;
            toggleFavoriteSong(song);
        }

        function toggleFavoriteFromCurrentSong() {
            if (!currentSongInfo) return;
            toggleFavoriteSong(currentSongInfo);
        }

        function addBaseSongToQueue(id) {
            const info = getBaseSongInfo(id);
            if (!info) return;
            const baseItem = getBasePoolItems().find(item => item.key === getSongKey(id));
            addSongFromChat({ ...info, user: 'Streamer', queueOrigin: baseItem ? baseItem.queueOrigin : 'playlist' });
        }

        function normalizeViewerHistoryEntry(entry) {
            const normalized = normalizeSongForStorage(entry);
            if (!normalized) return null;

            const fallbackUser = normalized.user && normalized.user !== 'Auto' ? normalized.user : 'Viewer';
            const rawUsers = Array.isArray(entry.users) ? entry.users : [];
            const users = [];
            [entry.lastUser, entry.firstUser, entry.user, fallbackUser, ...rawUsers].forEach(user => {
                const cleanUser = String(user || '').trim();
                if (!cleanUser) return;
                const key = cleanUser.toLowerCase();
                if (users.some(existing => existing.toLowerCase() === key)) return;
                users.push(cleanUser);
            });

            const addedAt = Number.isNaN(Date.parse(entry.addedAt)) ? new Date().toISOString() : entry.addedAt;
            const lastRequestedAt = Number.isNaN(Date.parse(entry.lastRequestedAt)) ? addedAt : entry.lastRequestedAt;

            return {
                id: normalized.id,
                source: normalized.source,
                youtubeId: normalized.youtubeId,
                spotifyId: normalized.spotifyId,
                spotifyUri: normalized.spotifyUri,
                spotifyUrl: normalized.spotifyUrl,
                youtubeFallbackId: normalized.youtubeFallbackId,
                thumbnail: normalized.thumbnail,
                title: normalized.title,
                author: normalized.author,
                duration: normalized.duration,
                user: users[0] || fallbackUser,
                firstUser: entry.firstUser || users[0] || fallbackUser,
                lastUser: entry.lastUser || users[0] || fallbackUser,
                users: users.slice(0, 25),
                addedAt,
                lastRequestedAt,
                requestCount: normalizePositiveInteger(entry.requestCount, 1)
            };
        }

        function loadViewerSongHistory() {
            try {
                const parsed = JSON.parse(localStorage.getItem(VIEWER_HISTORY_STORAGE_KEY) || '[]');
                if (!Array.isArray(parsed)) return [];
                const seen = new Set();
                return parsed.map(normalizeViewerHistoryEntry).filter(entry => {
                    const key = getSongKey(entry);
                    if (!entry || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                }).slice(0, VIEWER_HISTORY_LIMIT);
            } catch (error) {
                return [];
            }
        }

        function hydrateViewerHistoryTitleCache() {
            viewerSongHistory.forEach(song => {
                if (!song || !song.id) return;
                cacheSongInfo(song);
            });
        }

        function saveViewerSongHistory() {
            if (!viewerSongHistory.length) {
                localStorage.removeItem(VIEWER_HISTORY_STORAGE_KEY);
                return;
            }

            try {
                localStorage.setItem(VIEWER_HISTORY_STORAGE_KEY, JSON.stringify(viewerSongHistory.slice(0, VIEWER_HISTORY_LIMIT)));
            } catch (error) {
                viewerSongHistory = viewerSongHistory.slice(0, Math.min(250, VIEWER_HISTORY_LIMIT));
                try {
                    localStorage.setItem(VIEWER_HISTORY_STORAGE_KEY, JSON.stringify(viewerSongHistory));
                } catch (innerError) {
                    localStorage.removeItem(VIEWER_HISTORY_STORAGE_KEY);
                    viewerSongHistory = [];
                }
                showToast(t('ui_history_storage_full'), 'warn');
            }
            hydrateViewerHistoryTitleCache();
        }

        function recordViewerSongHistory(song) {
            if (!isViewerRequestSong(song)) return;
            const normalized = normalizeSongForStorage(song);
            if (!normalized) return;

            const now = new Date().toISOString();
            const requestUser = String(song.user || 'Viewer').trim() || 'Viewer';
            const normalizedKey = getSongKey(normalized);
            const existingIndex = viewerSongHistory.findIndex(entry => getSongKey(entry) === normalizedKey);

            if (existingIndex !== -1) {
                const existing = viewerSongHistory.splice(existingIndex, 1)[0];
                const users = [requestUser, ...(existing.users || [])].filter(Boolean);
                const uniqueUsers = [];
                users.forEach(user => {
                    const key = String(user).toLowerCase();
                    if (uniqueUsers.some(existingUser => existingUser.toLowerCase() === key)) return;
                    uniqueUsers.push(String(user));
                });

                viewerSongHistory.unshift({
                    ...existing,
                    title: normalized.title,
                    author: normalized.author,
                    duration: normalized.duration,
                    user: requestUser,
                    lastUser: requestUser,
                    users: uniqueUsers.slice(0, 25),
                    lastRequestedAt: now,
                    requestCount: normalizePositiveInteger(existing.requestCount, 1) + 1
                });
            } else {
                viewerSongHistory.unshift({
                    ...normalized,
                    user: requestUser,
                    firstUser: requestUser,
                    lastUser: requestUser,
                    users: [requestUser],
                    addedAt: now,
                    lastRequestedAt: now,
                    requestCount: 1
                });
            }

            viewerSongHistory = viewerSongHistory.slice(0, VIEWER_HISTORY_LIMIT);
            saveViewerSongHistory();
            renderViewerHistory();
        }

        function openViewerHistory() {
            const modal = document.getElementById('viewer-history-modal');
            if (!modal) return;
            renderViewerHistory();
            modal.style.display = 'flex';
        }

        function closeViewerHistory() {
            const modal = document.getElementById('viewer-history-modal');
            if (modal) modal.style.display = 'none';
        }

        function getViewerHistoryFilters() {
            return {
                search: (document.getElementById('viewer-history-search')?.value || '').trim().toLowerCase(),
                user: (document.getElementById('viewer-history-user')?.value || '').trim().toLowerCase(),
                dateFrom: document.getElementById('viewer-history-date-from')?.value || '',
                dateTo: document.getElementById('viewer-history-date-to')?.value || ''
            };
        }

        function isViewerHistoryEntryInDateRange(entry, filters) {
            const entryDate = new Date(entry.lastRequestedAt || entry.addedAt);
            if (Number.isNaN(entryDate.getTime())) return true;
            if (filters.dateFrom) {
                const from = new Date(filters.dateFrom + 'T00:00:00');
                if (!Number.isNaN(from.getTime()) && entryDate < from) return false;
            }
            if (filters.dateTo) {
                const to = new Date(filters.dateTo + 'T23:59:59');
                if (!Number.isNaN(to.getTime()) && entryDate > to) return false;
            }
            return true;
        }

        function getFilteredViewerHistory() {
            const filters = getViewerHistoryFilters();
            return viewerSongHistory.filter(entry => {
                const usersText = [entry.user, entry.firstUser, entry.lastUser, ...(entry.users || [])].filter(Boolean).join(' ');
                const searchText = [entry.title, entry.author, usersText].join(' ').toLowerCase();
                const userText = usersText.toLowerCase();
                if (filters.search && !searchText.includes(filters.search)) return false;
                if (filters.user && !userText.includes(filters.user)) return false;
                return isViewerHistoryEntryInDateRange(entry, filters);
            });
        }

        function formatViewerHistoryDate(value) {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '-';
            return date.toLocaleString(currentLang, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        }

        function renderViewerHistory() {
            const container = document.getElementById('viewer-history-list');
            if (!container) return;

            const filteredHistory = getFilteredViewerHistory();
            const countEl = document.getElementById('viewer-history-count');
            const limitNoteEl = document.getElementById('viewer-history-limit-note');
            if (countEl) countEl.innerText = filteredHistory.length + ' / ' + viewerSongHistory.length;
            if (limitNoteEl) limitNoteEl.innerText = t('ui_history_limit_note', { limit: VIEWER_HISTORY_LIMIT });

            if (viewerSongHistory.length === 0) {
                container.innerHTML = `<div class="history-empty">${t('ui_history_empty')}</div>`;
                return;
            }

            if (filteredHistory.length === 0) {
                container.innerHTML = `<div class="history-empty">${t('ui_history_no_results')}</div>`;
                return;
            }

            container.innerHTML = filteredHistory.map((entry, index) => {
                const userLabel = escapeHtml(entry.lastUser || entry.user || 'Viewer');
                const author = escapeHtml(entry.author || 'YouTube');
                const title = escapeHtml(entry.title || 'Unknown Title');
                const dateLabel = escapeHtml(formatViewerHistoryDate(entry.lastRequestedAt || entry.addedAt));
                const countLabel = t('ui_history_count', { count: entry.requestCount || 1 });
                const songKey = getSongKey(entry);
                const thumbnail = escapeHtml(getSongThumbnail(entry));
                const source = getSongSource(entry);
                const sourceLabel = escapeHtml(getSongSourceLabel(entry));
                const sourceIcon = escapeHtml(getSongSourceIcon(entry));
                const chatSourceClass = getSongChatSourceClass(entry);
                const sourceClass = ` source-${source}`;

                return `
                <div class="q-item compact request history-item${chatSourceClass}${sourceClass}">
                    <div class="track-num">${index + 1}.</div>
                    <img src="${thumbnail}">
                    <div class="track-info">
                        <div class="track-title" title="${title}">${title}</div>
                        <span class="badge badge-time track-time-badge">${formatTime(entry.duration)}</span>
                        <div class="track-meta">
                            <span class="badge badge-source badge-source-${source}" title="${sourceLabel}" aria-label="${sourceLabel}">${sourceIcon}</span>
                            <span class="badge badge-user">${getSongRequesterHtml(entry.lastUser || entry.user || 'Viewer')}</span>
                            <span class="badge badge-author">&#127908; ${author}</span>
                            <span class="badge badge-date">${dateLabel}</span>
                            <span class="badge badge-count">${escapeHtml(countLabel)}</span>
                        </div>
                    </div>
                    ${renderFavoriteButton(entry, `data-favorite-action="history" data-song-key="${escapeHtml(songKey)}"`)}
                    <button type="button" class="btn-add" draggable="false" data-add-song-action="history" data-song-key="${escapeHtml(songKey)}" title="${escapeHtml(t('ui_history_add_to_queue'))}">+</button>
                </div>`;
            }).join('');
        }

        function toggleFavoriteFromHistory(id) {
            const entry = viewerSongHistory.find(song => getSongKey(song) === getSongKey(id));
            if (!entry) return;
            toggleFavoriteSong(entry);
        }

        function addHistorySongToQueue(id) {
            const entry = viewerSongHistory.find(song => getSongKey(song) === getSongKey(id));
            if (!entry) return;
            addSongFromChat({ ...entry, user: 'Streamer', queueOrigin: 'manual' });
        }

        function clearViewerHistoryWithConfirm() {
            if (!viewerSongHistory.length) return;
            showConfirm(t('ui_history_clear_confirm_msg'), () => {
                viewerSongHistory = [];
                localStorage.removeItem(VIEWER_HISTORY_STORAGE_KEY);
                renderViewerHistory();
                showToast(t('ui_history_cleared'), 'ok');
            }, { title: t('ui_history_clear_confirm_title'), okText: t('ui_history_clear') });
        }

        function getQueueSnapshot() {
            return {
                currentSongInfo: currentSongInfo && !currentSongInfo.isStartup ? normalizeSongForStorage(currentSongInfo) : null,
                playQueue: playQueue.map(normalizeSongForStorage).filter(Boolean)
            };
        }

        function savePersistedQueue() {
            if (!queuePersistenceReady || !SHOULD_PERSIST_QUEUE) return;
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(getQueueSnapshot()));
        }

        function restorePersistedQueue() {
            if (!SHOULD_PERSIST_QUEUE) return false;
            try {
                const snapshot = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY));
                if (!snapshot || (!snapshot.currentSongInfo && (!Array.isArray(snapshot.playQueue) || snapshot.playQueue.length === 0))) return false;
                currentSongInfo = normalizeSongForStorage(snapshot.currentSongInfo);
                currentSongStopped = false;
                resetVoteSkipVotes();
                playQueue = Array.isArray(snapshot.playQueue) ? snapshot.playQueue.map(normalizeSongForStorage).filter(Boolean) : [];

                if (isHolidayStartupSong(currentSongInfo) && !activeHolidayVariant) {
                    currentSongInfo = null;
                    currentSongStopped = false;
                    if (playQueue.length === 0) {
                        localStorage.removeItem(QUEUE_STORAGE_KEY);
                        return false;
                    }
                }

                if (currentSongInfo && isSpotifySong(currentSongInfo)) {
                    initialSongLoaded = true;
                    renderPlayerSurface(currentSongInfo);
                    document.getElementById('now-playing-title').innerText = currentSongInfo.title;
                    setNowPlayingMeta(currentSongInfo);
                    if (canTryNativeSpotifyPlayback()) initSpotifyPlayer().catch(() => {});
                } else if (currentSongInfo && player && player.cueVideoById) {
                    initialSongLoaded = true;
                    player.cueVideoById(currentSongInfo.id);
                    document.getElementById('now-playing-title').innerText = currentSongInfo.title;
                    setNowPlayingMeta(currentSongInfo);
                }
                renderQueue();
                return true;
            } catch (error) {
                localStorage.removeItem(QUEUE_STORAGE_KEY);
                return false;
            }
        }

        function handleQueuePersistenceToggle() {
            SHOULD_PERSIST_QUEUE = document.getElementById('queue-persist-cb').checked;
            localStorage.setItem('ytm_persist_queue', SHOULD_PERSIST_QUEUE ? 'true' : 'false');
            if (SHOULD_PERSIST_QUEUE) savePersistedQueue();
            else localStorage.removeItem(QUEUE_STORAGE_KEY);
        }

        function updateSongRequestLimitInputStates() {
            const userLimitInput = document.getElementById('sr-user-limit-input');
            const globalLimitInput = document.getElementById('sr-global-limit-input');
            if (userLimitInput) userLimitInput.disabled = !SR_USER_QUEUE_LIMIT_ENABLED;
            if (globalLimitInput) globalLimitInput.disabled = !SR_GLOBAL_QUEUE_LIMIT_ENABLED;
        }

        function saveSongRequestSettings() {
            const durationInput = document.getElementById('sr-max-duration-input');
            const voteSkipInput = document.getElementById('sr-voteskip-input');
            const userLimitInput = document.getElementById('sr-user-limit-input');
            const globalLimitInput = document.getElementById('sr-global-limit-input');
            const userLimitEnabledInput = document.getElementById('sr-user-limit-enabled-cb');
            const globalLimitEnabledInput = document.getElementById('sr-global-limit-enabled-cb');
            const musicCategoryInput = document.getElementById('sr-music-category-cb');
            if (!durationInput || !voteSkipInput || !userLimitInput || !globalLimitInput || !userLimitEnabledInput || !globalLimitEnabledInput || !musicCategoryInput) return;
            const durationDigitsOnly = durationInput.value.replace(/\D/g, '');
            const voteSkipDigitsOnly = voteSkipInput.value.replace(/\D/g, '');
            const userLimitDigitsOnly = userLimitInput.value.replace(/\D/g, '');
            const globalLimitDigitsOnly = globalLimitInput.value.replace(/\D/g, '');
            SR_MAX_DURATION_MINUTES = normalizePositiveInteger(durationDigitsOnly, SR_MAX_DURATION_MINUTES || 15);
            SR_VOTESKIP_REQUIRED = normalizePositiveInteger(voteSkipDigitsOnly, SR_VOTESKIP_REQUIRED || 5);
            SR_USER_QUEUE_LIMIT = normalizePositiveInteger(userLimitDigitsOnly, SR_USER_QUEUE_LIMIT || 25);
            SR_GLOBAL_QUEUE_LIMIT = normalizePositiveInteger(globalLimitDigitsOnly, SR_GLOBAL_QUEUE_LIMIT || 100);
            SR_USER_QUEUE_LIMIT_ENABLED = userLimitEnabledInput.checked;
            SR_GLOBAL_QUEUE_LIMIT_ENABLED = globalLimitEnabledInput.checked;
            durationInput.value = SR_MAX_DURATION_MINUTES;
            voteSkipInput.value = SR_VOTESKIP_REQUIRED;
            userLimitInput.value = SR_USER_QUEUE_LIMIT;
            globalLimitInput.value = SR_GLOBAL_QUEUE_LIMIT;
            SR_REQUIRE_MUSIC_CATEGORY = musicCategoryInput.checked;
            localStorage.setItem('ytm_sr_max_duration_minutes', SR_MAX_DURATION_MINUTES.toString());
            localStorage.setItem('ytm_sr_voteskip_required', SR_VOTESKIP_REQUIRED.toString());
            localStorage.setItem('ytm_sr_user_queue_limit', SR_USER_QUEUE_LIMIT.toString());
            localStorage.setItem('ytm_sr_global_queue_limit', SR_GLOBAL_QUEUE_LIMIT.toString());
            localStorage.setItem('ytm_sr_user_queue_limit_enabled', SR_USER_QUEUE_LIMIT_ENABLED ? 'true' : 'false');
            localStorage.setItem('ytm_sr_global_queue_limit_enabled', SR_GLOBAL_QUEUE_LIMIT_ENABLED ? 'true' : 'false');
            localStorage.setItem('ytm_sr_require_music_category', SR_REQUIRE_MUSIC_CATEGORY ? 'true' : 'false');
            updateSongRequestLimitInputStates();
            syncSongRequestSettingsToStreamerBot();
        }

        function handleWidgetAudioToggle() {
            const input = document.getElementById('widget-audio-cb');
            WIDGET_AUDIO_ENABLED_CONFIG = !!(input && input.checked);
            localStorage.setItem('ytm_widget_audio_enabled', WIDGET_AUDIO_ENABLED_CONFIG ? 'true' : 'false');
            updateWidgetUrlDisplay();
        }

        function getSettingsBackupPayload() {
            const storageKeys = [
                'ytm_lang',
                'ytm_ws_host',
                'ytm_ws_port',
                'ytm_ws_pass',
                SPOTIFY_CLIENT_ID_KEY,
                SPOTIFY_ENABLED_KEY,
                PLAYER_VOLUME_STORAGE_KEY,
                'ytm_persist_queue',
                SR_REMEMBER_STATE_STORAGE_KEY,
                SR_ENABLED_STORAGE_KEY,
                QUEUE_STORAGE_KEY,
                FAVORITE_SONGS_STORAGE_KEY,
                VIEWER_HISTORY_STORAGE_KEY,
                'ytm_sr_max_duration_minutes',
                'ytm_sr_voteskip_required',
                'ytm_sr_user_queue_limit',
                'ytm_sr_global_queue_limit',
                'ytm_sr_user_queue_limit_enabled',
                'ytm_sr_global_queue_limit_enabled',
                'ytm_sr_require_music_category',
                'ytm_widget_audio_enabled',
                WIDGET_LAYOUT_STORAGE_KEY,
                WIDGET_LAYOUT_REVISION_KEY,
                WIDGET_LAYOUT_PRESETS_STORAGE_KEY,
                WIDGET_EDITOR_SNAP_STORAGE_KEY,
                APP_THEME_STORAGE_KEY,
                'ytm_base_playlists',
                'ytm_banned_songs',
                'ytm_tutorial_seen'
            ];
            const values = {};
            storageKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) values[key] = value;
            });

            const customMessages = {};
            const customMessagesDisabled = {};
            Object.keys(i18n).forEach(lang => {
                const value = localStorage.getItem('ytm_custom_msgs_' + lang);
                if (value !== null) customMessages[lang] = value;
                const disabledValue = localStorage.getItem(CUSTOM_MSGS_DISABLED_PREFIX + lang);
                if (disabledValue !== null) customMessagesDisabled[lang] = disabledValue;
            });

            return {
                type: SETTINGS_BACKUP_TYPE,
                appVersion: CURRENT_VERSION,
                exportedAt: new Date().toISOString(),
                includesApiKey: false,
                values,
                customMessages,
                customMessagesDisabled
            };
        }

        function exportSettings() {
            const payload = getSettingsBackupPayload();
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.download = 'better-song-request-settings-' + CURRENT_VERSION.replace(/^v/i, '') + '-' + date + '.json';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            showToast(t('ui_export_done'), 'ok');
        }

        function chooseSettingsImport() {
            const input = document.getElementById('settings-import-input');
            if (!input) return;
            input.value = '';
            input.click();
        }

        function applySettingsBackupPayload(payload) {
            const allowedKeys = new Set([
                'ytm_lang',
                'ytm_ws_host',
                'ytm_ws_port',
                'ytm_ws_pass',
                SPOTIFY_CLIENT_ID_KEY,
                SPOTIFY_ENABLED_KEY,
                PLAYER_VOLUME_STORAGE_KEY,
                'ytm_persist_queue',
                SR_REMEMBER_STATE_STORAGE_KEY,
                SR_ENABLED_STORAGE_KEY,
                QUEUE_STORAGE_KEY,
                FAVORITE_SONGS_STORAGE_KEY,
                VIEWER_HISTORY_STORAGE_KEY,
                'ytm_sr_max_duration_minutes',
                'ytm_sr_voteskip_required',
                'ytm_sr_user_queue_limit',
                'ytm_sr_global_queue_limit',
                'ytm_sr_user_queue_limit_enabled',
                'ytm_sr_global_queue_limit_enabled',
                'ytm_sr_require_music_category',
                'ytm_widget_audio_enabled',
                WIDGET_LAYOUT_STORAGE_KEY,
                WIDGET_LAYOUT_REVISION_KEY,
                WIDGET_LAYOUT_PRESETS_STORAGE_KEY,
                WIDGET_EDITOR_SNAP_STORAGE_KEY,
                APP_THEME_STORAGE_KEY,
                'ytm_base_playlists',
                'ytm_banned_songs',
                'ytm_tutorial_seen'
            ]);

            Object.keys(payload.values || {}).forEach(key => {
                if (allowedKeys.has(key)) localStorage.setItem(key, String(payload.values[key]));
            });

            Object.keys(payload.customMessages || {}).forEach(lang => {
                if (i18n[lang]) localStorage.setItem('ytm_custom_msgs_' + lang, String(payload.customMessages[lang]));
            });

            Object.keys(payload.customMessagesDisabled || {}).forEach(lang => {
                if (i18n[lang]) localStorage.setItem(CUSTOM_MSGS_DISABLED_PREFIX + lang, String(payload.customMessagesDisabled[lang]));
            });
        }

        function importSettingsFile() {
            const input = document.getElementById('settings-import-input');
            const file = input && input.files ? input.files[0] : null;
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const payload = JSON.parse(String(reader.result || ''));
                    if (!payload || (payload.type !== SETTINGS_BACKUP_TYPE && !LEGACY_SETTINGS_BACKUP_TYPES.includes(payload.type)) || typeof payload.values !== 'object') {
                        showToast(t('ui_import_invalid'), 'error');
                        return;
                    }

                    showConfirm(t('ui_import_confirm'), () => {
                        applySettingsBackupPayload(payload);
                        showToast(t('ui_import_done'), 'ok');
                        setTimeout(() => window.location.reload(), 900);
                    }, { okText: t('ui_import_settings') });
                } catch (error) {
                    showToast(t('ui_import_invalid'), 'error');
                }
            };
            reader.onerror = () => showToast(t('ui_import_invalid'), 'error');
            reader.readAsText(file);
        }

        function setBaseActionButtonMode(mode) {
            baseActionButtonMode = mode;
            renderBaseActionButtons();
        }

        function renderBaseActionButtons() {
            const startBtn = document.getElementById('btn-run');
            const shuffleBtn = document.getElementById('btn-shuffle');
            if (!startBtn || !shuffleBtn) return;

            const mode = baseActionButtonMode || (API_KEY ? 'downloading' : 'api-required');
            const isReady = mode === 'ready';
            startBtn.disabled = !isReady;
            shuffleBtn.disabled = !isReady;

            if (isReady) {
                startBtn.innerText = t('ui_btn_start_order');
                shuffleBtn.innerText = t('ui_btn_shuffle');
                return;
            }

            const textKey = mode === 'error'
                ? 'ui_btn_start_error'
                : (mode === 'empty' ? 'ui_btn_no_playlists' : (mode === 'api-required' ? 'ui_btn_start_req' : 'ui_btn_downloading'));
            const text = t(textKey);
            startBtn.innerText = text;
            shuffleBtn.innerText = text;
        }

        function syncSongRequestSettingsToStreamerBot() {
            if (!canUseStreamerBotWebsocket()) return;
            const limitState = getSongRequestLimitStatePayload();
            ws.send(JSON.stringify({
                request: 'DoAction',
                action: { name: 'SongRequestSettings' },
                args: {
                    maxDurationMinutes: SR_MAX_DURATION_MINUTES.toString(),
                    voteSkipRequired: SR_VOTESKIP_REQUIRED.toString(),
                    userQueueLimit: SR_USER_QUEUE_LIMIT.toString(),
                    globalQueueLimit: SR_GLOBAL_QUEUE_LIMIT.toString(),
                    userLimitEnabled: limitState.userLimitEnabled,
                    globalLimitEnabled: limitState.globalLimitEnabled,
                    srEnabled: isSrEnabled ? 'true' : 'false',
                    globalRequestCount: limitState.globalRequestCount,
                    userRequestCountsJson: limitState.userRequestCountsJson,
                    requireMusicCategory: SR_REQUIRE_MUSIC_CATEGORY ? 'true' : 'false'
                },
                id: 'SongRequestSettings'
            }));
        }

        function renderSettingsMessages() {
            let html = '';
            let keys = Object.keys(i18n['en']).filter(k => k.startsWith('msg_'));
            
            keys.forEach(k => {
                let defaultTxt = i18n[currentLang][k] || i18n['en'][k];
                let currentTxt = customMsgs[k] !== undefined ? customMsgs[k] : defaultTxt;
                let vars = getVarsDesc(k);
                let isEnabled = !disabledCustomMsgs[k];
                
                html += `
                <div class="msg-setting-item ${isEnabled ? '' : 'is-disabled'}">
                    <div class="msg-setting-header">
                        <span class="msg-key">${k}</span>
                        <span class="msg-vars">${vars}</span>
                    </div>
                    <div class="msg-setting-body">
                        <label class="msg-enable-switch" title="${escapeHtml(isEnabled ? t('ui_msg_enabled') : t('ui_msg_disabled'))}">
                            <input type="checkbox" id="msg_enabled_${k}" ${isEnabled ? 'checked' : ''} onchange="toggleCustomMsgEnabled('${k}')">
                            <span class="queue-switch-track" aria-hidden="true"></span>
                        </label>
                        <input type="text" id="msg_input_${k}" value="${escapeHtml(currentTxt)}" maxlength="500">
                        <button class="btn-msg-action" onclick="saveCustomMsg('${k}')" title="Save">💾</button>
                        <button class="btn-msg-action btn-msg-reset" onclick="resetCustomMsg('${k}')" title="Restore Default">🔄</button>
                    </div>
                </div>`;
            });
            document.getElementById('msg-settings-list').innerHTML = html;
        }

        function saveCustomMsgDisabledState() {
            localStorage.setItem(CUSTOM_MSGS_DISABLED_PREFIX + currentLang, JSON.stringify(disabledCustomMsgs));
        }

        function toggleCustomMsgEnabled(key) {
            const input = document.getElementById(`msg_enabled_${key}`);
            if (input && input.checked) delete disabledCustomMsgs[key];
            else disabledCustomMsgs[key] = true;
            saveCustomMsgDisabledState();
            renderSettingsMessages();
        }

        function saveCustomMsg(key) {
            const val = document.getElementById(`msg_input_${key}`).value.trim();
            if(val === '') return;
            customMsgs[key] = val;
            localStorage.setItem('ytm_custom_msgs_' + currentLang, JSON.stringify(customMsgs));
            log(`💾 Saved custom message for: ${key}`, "normal");
            
            const btn = document.querySelector(`button[onclick="saveCustomMsg('${key}')"]`);
            let oldText = btn.innerHTML;
            btn.innerHTML = "✅";
            setTimeout(() => { btn.innerHTML = oldText; }, 1000);
        }

        function resetCustomMsg(key) {
            delete customMsgs[key];
            localStorage.setItem('ytm_custom_msgs_' + currentLang, JSON.stringify(customMsgs));
            document.getElementById(`msg_input_${key}`).value = i18n[currentLang][key] || i18n['en'][key];
            log(`🔄 Reset custom message for: ${key}`, "normal");
        }

        function saveWsConfig() {
            const newHost = normalizeWebsocketHost(document.getElementById('ws-host-input').value.trim());
            const newPort = document.getElementById('ws-port-input').value.trim();
            const newPass = document.getElementById('ws-pass-input').value.trim();
            
            if(newPort && !isNaN(newPort)) {
                WS_HOST = newHost;
                WS_PORT = newPort;
                WS_PASS = newPass;
                localStorage.setItem('ytm_ws_host', WS_HOST);
                localStorage.setItem('ytm_ws_port', WS_PORT);
                localStorage.setItem('ytm_ws_pass', WS_PASS);
                document.getElementById('tut-ws-port').value = WS_PORT; 
                log(`🔌 WS Server: ${WS_HOST}:${WS_PORT} | Pass: ${WS_PASS ? 'YES' : 'NO'}`, "warn");
                
                updateWidgetUrlDisplay();
                if(ws) {
                    ws.onclose = null; 
                    ws.close();
                    clearTimeout(wsReconnectTimeout);
                    connectWebsocket();
                }
            }
        }

        function getWidgetUrlBase() {
            try {
                if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
                    const url = new URL(window.location.href);
                    const basePath = url.pathname.endsWith('/') ? url.pathname : url.pathname.replace(/[^\/]*$/, '');
                    url.pathname = basePath + 'now-playing-widget.html';
                    url.search = '';
                    url.hash = '';
                    return url;
                }
            } catch (error) {}
            return new URL('http://localhost:7474/betterSongRequest/now-playing-widget.html');
        }

        function getWidgetUrl() {
            const url = getWidgetUrlBase();
            const hostInput = document.getElementById('ws-host-input');
            const portInput = document.getElementById('ws-port-input');
            const passInput = document.getElementById('ws-pass-input');
            const audioInput = document.getElementById('widget-audio-cb');
            const host = normalizeWebsocketHost((hostInput && hostInput.value.trim()) ? hostInput.value.trim() : WS_HOST);
            const port = (portInput && portInput.value.trim()) ? portInput.value.trim() : WS_PORT;
            const pass = passInput ? passInput.value.trim() : WS_PASS;
            const audioEnabled = audioInput ? audioInput.checked : WIDGET_AUDIO_ENABLED_CONFIG;

            if (host && host !== DEFAULT_STREAMERBOT_WS_HOST) url.searchParams.set('server', host);
            if (port && port !== '8080') url.searchParams.set('port', port);
            if (pass) url.searchParams.set('pass', pass);
            if (audioEnabled) url.searchParams.set('audio', '1');
            if (currentLang) url.searchParams.set('lang', currentLang);
            return url.toString();
        }

        function updateWidgetUrlWarning(currentUrl) {
            const warning = document.getElementById('widget-url-warning');
            const container = document.querySelector('.widget-customizer-header-url');
            if (!warning && !container) return;
            const lastCopiedUrl = localStorage.getItem(WIDGET_LAST_COPIED_URL_KEY) || '';
            const changedAfterCopy = !!lastCopiedUrl && lastCopiedUrl !== currentUrl;
            const changedAfterOpen = widgetUrlWarningEnabled && !!widgetUrlBaseline && widgetUrlBaseline !== currentUrl;
            const needsCopy = changedAfterCopy || changedAfterOpen;
            if (warning) warning.classList.toggle('is-hidden', !needsCopy);
            if (container) container.classList.toggle('needs-widget-url-copy', needsCopy);
        }

        function updateWidgetUrlDisplay() {
            const output = document.getElementById('widget-url-output');
            const url = getWidgetUrl();
            if (output) output.value = url;
            updateWidgetUrlWarning(url);
        }

        function copyWidgetUrl() {
            updateWidgetUrlDisplay();
            const output = document.getElementById('widget-url-output');
            if (!output) return;
            output.focus();
            output.select();
            output.setSelectionRange(0, 99999);

            const done = () => {
                localStorage.setItem(WIDGET_LAST_COPIED_URL_KEY, output.value);
                widgetUrlBaseline = output.value;
                widgetUrlWarningEnabled = true;
                updateWidgetUrlWarning(output.value);
                const btn = document.getElementById('btn-copy-widget-url');
                if (!btn) return;
                const oldText = btn.innerText;
                btn.innerText = t('ui_widget_copied');
                setTimeout(() => { btn.innerText = t('ui_widget_copy') || oldText; }, 1200);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(output.value).then(done).catch(() => {
                    document.execCommand('copy');
                    done();
                });
            } else {
                document.execCommand('copy');
                done();
            }
        }

        // ====================================================================

        function updateApiStatusUI(status) {
            const icon = document.getElementById('api-status-icon');
            const uiIcon = document.getElementById('api-status-ui');
            if(icon) icon.setAttribute('data-last-status', status);
            
            if(status === 'ok') { 
                if(icon) { icon.innerText = '🟢 API OK'; icon.style.color = '#00ff88'; }
                if(uiIcon) { uiIcon.innerText = '🟢 API OK'; uiIcon.style.color = '#00ff88'; }
            }
            else if (status === 'error') { 
                if(icon) { icon.innerText = '🔴 API ERROR'; icon.style.color = 'var(--red)'; }
                if(uiIcon) { uiIcon.innerText = '🔴 API ERROR'; uiIcon.style.color = 'var(--red)'; }
            }
            else { 
                if(icon) { icon.innerText = '⚪ API UNKNOWN'; icon.style.color = '#aaa'; }
                if(uiIcon) { uiIcon.innerText = '⚪ API UNKNOWN'; uiIcon.style.color = '#aaa'; }
            }
        }

        async function verifyApiKey(key) {
            if(!key) { updateApiStatusUI('error'); return false; }
            try {
                let res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=${key}`);
                let data = await res.json();
                if(data.error) {
                    updateApiStatusUI('error');
                    return false;
                }
                updateApiStatusUI('ok');
                return true;
            } catch(e) {
                updateApiStatusUI('error');
                return false;
            }
        }

        function checkApiSetup() {
            if (!API_KEY || API_KEY.trim() === '') {
                updateApiStatusUI('error');
                openSettings(); 
                setBaseActionButtonMode('api-required');
                return false;
            }
            return true;
        }

        async function saveApiKey() {
            const inputVal = document.getElementById('api-key-input').value.trim();
            if (inputVal === '') return;
            
            updateApiStatusUI('loading');
            let isValid = await verifyApiKey(inputVal);
            
            if (isValid) {
                API_KEY = inputVal;
                localStorage.setItem('ytm_api_key', API_KEY);
                log("🔑 API Key Verified.");
                if (player && typeof player.getPlayerState === 'function') fetchFullPlaylistFromAPI();
                else setBaseActionButtonMode('downloading');
            } else {
                showToast(t('ui_api_invalid'), 'error');
            }
        }

        function toggleApiVisibility() {
            const input = document.getElementById('api-key-input');
            const btn = document.getElementById('btn-show-api');
            if (input.type === 'password') { input.type = 'text'; btn.innerText = t('ui_api_hide'); } 
            else { input.type = 'password'; btn.innerText = t('ui_api_show'); }
        }

        function getSpotifyRedirectUri() {
            try {
                const url = new URL(window.location.href);
                if (url.hostname.toLowerCase() === 'localhost') url.hostname = '127.0.0.1';
                url.search = '';
                url.hash = '';
                return url.toString();
            } catch (error) {
                return '';
            }
        }

        function hasSpotifyToken() {
            return !!spotifyAccessToken && spotifyTokenExpiresAt > Date.now() + 30000;
        }

        function suspendSpotifyRuntime() {
            clearSpotifyPlaybackMonitor();
            if (spotifyPlayer) {
                try { spotifyPlayer.disconnect(); } catch (error) {}
            }
            spotifyPlayer = null;
            spotifyDeviceId = '';
            spotifyPlayerReady = false;
            spotifyPlaybackState = null;
            spotifyTrackEndHandled = false;
        }

        function handleSpotifyEnabledToggle() {
            const input = document.getElementById('spotify-enabled-cb');
            SPOTIFY_ENABLED = !!(input && input.checked);
            localStorage.setItem(SPOTIFY_ENABLED_KEY, SPOTIFY_ENABLED ? 'true' : 'false');

            if (!SPOTIFY_ENABLED) {
                suspendSpotifyRuntime();
                spotifyLastError = '';
                showToast(t('ui_spotify_disabled_short'), 'warn');
            } else {
                showToast(t('ui_spotify_enabled_short'), 'ok');
                if (canTryNativeSpotifyPlayback()) initSpotifyPlayer().catch(() => {});
            }

            renderSpotifyStatus();
        }

        function renderSpotifyStatus(messageKey = '') {
            const settingsRow = document.getElementById('spotify-settings-row');
            const settingsContent = document.getElementById('spotify-settings-content');
            const enabledInput = document.getElementById('spotify-enabled-cb');
            const statusEl = document.getElementById('spotify-status-ui');
            const connectBtn = document.getElementById('btn-spotify-connect');
            const disconnectBtn = document.getElementById('btn-spotify-disconnect');
            const clientIdInput = document.getElementById('spotify-client-id-input');
            const redirectInput = document.getElementById('spotify-redirect-uri-output');

            if (enabledInput) enabledInput.checked = SPOTIFY_ENABLED;
            if (clientIdInput && clientIdInput.value !== SPOTIFY_CLIENT_ID) clientIdInput.value = SPOTIFY_CLIENT_ID;
            if (redirectInput) redirectInput.value = getSpotifyRedirectUri();

            if (settingsRow) settingsRow.classList.toggle('is-disabled', !SPOTIFY_ENABLED);
            if (settingsContent) {
                settingsContent.setAttribute('aria-disabled', SPOTIFY_ENABLED ? 'false' : 'true');
                settingsContent.querySelectorAll('input, button').forEach(control => {
                    control.disabled = !SPOTIFY_ENABLED;
                });
            }
            if (connectBtn) connectBtn.disabled = !SPOTIFY_ENABLED || !SPOTIFY_CLIENT_ID;
            if (disconnectBtn) disconnectBtn.disabled = !SPOTIFY_ENABLED || (!spotifyAccessToken && !spotifyRefreshToken);

            if (!statusEl) return;

            let key = messageKey;
            if (!SPOTIFY_ENABLED) {
                key = 'ui_spotify_status_disabled';
            } else if (!key) {
                if (!SPOTIFY_CLIENT_ID) key = 'ui_spotify_status_missing_client';
                else if (spotifyLastError) key = 'ui_spotify_status_error';
                else if (spotifyPlayerReady) key = 'ui_spotify_status_ready';
                else if (spotifyAccessToken || spotifyRefreshToken) key = 'ui_spotify_status_connected';
                else key = 'ui_spotify_status_disconnected';
            }

            statusEl.innerText = t(key, { error: spotifyLastError || '-' });
            statusEl.classList.toggle('is-ok', key === 'ui_spotify_status_ready' || key === 'ui_spotify_status_connected');
            statusEl.classList.toggle('is-error', key === 'ui_spotify_status_error' || key === 'ui_spotify_status_missing_client');
            statusEl.classList.toggle('is-disabled', key === 'ui_spotify_status_disabled');
        }

        function saveSpotifyConfig() {
            if (!SPOTIFY_ENABLED) return;
            const input = document.getElementById('spotify-client-id-input');
            SPOTIFY_CLIENT_ID = input ? input.value.trim() : SPOTIFY_CLIENT_ID;
            if (SPOTIFY_CLIENT_ID) localStorage.setItem(SPOTIFY_CLIENT_ID_KEY, SPOTIFY_CLIENT_ID);
            else localStorage.removeItem(SPOTIFY_CLIENT_ID_KEY);
            renderSpotifyStatus();
            showToast(t('ui_spotify_saved'), 'ok');
        }

        function clearSpotifyTokens() {
            spotifyAccessToken = '';
            spotifyRefreshToken = '';
            spotifyTokenExpiresAt = 0;
            spotifyDeviceId = '';
            spotifyPlayerReady = false;
            spotifyPlaybackState = null;
            localStorage.removeItem(SPOTIFY_ACCESS_TOKEN_KEY);
            localStorage.removeItem(SPOTIFY_REFRESH_TOKEN_KEY);
            localStorage.removeItem(SPOTIFY_TOKEN_EXPIRES_KEY);
        }

        function disconnectSpotify() {
            suspendSpotifyRuntime();
            clearSpotifyTokens();
            spotifyLastError = '';
            renderSpotifyStatus();
            showToast(t('ui_spotify_disconnected'), 'warn');
        }

        function spotifyBase64Url(buffer) {
            return btoa(String.fromCharCode(...new Uint8Array(buffer)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        }

        function generateSpotifyCodeVerifier() {
            const bytes = new Uint8Array(64);
            crypto.getRandomValues(bytes);
            return spotifyBase64Url(bytes);
        }

        async function createSpotifyCodeChallenge(verifier) {
            const data = new TextEncoder().encode(verifier);
            const digest = await crypto.subtle.digest('SHA-256', data);
            return spotifyBase64Url(digest);
        }

        async function connectSpotify() {
            if (!SPOTIFY_ENABLED) {
                showToast(t('ui_spotify_disabled_short'), 'warn');
                return;
            }
            saveSpotifyConfig();
            if (!SPOTIFY_CLIENT_ID) {
                showToast(t('ui_spotify_client_required'), 'error');
                return;
            }
            if (!/^https?:$/i.test(window.location.protocol)) {
                showToast(t('ui_spotify_http_required'), 'error', 9000);
                return;
            }

            const verifier = generateSpotifyCodeVerifier();
            const challenge = await createSpotifyCodeChallenge(verifier);
            const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem(SPOTIFY_CODE_VERIFIER_KEY, verifier);
            localStorage.setItem(SPOTIFY_AUTH_STATE_KEY, state);

            const params = new URLSearchParams({
                response_type: 'code',
                client_id: SPOTIFY_CLIENT_ID,
                scope: SPOTIFY_SCOPES.join(' '),
                redirect_uri: getSpotifyRedirectUri(),
                state,
                code_challenge_method: 'S256',
                code_challenge: challenge
            });

            window.location.href = 'https://accounts.spotify.com/authorize?' + params.toString();
        }

        async function exchangeSpotifyCode(code) {
            const verifier = localStorage.getItem(SPOTIFY_CODE_VERIFIER_KEY) || '';
            if (!SPOTIFY_CLIENT_ID || !verifier) throw new Error('Missing Spotify verifier');

            const body = new URLSearchParams({
                client_id: SPOTIFY_CLIENT_ID,
                grant_type: 'authorization_code',
                code,
                redirect_uri: getSpotifyRedirectUri(),
                code_verifier: verifier
            });

            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error_description || data.error || 'Spotify token error');
            storeSpotifyTokenResponse(data);
        }

        function storeSpotifyTokenResponse(data) {
            spotifyAccessToken = data.access_token || spotifyAccessToken;
            spotifyRefreshToken = data.refresh_token || spotifyRefreshToken;
            spotifyTokenExpiresAt = Date.now() + (Math.max(60, Number(data.expires_in) || 3600) * 1000);
            if (spotifyAccessToken) localStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, spotifyAccessToken);
            if (spotifyRefreshToken) localStorage.setItem(SPOTIFY_REFRESH_TOKEN_KEY, spotifyRefreshToken);
            localStorage.setItem(SPOTIFY_TOKEN_EXPIRES_KEY, String(spotifyTokenExpiresAt));
        }

        async function refreshSpotifyTokenIfNeeded(force = false) {
            if (!SPOTIFY_ENABLED) throw new Error('Spotify integration disabled');
            if (!force && hasSpotifyToken()) return spotifyAccessToken;
            if (!SPOTIFY_CLIENT_ID || !spotifyRefreshToken) throw new Error('Spotify authorization required');

            const body = new URLSearchParams({
                client_id: SPOTIFY_CLIENT_ID,
                grant_type: 'refresh_token',
                refresh_token: spotifyRefreshToken
            });
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error_description || data.error || 'Spotify refresh error');
            storeSpotifyTokenResponse(data);
            return spotifyAccessToken;
        }

        async function handleSpotifyAuthCallback() {
            let url;
            try { url = new URL(window.location.href); } catch (error) { return; }
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            const state = url.searchParams.get('state');
            if (!code && !error) return;

            // Spotify requires a loopback IP instead of localhost. When the app was
            // opened on localhost, relay the callback back to that origin so its
            // PKCE verifier and saved settings remain available.
            const localAuthState = localStorage.getItem(SPOTIFY_AUTH_STATE_KEY) || '';
            if (url.hostname === '127.0.0.1' && !localAuthState) {
                url.hostname = 'localhost';
                window.location.replace(url.toString());
                return;
            }

            url.searchParams.delete('code');
            url.searchParams.delete('state');
            url.searchParams.delete('error');
            window.history.replaceState({}, document.title, url.toString());

            if (error) {
                spotifyLastError = error;
                renderSpotifyStatus('ui_spotify_status_error');
                showToast(t('ui_spotify_auth_failed', { error }), 'error', 9000);
                return;
            }

            const expectedState = localStorage.getItem(SPOTIFY_AUTH_STATE_KEY) || '';
            localStorage.removeItem(SPOTIFY_AUTH_STATE_KEY);
            if (!state || state !== expectedState) {
                spotifyLastError = 'Invalid OAuth state';
                renderSpotifyStatus('ui_spotify_status_error');
                showToast(t('ui_spotify_auth_failed', { error: spotifyLastError }), 'error', 9000);
                return;
            }

            try {
                await exchangeSpotifyCode(code);
                localStorage.removeItem(SPOTIFY_CODE_VERIFIER_KEY);
                spotifyLastError = '';
                renderSpotifyStatus('ui_spotify_status_connected');
                showToast(t('ui_spotify_connected'), 'ok');
                initSpotifyPlayer().catch(() => {});
            } catch (authError) {
                spotifyLastError = authError.message || String(authError);
                renderSpotifyStatus('ui_spotify_status_error');
                showToast(t('ui_spotify_auth_failed', { error: spotifyLastError }), 'error', 9000);
            }
        }

        async function spotifyApi(path, options = {}) {
            if (!SPOTIFY_ENABLED) throw new Error('Spotify integration disabled');
            const token = await refreshSpotifyTokenIfNeeded();
            const response = await fetch('https://api.spotify.com/v1' + path, {
                ...options,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            });
            if (response.status === 204) return null;
            const text = await response.text();
            const data = text ? JSON.parse(text) : null;
            if (!response.ok) {
                const message = data && data.error ? (data.error.message || data.error.status || JSON.stringify(data.error)) : response.statusText;
                const error = new Error(message || 'Spotify API error');
                error.status = response.status;
                throw error;
            }
            return data;
        }

        function parseSpotifyUrl(input) {
            const value = String(input || '').trim();
            let match = value.match(/^spotify:(track|playlist):([A-Za-z0-9]+)$/i);
            if (match) return { type: match[1].toLowerCase(), id: match[2], url: value };
            match = value.match(/open\.spotify\.com\/(track|playlist)\/([A-Za-z0-9]+)/i);
            if (match) return { type: match[1].toLowerCase(), id: match[2], url: value };
            return null;
        }

        function mapSpotifyTrack(track, user = 'Auto') {
            if (!track || !track.id) return null;
            const artists = Array.isArray(track.artists) ? track.artists.map(artist => artist.name).filter(Boolean).join(', ') : 'Spotify';
            const image = track.album && Array.isArray(track.album.images) && track.album.images.length ? track.album.images[0].url : '';
            return normalizeSongForStorage({
                id: track.id,
                source: SONG_SOURCE_SPOTIFY,
                spotifyId: track.id,
                spotifyUri: track.uri || ('spotify:track:' + track.id),
                spotifyUrl: track.external_urls && track.external_urls.spotify ? track.external_urls.spotify : ('https://open.spotify.com/track/' + track.id),
                thumbnail: image,
                title: track.name || 'Spotify Track',
                author: artists || 'Spotify',
                duration: Math.round((Number(track.duration_ms) || 210000) / 1000),
                user
            });
        }

        async function fetchSpotifyTrackById(trackId, user = 'Auto') {
            const data = await spotifyApi('/tracks/' + encodeURIComponent(trackId));
            return mapSpotifyTrack(data, user);
        }

        async function fetchSpotifyOembedTrack(url, user = 'Auto') {
            const response = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(url));
            if (!response.ok) throw new Error('Spotify oEmbed unavailable');
            const data = await response.json();
            const parsed = parseSpotifyUrl(url);
            return normalizeSongForStorage({
                id: parsed ? parsed.id : url,
                source: SONG_SOURCE_SPOTIFY,
                spotifyId: parsed ? parsed.id : '',
                spotifyUri: parsed ? 'spotify:track:' + parsed.id : '',
                spotifyUrl: url,
                thumbnail: data.thumbnail_url || '',
                title: data.title || 'Spotify Track',
                author: data.author_name || 'Spotify',
                duration: 210,
                user
            });
        }

        async function fetchSpotifyPlaylistMeta(playlistId) {
            return spotifyApi('/playlists/' + encodeURIComponent(playlistId) + '?fields=id,name');
        }

        async function fetchSpotifyPlaylistTracks(playlistId) {
            const tracks = [];
            let path = '/playlists/' + encodeURIComponent(playlistId) + '/items?limit=50&market=from_token&additional_types=track';
            while (path) {
                const data = await spotifyApi(path);
                (data.items || []).forEach(entry => {
                    const track = entry && (entry.item || entry.track);
                    if (!track || (track.type && track.type !== 'track')) return;
                    const song = mapSpotifyTrack(track, 'Auto');
                    if (song) tracks.push(song);
                });
                path = data.next ? data.next.replace('https://api.spotify.com/v1', '') : '';
            }
            return tracks;
        }

        function loadSpotifySdk() {
            if (!SPOTIFY_ENABLED) return Promise.reject(new Error('Spotify integration disabled'));
            if (window.Spotify && window.Spotify.Player) return Promise.resolve();
            if (spotifySdkPromise) return spotifySdkPromise;

            spotifySdkPromise = new Promise((resolve, reject) => {
                const previousReady = window.onSpotifyWebPlaybackSDKReady;
                window.onSpotifyWebPlaybackSDKReady = () => {
                    if (typeof previousReady === 'function') previousReady();
                    resolve();
                };
                const existing = document.querySelector('script[data-spotify-sdk]');
                if (existing) return;
                const script = document.createElement('script');
                script.src = SPOTIFY_PLAYER_SDK_URL;
                script.async = true;
                script.dataset.spotifySdk = 'true';
                script.onerror = () => reject(new Error('Spotify SDK failed to load'));
                document.head.appendChild(script);
            });

            return spotifySdkPromise;
        }

        async function initSpotifyPlayer() {
            if (!SPOTIFY_ENABLED) throw new Error('Spotify integration disabled');
            if (spotifyPlayerReady && spotifyPlayer) return spotifyPlayer;
            await refreshSpotifyTokenIfNeeded();
            await loadSpotifySdk();

            if (!spotifyPlayer) {
                spotifyPlayer = new Spotify.Player({
                    name: PROJECT_NAME,
                    getOAuthToken: async callback => {
                        try {
                            const token = await refreshSpotifyTokenIfNeeded();
                            callback(token);
                        } catch (error) {
                            spotifyLastError = error.message || String(error);
                            renderSpotifyStatus('ui_spotify_status_error');
                        }
                    },
                    volume: (PLAYER_VOLUME === null ? 80 : PLAYER_VOLUME) / 100
                });

                spotifyPlayer.addListener('ready', ({ device_id }) => {
                    spotifyDeviceId = device_id;
                    spotifyPlayerReady = true;
                    spotifyLastError = '';
                    renderSpotifyStatus('ui_spotify_status_ready');
                });
                spotifyPlayer.addListener('not_ready', () => {
                    spotifyPlayerReady = false;
                    renderSpotifyStatus();
                });
                spotifyPlayer.addListener('account_error', ({ message }) => {
                    spotifyLastError = message || 'Spotify Premium required';
                    renderSpotifyStatus('ui_spotify_status_error');
                    showToast(t('ui_spotify_premium_required'), 'error', 9000);
                });
                spotifyPlayer.addListener('authentication_error', ({ message }) => {
                    spotifyLastError = message || 'Spotify authentication error';
                    clearSpotifyTokens();
                    renderSpotifyStatus('ui_spotify_status_error');
                });
                spotifyPlayer.addListener('playback_error', ({ message }) => {
                    spotifyLastError = message || 'Spotify playback error';
                    renderSpotifyStatus('ui_spotify_status_error');
                });
                spotifyPlayer.addListener('player_state_changed', state => {
                    spotifyPlaybackState = state;
                    if (currentSongInfo && getSongSource(currentSongInfo) === SONG_SOURCE_SPOTIFY) updateNowPlayingProgress();
                });
            }

            const connected = await spotifyPlayer.connect();
            if (!connected) throw new Error('Spotify device could not connect');
            await waitForSpotifyDevice();
            return spotifyPlayer;
        }

        async function waitForSpotifyDevice(timeoutMs = 8000) {
            const start = Date.now();
            while (!spotifyPlayerReady || !spotifyDeviceId) {
                if (Date.now() - start > timeoutMs) throw new Error('Spotify device is not ready');
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        }

        function clearSpotifyPlaybackMonitor() {
            clearInterval(spotifyPlaybackMonitor);
            spotifyPlaybackMonitor = null;
        }

        function startSpotifyPlaybackMonitor() {
            clearSpotifyPlaybackMonitor();
            spotifyPlaybackMonitor = setInterval(async () => {
                if (!currentSongInfo || getSongSource(currentSongInfo) !== SONG_SOURCE_SPOTIFY || !spotifyPlayer) return;
                try {
                    const state = await spotifyPlayer.getCurrentState();
                    if (!state) return;
                    spotifyPlaybackState = state;
                    const durationMs = state.duration || (currentSongInfo.duration || 0) * 1000;
                    const positionMs = state.position || 0;
                    if (!state.paused && durationMs > 0 && durationMs - positionMs <= 900 && !spotifyTrackEndHandled) {
                        spotifyTrackEndHandled = true;
                        setTimeout(() => {
                            if (currentSongInfo && getSongSource(currentSongInfo) === SONG_SOURCE_SPOTIFY) playNext(playQueue.length === 0 ? 'shuffle' : basePlaybackMode);
                        }, 900);
                    }
                    updateNowPlayingProgress();
                } catch (error) {}
            }, 700);
        }

        async function playSpotifySong(song) {
            await initSpotifyPlayer();
            if (PLAYER_VOLUME !== null && spotifyPlayer && spotifyPlayer.setVolume) {
                await spotifyPlayer.setVolume(PLAYER_VOLUME / 100);
            }
            renderPlayerSurface(song);
            if (player && player.stopVideo) {
                try { player.stopVideo(); } catch (error) {}
            }
            if (spotifyPlayer && spotifyPlayer.activateElement) {
                try { await spotifyPlayer.activateElement(); } catch (error) {}
            }
            spotifyTrackEndHandled = false;
            await spotifyApi('/me/player/play?device_id=' + encodeURIComponent(spotifyDeviceId), {
                method: 'PUT',
                body: JSON.stringify({ uris: [song.spotifyUri || ('spotify:track:' + getSongIdentityId(song))] })
            });
            currentSongStopped = false;
            nowPlayingWaveHoldUntilStart = false;
            clearNowPlayingWaveEffect();
            document.getElementById('now-playing-title').innerText = song.title;
            setNowPlayingMeta(song);
            startSpotifyPlaybackMonitor();
            publishNowPlayingWidgetStartupBurst();
        }

        function activateSpotifyPlaybackElement() {
            if (!spotifyPlayer || !spotifyPlayer.activateElement) return;
            try {
                const activation = spotifyPlayer.activateElement();
                if (activation && typeof activation.catch === 'function') activation.catch(() => {});
            } catch (error) {}
        }

        function getSpotifySongUri(song) {
            if (!song) return '';
            return song.spotifyUri || ('spotify:track:' + getSongIdentityId(song));
        }

        async function spotifyPlayerHasSong(song) {
            if (!spotifyPlayer || !song) return false;
            try {
                const state = await spotifyPlayer.getCurrentState();
                if (!state) return false;
                spotifyPlaybackState = state;
                const currentTrack = state.track_window && state.track_window.current_track;
                return !!(currentTrack && (
                    currentTrack.uri === getSpotifySongUri(song) ||
                    String(currentTrack.id || '') === String(getSongIdentityId(song))
                ));
            } catch (error) {
                return false;
            }
        }

        async function pauseSpotifyPlayback() {
            if (spotifyPlayer) {
                try { await spotifyPlayer.pause(); } catch (error) {}
            }
        }

        async function resumeSpotifyPlayback(song = currentSongInfo) {
            if (!song) return;
            await initSpotifyPlayer();

            if (!(await spotifyPlayerHasSong(song))) {
                await playSpotifySong(song);
                return;
            }

            try {
                if (spotifyPlayer.activateElement) await spotifyPlayer.activateElement();
                await spotifyPlayer.resume();
            } catch (error) {
                await spotifyApi('/me/player/play?device_id=' + encodeURIComponent(spotifyDeviceId), { method: 'PUT' });
            }
        }

        async function stopSpotifyPlayback() {
            clearSpotifyPlaybackMonitor();
            if (spotifyPlayer) {
                try { await spotifyPlayer.pause(); } catch (error) {}
            }
        }

        function getSpotifyPlaybackTiming() {
            const state = spotifyPlaybackState;
            const duration = state && state.duration ? Math.floor(state.duration / 1000) : (currentSongInfo ? currentSongInfo.duration || 0 : 0);
            const currentTime = state && Number.isFinite(state.position) ? Math.floor(state.position / 1000) : 0;
            const isPlaying = !!(state && !state.paused);
            return { duration, currentTime, isPlaying, playerState: isPlaying ? 1 : 2 };
        }

        async function fetchYoutubeSongById(videoId, user = 'Streamer') {
            if (!checkApiSetup()) return null;
            let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${API_KEY}`;
            let res = await fetch(url);
            let data = await res.json();
            if (data.error || !data.items || data.items.length === 0) return null;
            let item = data.items[0];
            return normalizeSongForStorage({
                id: videoId,
                source: SONG_SOURCE_YOUTUBE,
                user,
                title: item.snippet.title,
                author: cleanAuthorName(item.snippet.channelTitle),
                duration: parseISO8601Duration(item.contentDetails.duration)
            });
        }

        async function fetchYoutubeSongByQuery(query, user = 'Streamer') {
            if (!checkApiSetup()) return null;
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=1&q=${encodeURIComponent(query)}&key=${API_KEY}`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();
            if (searchData.error || !searchData.items || searchData.items.length === 0) return null;
            const videoId = searchData.items[0].id && searchData.items[0].id.videoId;
            if (!videoId) return null;
            return fetchYoutubeSongById(videoId, user);
        }

        async function fallbackSpotifySongToYoutube(spotifySong, options = {}) {
            const query = [spotifySong.title, spotifySong.author].filter(Boolean).join(' ');
            const youtubeSong = await fetchYoutubeSongByQuery(query, spotifySong.user || 'Streamer');
            if (!youtubeSong) {
                if (spotifySong.user !== 'Streamer') sendChatMessage(t('msg_spotify_unavailable', { user: spotifySong.user }));
                return false;
            }
            youtubeSong.fallbackFromSpotify = true;
            youtubeSong.spotifyId = spotifySong.spotifyId || spotifySong.id || '';
            youtubeSong.spotifyUrl = spotifySong.spotifyUrl || '';
            youtubeSong.queueOrigin = getSongQueueOrigin(spotifySong, 'manual');
            if (options.playNow) {
                currentSongInfo = youtubeSong;
                playYoutubeSong(youtubeSong);
                renderQueue();
            } else {
                addSongFromChat(youtubeSong, !!options.force);
            }
            if (spotifySong.user !== 'Streamer') {
                sendChatMessage(t('msg_spotify_fallback', { user: spotifySong.user, title: spotifySong.title }));
            }
            return true;
        }

        function canTryNativeSpotifyPlayback() {
            return !!(SPOTIFY_ENABLED && SPOTIFY_CLIENT_ID && (spotifyAccessToken || spotifyRefreshToken));
        }

        async function resolveSpotifyRequestSong(payload) {
            const parsed = parseSpotifyUrl(payload.input || payload.spotifyUrl || payload.url || '');
            const trackId = payload.spotifyId || payload.id || (parsed && parsed.type === 'track' ? parsed.id : '');
            if (!trackId) return null;

            if (spotifyAccessToken || spotifyRefreshToken) {
                try {
                    return await fetchSpotifyTrackById(trackId, payload.user || 'Viewer');
                } catch (error) {
                    spotifyLastError = error.message || String(error);
                    renderSpotifyStatus('ui_spotify_status_error');
                }
            }

            const spotifyUrl = payload.spotifyUrl || (parsed && parsed.url) || ('https://open.spotify.com/track/' + trackId);
            try {
                return await fetchSpotifyOembedTrack(spotifyUrl, payload.user || 'Viewer');
            } catch (error) {
                return normalizeSongForStorage({
                    id: trackId,
                    source: SONG_SOURCE_SPOTIFY,
                    spotifyId: trackId,
                    spotifyUri: 'spotify:track:' + trackId,
                    spotifyUrl,
                    title: payload.title || 'Spotify Track',
                    author: payload.author || 'Spotify',
                    duration: payload.duration || 210,
                    user: payload.user || 'Viewer'
                });
            }
        }

        async function addSpotifyTrackRequest(payload, force = false) {
            if (!SPOTIFY_ENABLED) {
                if (payload.user !== 'Streamer') {
                    sendChatMessage(t('msg_spotify_disabled', { user: payload.user || 'Viewer' }));
                } else {
                    showToast(t('ui_spotify_disabled_short'), 'warn', 9000);
                }
                return;
            }
            const song = await resolveSpotifyRequestSong(payload);
            if (!song) {
                if (payload.user !== 'Streamer') sendChatMessage(t('msg_spotify_unavailable', { user: payload.user || 'Viewer' }));
                return;
            }

            if (!canTryNativeSpotifyPlayback()) {
                const fallbackDone = await fallbackSpotifySongToYoutube(song, { force });
                if (!fallbackDone && payload.user !== 'Streamer') {
                    sendChatMessage(t('msg_spotify_connect_required', { user: payload.user || 'Viewer' }));
                }
                return;
            }

            addSongFromChat(song, force);
        }

        function updateTutLink() {
            let hp = document.getElementById('tut-http-port').value.trim() || '7474';
            let folder = document.getElementById('tut-folder').value.trim() || 'betterSongRequest';
            let wp = document.getElementById('tut-ws-port').value.trim() || '8080';
            
            folder = folder.replace(/^\/+|\/+$/g, '');
            let finalFolder = folder ? `${folder}/` : '';
            
            let url = `http://localhost:${hp}/${finalFolder}index.html`;
            let a = document.getElementById('tut-final-link');
            if(a) { a.href = url; a.innerText = url; }

            let doneTextEl = document.getElementById('tut-done-text');
            let closeBtn = document.getElementById('tut-close-btn');
            
            if (window.location.protocol === 'file:') {
                if(doneTextEl) doneTextEl.innerHTML = t('ui_tut_done_file');
                if(closeBtn) closeBtn.style.display = 'none'; 
            } else {
                if(doneTextEl) doneTextEl.innerHTML = t('ui_tut_done_http');
                if(closeBtn) {
                    closeBtn.style.display = 'inline-block'; 
                    closeBtn.classList.add('btn-pulse');     
                }
            }
        }

        function openTutorial() { 
            updateTutLink(); 
            document.getElementById('tutorial-modal').style.display = 'flex'; 
        }
        
        function closeTutorial() {
            const currentWp = document.getElementById('tut-ws-port').value.trim();
            if(currentWp !== WS_PORT && !isNaN(currentWp)) {
                document.getElementById('ws-port-input').value = currentWp;
                saveWsConfig();
            }

            localStorage.setItem('ytm_tutorial_seen', 'true');
            document.getElementById('tutorial-modal').style.display = 'none';

            if (!API_KEY || API_KEY.trim() === '') openSettings();
        }

        function openChangelog() { document.getElementById('changelog-modal').style.display = 'flex'; }
        function closeChangelog() { document.getElementById('changelog-modal').style.display = 'none'; }

        function copySbCode() {
            const copyText = document.getElementById("sb-import-code");
            copyText.select();
            copyText.setSelectionRange(0, 99999); 
            const done = () => showToast(t('ui_copied_clipboard'), 'ok');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(copyText.value).then(done).catch(() => {
                    document.execCommand('copy');
                    done();
                });
            } else {
                document.execCommand('copy');
                done();
            }
        }

        let savedPlaylists = JSON.parse(localStorage.getItem('ytm_base_playlists')) || [];
        if (savedPlaylists.length === 0) {
            savedPlaylists = [{ id: 'PL9O6SbAVrliMxCJ-40pYLNZHXFYYZ5SiC', source: SONG_SOURCE_YOUTUBE, title: 'default_ytm' }];
            localStorage.setItem('ytm_base_playlists', JSON.stringify(savedPlaylists));
        } else {
            savedPlaylists = savedPlaylists.map(playlist => ({
                ...playlist,
                source: playlist.source === SONG_SOURCE_SPOTIFY ? SONG_SOURCE_SPOTIFY : SONG_SOURCE_YOUTUBE
            }));
        }

        async function addBasePlaylist() {
            const url = document.getElementById('base-playlist-url').value;
            const spotify = parseSpotifyUrl(url);
            if (spotify && spotify.type === 'playlist') {
                if (!SPOTIFY_ENABLED) {
                    showToast(t('ui_spotify_disabled_short'), 'warn', 9000);
                    openSettings();
                    return;
                }
                if (!spotifyAccessToken && !spotifyRefreshToken) {
                    showToast(t('ui_spotify_connect_required_short'), 'error', 9000);
                    openSettings();
                    return;
                }
                const pid = spotify.id;
                if (!savedPlaylists.some(p => p.id === pid && p.source === SONG_SOURCE_SPOTIFY)) {
                    document.getElementById('base-playlist-url').value = "...";
                    try {
                        const meta = await fetchSpotifyPlaylistMeta(pid);
                        savedPlaylists.push({ id: pid, source: SONG_SOURCE_SPOTIFY, title: meta.name || `Spotify: ${pid}` });
                        localStorage.setItem('ytm_base_playlists', JSON.stringify(savedPlaylists));
                        document.getElementById('base-playlist-url').value = "";
                        renderPlaylistManager();
                        fetchFullPlaylistFromAPI();
                    } catch (e) {
                        document.getElementById('base-playlist-url').value = "";
                        showToast(t('ui_spotify_playlist_error'), 'error', 9000);
                    }
                }
                return;
            }

            if (!checkApiSetup()) return;

            const match = url.match(/[?&]list=([^#\&\?]+)/);
            if (match && match[1]) {
                const pid = match[1];
                if (!savedPlaylists.some(p => p.id === pid && (p.source || SONG_SOURCE_YOUTUBE) === SONG_SOURCE_YOUTUBE)) {
                    document.getElementById('base-playlist-url').value = "...";
                    try {
                        let res = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${pid}&key=${API_KEY}`);
                        let data = await res.json();
                        
                        if(data.error) {
                             log(`⚠️ API Error: ${data.error.message}`, "error");
                             document.getElementById('base-playlist-url').value = "";
                             return;
                        }

                        let title = (data.items && data.items.length > 0) ? data.items[0].snippet.title : `Playlist: ${pid}`;
                        
                        savedPlaylists.push({ id: pid, source: SONG_SOURCE_YOUTUBE, title: title });
                        localStorage.setItem('ytm_base_playlists', JSON.stringify(savedPlaylists));
                        document.getElementById('base-playlist-url').value = "";
                        log(`📥 Added playlist: ${title}`);
                        
                        renderPlaylistManager(); 
                        fetchFullPlaylistFromAPI();
                    } catch (e) {
                        document.getElementById('base-playlist-url').value = "";
                    }
                }
            }
        }

        function removeBasePlaylist(index) {
            let removed = savedPlaylists.splice(index, 1)[0];
            localStorage.setItem('ytm_base_playlists', JSON.stringify(savedPlaylists));
            log(`🗑️ Removed playlist: ${removed.title}`, "warn");
            renderPlaylistManager();
            fetchFullPlaylistFromAPI(); 
        }

        function savePlaylistOrder() {
            localStorage.setItem('ytm_base_playlists', JSON.stringify(savedPlaylists));
        }

        function handlePlaylistDragStart(e) {
            playlistDragSourceIndex = parseInt(e.currentTarget.getAttribute('data-index'));
            e.currentTarget.style.opacity = '0.4';
        }

        function handlePlaylistDragOver(e) {
            e.preventDefault();
            e.currentTarget.style.borderTop = '3px solid var(--accent)';
        }

        function handlePlaylistDragLeave(e) {
            e.currentTarget.style.borderTop = '';
        }

        function handlePlaylistDrop(e) {
            e.preventDefault();
            e.currentTarget.style.borderTop = '';
            const targetIndexStr = e.currentTarget.getAttribute('data-index');
            const targetIndex = targetIndexStr ? parseInt(targetIndexStr) : 0;

            if (playlistDragSourceIndex !== null && playlistDragSourceIndex !== targetIndex) {
                const draggedPlaylist = savedPlaylists.splice(playlistDragSourceIndex, 1)[0];
                savedPlaylists.splice(targetIndex, 0, draggedPlaylist);
                savePlaylistOrder();
                log("Playlist order updated.", "normal");
                renderPlaylistManager();
                fetchFullPlaylistFromAPI();
                return;
            }

            renderPlaylistManager();
        }

        function handlePlaylistDragEnd(e) {
            playlistDragSourceIndex = null;
            renderPlaylistManager();
        }

        function openPlaylistManager() { renderPlaylistManager(); document.getElementById('playlist-modal').style.display = 'flex'; }
        function closePlaylistManager() { document.getElementById('playlist-modal').style.display = 'none'; }

        function renderPlaylistManager() {
            const container = document.getElementById('playlist-list-content');
            if(savedPlaylists.length === 0) {
                container.innerHTML = `<div class="ex-style-067">${t('ui_empty_playlists')}</div>`;
                return;
            }
            container.innerHTML = savedPlaylists.map((p, i) => {
                let displayTitle = (p.id === 'PL9O6SbAVrliMxCJ-40pYLNZHXFYYZ5SiC' && (p.title === 'default_ytm' || p.title.includes('Domyślna') || p.title.includes('Default'))) ? t('ui_default_playlist_name') : p.title;
                let source = normalizeSongSource(p.source);
                let sourceLabel = getSongSourceLabel(source);
                let sourceIcon = getSongSourceIcon(source);
                return `
                <div class="modal-item playlist-style" draggable="true" data-index="${i}" ondragstart="handlePlaylistDragStart(event)" ondragover="handlePlaylistDragOver(event)" ondragleave="handlePlaylistDragLeave(event)" ondrop="handlePlaylistDrop(event)" ondragend="handlePlaylistDragEnd(event)">
                    <div class="playlist-order-handle" aria-hidden="true">☰</div>
                    <div class="modal-item-title" title="${p.id}">🎵 ${escapeHtml(displayTitle)} <span class="badge badge-source badge-source-${source}" title="${escapeHtml(sourceLabel)}" aria-label="${escapeHtml(sourceLabel)}">${escapeHtml(sourceIcon)}</span></div>
                    <button class="btn-modal-action danger" draggable="false" onclick="removeBasePlaylist(${i})">${t('ui_remove')}</button>
                </div>
            `}).join('');
        }

        let bannedSongs = JSON.parse(localStorage.getItem('ytm_banned_songs')) || [];
        if (bannedSongs.length > 0 && typeof bannedSongs[0] === 'string') {
            bannedSongs = bannedSongs.map(id => ({ id: id, source: SONG_SOURCE_YOUTUBE, title: "Unknown (Banned earlier)" }));
            localStorage.setItem('ytm_banned_songs', JSON.stringify(bannedSongs));
        }

        function banCurrentSong() {
            if (!currentSongInfo) return;
            const songKey = getSongKey(currentSongInfo);
            if (!bannedSongs.some(b => getSongKey(b) === songKey)) {
                bannedSongs.push({ id: currentSongInfo.id, source: getSongSource(currentSongInfo), title: currentSongInfo.title }); 
                localStorage.setItem('ytm_banned_songs', JSON.stringify(bannedSongs)); 
                log(`🔨 Banned current: ${currentSongInfo.title}`, "warn");
                if (currentSongInfo.user !== "Streamer" && currentSongInfo.user !== "Auto") {
                    sendChatMessage(t('msg_ban_auto', {title: currentSongInfo.title}), getSongChatTarget(currentSongInfo));
                }
            }
            skipSong(); 
        }

        function banSong(index) {
            let song = playQueue[index];
            const songKey = getSongKey(song);
            if (!bannedSongs.some(b => getSongKey(b) === songKey)) {
                bannedSongs.push({ id: song.id, source: getSongSource(song), title: song.title }); 
                localStorage.setItem('ytm_banned_songs', JSON.stringify(bannedSongs)); 
                log(`🔨 Banned: ${song.title}`, "warn");
                if (song.user !== "Streamer" && song.user !== "Auto") {
                    sendChatMessage(t('msg_ban_rm', {title: song.title}), getSongChatTarget(song));
                }
            }
            removeSongFromUI(index);
        }

        function unbanSong(index) {
            let unbanned = bannedSongs.splice(index, 1)[0];
            localStorage.setItem('ytm_banned_songs', JSON.stringify(bannedSongs));
            log(`✅ Unbanned: ${unbanned.title}`, "normal");
            renderBanList(); 
        }

        function clearAllBans() {
            showConfirm(t('ui_clear_bans_confirm'), () => {
                bannedSongs = [];
                localStorage.removeItem('ytm_banned_songs');
                log("🧹 Blacklist cleared!", "warn");
                renderBanList();
            }, { okText: t('ui_clear_bans') });
        }

        function openBanList() { renderBanList(); document.getElementById('ban-modal').style.display = 'flex'; }
        function closeBanList() { document.getElementById('ban-modal').style.display = 'none'; }

        function renderBanList() {
            const container = document.getElementById('ban-list-content');
            if(bannedSongs.length === 0) {
                container.innerHTML = `<div class="ex-style-067">${t('ui_empty_bans')}</div>`;
                return;
            }
            container.innerHTML = bannedSongs.map((b, i) => `
                <div class="modal-item">
                    <div class="modal-item-title">${b.title}</div>
                    <button class="btn-modal-action" onclick="unbanSong(${i})">${t('ui_unban')}</button>
                </div>
            `).join('');
        }

        function cleanAuthorName(name) {
            if (!name) return "YouTube";
            return name.replace(/\s*-\s*Topic$/i, "").replace(/\s*-\s*temat$/i, "").trim();
        }

        function formatTime(totalSeconds) {
            if (!totalSeconds) return "0:00";
            let m = Math.floor(totalSeconds / 60);
            let s = totalSeconds % 60;
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        }

        function parseISO8601Duration(duration) {
            let match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (!match) return 210;
            let h = parseInt(match[1]) || 0;
            let m = parseInt(match[2]) || 0;
            let s = parseInt(match[3]) || 0;
            return (h * 3600) + (m * 60) + s;
        }

        function normalizeSongSource(source) {
            const value = String(source || '').trim().toLowerCase();
            return value === SONG_SOURCE_SPOTIFY ? SONG_SOURCE_SPOTIFY : SONG_SOURCE_YOUTUBE;
        }

        function getSongSource(song) {
            return normalizeSongSource(song && (song.source || song.platform || song.provider));
        }

        function getSongIdentityId(song) {
            if (!song) return '';
            const source = getSongSource(song);
            if (source === SONG_SOURCE_SPOTIFY) return String(song.spotifyId || song.id || '').trim();
            return String(song.youtubeId || song.id || '').trim();
        }

        function getSongKeyFromParts(source, id) {
            const normalizedSource = normalizeSongSource(source);
            const cleanId = String(id || '').trim();
            return cleanId ? normalizedSource + ':' + cleanId : '';
        }

        function getSongKey(songOrId, source = SONG_SOURCE_YOUTUBE) {
            if (songOrId && typeof songOrId === 'object') return getSongKeyFromParts(getSongSource(songOrId), getSongIdentityId(songOrId));
            const value = String(songOrId || '').trim();
            if (!value) return '';
            const prefixed = value.match(/^(youtube|spotify|yt):(.+)$/i);
            if (prefixed) return getSongKeyFromParts(prefixed[1] === 'yt' ? SONG_SOURCE_YOUTUBE : prefixed[1], prefixed[2]);
            return getSongKeyFromParts(source, value);
        }

        function getSongSourceLabel(songOrSource) {
            const source = typeof songOrSource === 'string' ? normalizeSongSource(songOrSource) : getSongSource(songOrSource);
            return source === SONG_SOURCE_SPOTIFY ? 'Spotify' : 'YouTube';
        }

        function getSongSourceIcon(songOrSource) {
            const source = typeof songOrSource === 'string' ? normalizeSongSource(songOrSource) : getSongSource(songOrSource);
            return source === SONG_SOURCE_SPOTIFY ? '\u266A' : '\u25B6';
        }

        function getSongRequesterLabel(songOrUser) {
            const rawUser = songOrUser && typeof songOrUser === 'object' ? songOrUser.user : songOrUser;
            const user = String(rawUser || 'Viewer').trim();
            if (!user || user === 'Auto') return '\u{1F916} Auto';
            return '\u{1F464} ' + user;
        }

        function getSongRequesterHtml(songOrUser) {
            return escapeHtml(getSongRequesterLabel(songOrUser));
        }

        function setNowPlayingMeta(songOrUser) {
            const metaEl = document.getElementById('now-playing-meta');
            if (metaEl) metaEl.innerText = getSongRequesterLabel(songOrUser);
        }

        var nowPlayingTitleFitFrame = null;
        var nowPlayingTitleResizeObserver = null;

        function fitNowPlayingTitle() {
            const titleEl = document.getElementById('now-playing-title');
            if (!titleEl) return;

            titleEl.style.fontSize = '';
            const computed = window.getComputedStyle(titleEl);
            let size = parseFloat(computed.fontSize) || 18;
            const minSize = 10;
            titleEl.style.fontSize = size + 'px';

            let guard = 0;
            while (titleEl.scrollWidth > titleEl.clientWidth && size > minSize && guard < 32) {
                size -= 0.5;
                titleEl.style.fontSize = size + 'px';
                guard += 1;
            }
        }

        function scheduleNowPlayingTitleFit() {
            if (nowPlayingTitleFitFrame) cancelAnimationFrame(nowPlayingTitleFitFrame);
            nowPlayingTitleFitFrame = requestAnimationFrame(() => {
                nowPlayingTitleFitFrame = null;
                fitNowPlayingTitle();
            });
        }

        function setupNowPlayingTitleAutoFit() {
            const titleEl = document.getElementById('now-playing-title');
            if (!titleEl || titleEl.dataset.autofitBound === '1') return;
            titleEl.dataset.autofitBound = '1';

            new MutationObserver(scheduleNowPlayingTitleFit).observe(titleEl, {
                childList: true,
                characterData: true,
                subtree: true
            });

            if (typeof ResizeObserver !== 'undefined') {
                nowPlayingTitleResizeObserver = new ResizeObserver(scheduleNowPlayingTitleFit);
                nowPlayingTitleResizeObserver.observe(titleEl);
            }
            window.addEventListener('resize', scheduleNowPlayingTitleFit);
            scheduleNowPlayingTitleFit();
        }

        function getSongChatSource(song) {
            const chatTarget = getSongChatTarget(song);
            return chatTarget ? normalizeChatSource(chatTarget.chatSource, '') : '';
        }

        function getSongChatSourceClass(song) {
            const chatSource = getSongChatSource(song);
            return chatSource ? ` chat-source-${chatSource}` : '';
        }

        function getYoutubeThumbnail(id, quality = 'default') {
            const videoId = String(id || '').trim();
            if (!videoId) return '';
            return 'https://i.ytimg.com/vi/' + encodeURIComponent(videoId) + '/' + quality + '.jpg';
        }

        function getSongThumbnail(song, quality = 'default') {
            if (!song) return '';
            if (getSongSource(song) === SONG_SOURCE_SPOTIFY) return song.thumbnail || FALLBACK_COVER_IMAGE;
            return song.thumbnail || getYoutubeThumbnail(getSongIdentityId(song), quality) || FALLBACK_COVER_IMAGE;
        }

        function getSongLink(song) {
            if (!song) return '';
            if (getSongSource(song) === SONG_SOURCE_SPOTIFY) {
                return song.spotifyUrl || ('https://open.spotify.com/track/' + encodeURIComponent(getSongIdentityId(song)));
            }
            return 'https://youtu.be/' + encodeURIComponent(getSongIdentityId(song));
        }

        function jsString(value) {
            return JSON.stringify(String(value || ''));
        }

        function cacheSongInfo(song) {
            const normalized = normalizeSongForStorage(song);
            if (!normalized) return '';
            const key = getSongKey(normalized);
            titleCache[key] = normalized;
            if (getSongSource(normalized) === SONG_SOURCE_YOUTUBE) titleCache[normalized.id] = normalized;
            return key;
        }

        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>\"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char]));
        }

        const coverThemeCache = new Map();

        function normalizeCoverThemeColor(color) {
            const luma = (color.r * 0.2126) + (color.g * 0.7152) + (color.b * 0.0722);
            let mixTarget = null;
            let mixAmount = 0;

            if (luma < 58) {
                mixTarget = { r: 125, g: 135, b: 145 };
                mixAmount = 0.38;
            } else if (luma > 178) {
                mixTarget = { r: 64, g: 68, b: 74 };
                mixAmount = 0.42;
            }

            if (!mixTarget) return color;
            return {
                r: Math.round(color.r * (1 - mixAmount) + mixTarget.r * mixAmount),
                g: Math.round(color.g * (1 - mixAmount) + mixTarget.g * mixAmount),
                b: Math.round(color.b * (1 - mixAmount) + mixTarget.b * mixAmount)
            };
        }

        function readAverageCoverColor(src) {
            if (!src) return Promise.reject(new Error('No cover source'));
            if (coverThemeCache.has(src)) return Promise.resolve(coverThemeCache.get(src));

            return new Promise((resolve, reject) => {
                const image = new Image();
                image.crossOrigin = 'anonymous';
                image.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const size = 24;
                        canvas.width = size;
                        canvas.height = size;
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        ctx.drawImage(image, 0, 0, size, size);

                        const data = ctx.getImageData(0, 0, size, size).data;
                        let r = 0;
                        let g = 0;
                        let b = 0;
                        let count = 0;

                        for (let i = 0; i < data.length; i += 4) {
                            if (data[i + 3] < 32) continue;
                            r += data[i];
                            g += data[i + 1];
                            b += data[i + 2];
                            count += 1;
                        }

                        if (!count) throw new Error('No readable cover pixels');
                        const color = normalizeCoverThemeColor({
                            r: Math.round(r / count),
                            g: Math.round(g / count),
                            b: Math.round(b / count)
                        });
                        coverThemeCache.set(src, color);
                        resolve(color);
                    } catch (error) {
                        reject(error);
                    }
                };
                image.onerror = reject;
                image.src = src;
            });
        }

        function applyCoverThemeToNowPlayingCard(card, src) {
            if (!card) return;
            if (!src) {
                card.style.removeProperty('--np-cover-image');
                return;
            }
            card.dataset.coverThemeSrc = src;
            card.dataset.coverTheme = 'loading';
            card.style.setProperty('--np-cover-image', 'url(' + JSON.stringify(String(src)) + ')');

            readAverageCoverColor(src).then(color => {
                if (card.dataset.coverThemeSrc !== src) return;
                const luma = (color.r * 0.2126) + (color.g * 0.7152) + (color.b * 0.0722);
                card.style.setProperty('--np-cover-rgb', color.r + ', ' + color.g + ', ' + color.b);
                card.style.setProperty('--np-cover-contrast-rgb', luma > 145 ? '18, 21, 22' : '255, 244, 221');
                card.dataset.coverTheme = 'ready';
            }).catch(() => {
                if (card.dataset.coverThemeSrc === src) card.dataset.coverTheme = 'image';
            });
        }

        function getNowPlayingWaveBarHeight(index) {
            const height = 55 + Math.sin(index * 0.83) * 11 + Math.sin(index * 1.71 + 0.9) * 8 + Math.sin(index * 0.29 + 2.4) * 6;
            return Math.round(Math.min(78, Math.max(34, height)));
        }

        function getNowPlayingWaveBarCount(width) {
            if (!width) return 28;
            return Math.min(96, Math.max(18, Math.round(width / 9)));
        }

        function createNowPlayingWaveBars(count = 28) {
            return Array.from({ length: count }, (_, index) => {
                const height = getNowPlayingWaveBarHeight(index);
                const stagger = (index * 0.026).toFixed(3);
                const skipStagger = ((((index * 37) % 29) * 0.006) + (((index * 11) % 5) * 0.002)).toFixed(3);
                const skipX = ((index % 2 ? -1 : 1) * (4 + (index % 4))).toFixed(1) + 'px';
                const skipXAlt = ((index % 2 ? 1 : -1) * (3 + (index % 5))).toFixed(1) + 'px';
                const skipXSoft = ((index % 2 ? -1 : 1) * (1.5 + (index % 3))).toFixed(1) + 'px';
                const duration = (2.45 + ((index * 7) % 11) * 0.09).toFixed(2);
                return '<i style="--bar-height: ' + height + '%; --bar-stagger: ' + stagger + 's; --bar-skip-stagger: ' + skipStagger + 's; --bar-skip-x: ' + skipX + '; --bar-skip-x-alt: ' + skipXAlt + '; --bar-skip-x-soft: ' + skipXSoft + '; --bar-duration: ' + duration + 's"></i>';
            }).join('');
        }

        function seededNowPlayingRandom(seed, index, salt = 0) {
            const numericSeed = Number(seed) || 1;
            const value = Math.sin((numericSeed * 12.9898) + (index * 78.233) + (salt * 37.719)) * 43758.5453;
            return value - Math.floor(value);
        }

        function randomizeNowPlayingSkipBars(waveEl, seed) {
            if (!waveEl) return;
            const bars = Array.from(waveEl.querySelectorAll('i'));
            const ordered = bars
                .map((bar, index) => ({ bar, index, order: seededNowPlayingRandom(seed, index, 1) }))
                .sort((a, b) => a.order - b.order);

            ordered.forEach(({ bar, index }, rank) => {
                const jitter = seededNowPlayingRandom(seed, index, 2);
                const direction = seededNowPlayingRandom(seed, index, 3) > 0.5 ? 1 : -1;
                const strength = 4 + Math.round(seededNowPlayingRandom(seed, index, 4) * 5);
                const reverseStrength = 3 + Math.round(seededNowPlayingRandom(seed, index, 5) * 4);

                bar.style.setProperty('--bar-skip-stagger', (rank * 0.0019 + jitter * 0.014).toFixed(3) + 's');
                bar.style.setProperty('--bar-skip-x', (direction * strength).toFixed(1) + 'px');
                bar.style.setProperty('--bar-skip-x-alt', (-direction * reverseStrength).toFixed(1) + 'px');
                bar.style.setProperty('--bar-skip-x-soft', (direction * strength * 0.35).toFixed(1) + 'px');
            });
        }

        function syncNowPlayingWaveBars(waveEl) {
            if (!waveEl) return;
            const width = waveEl.clientWidth || waveEl.getBoundingClientRect().width;
            const count = getNowPlayingWaveBarCount(width);
            if (waveEl.dataset.barCount !== String(count)) {
                waveEl.innerHTML = createNowPlayingWaveBars(count);
                waveEl.dataset.barCount = String(count);
            }
        }

        function renderNowPlayingCard(song, options = {}) {
            const prefix = options.prefix || 'now-playing';
            const dropAttrs = options.dropTarget ? 'ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)"' : '';
            const banButton = options.showBan ? '<button class="np-card-ban" onclick="banCurrentSong()" title="Ban">&#128296;</button>' : '';
            const favoriteButton = options.showFavorite ? renderFavoriteButton(song, 'data-favorite-action="current"').replace('btn-favorite', 'btn-favorite np-card-favorite') : '';
            const title = escapeHtml(song.title || 'Unknown Title');
            const author = escapeHtml(cleanAuthorName(song.author || 'YouTube'));
            const user = getSongRequesterHtml(song);
            const thumbnail = escapeHtml(getSongThumbnail(song, 'mqdefault'));
            const source = getSongSource(song);
            const sourceLabel = escapeHtml(getSongSourceLabel(song));
            const sourceIcon = escapeHtml(getSongSourceIcon(song));
            const chatSourceClass = getSongChatSourceClass(song);
            const requesterClass = String(song.user || 'Auto') === 'Auto' ? ' requester-auto' : '';

            return '<div id="' + prefix + '-card" class="now-playing-card ' + (options.className || '') + chatSourceClass + '" ' + dropAttrs + '>' +
                '<img class="np-card-cover" data-widget-element="cover" src="' + thumbnail + '" alt="">' +
                '<div class="np-card-info-bg" data-widget-element="infoBackground" aria-hidden="true"></div>' +
                '<div class="np-card-meter-bg" data-widget-element="meterBackground" aria-hidden="true"></div>' +
                '<div class="np-card-main">' +
                    '<div class="np-card-info">' +
                        '<div class="np-card-title" data-widget-element="title" title="' + title + '">' + title + '</div>' +
                        '<div class="np-card-author" data-widget-element="author" title="' + author + '">' + author + '</div>' +
                    '</div>' +
                    '<div class="np-card-meter">' +
                        '<span id="' + prefix + '-current" class="np-card-time" data-widget-element="currentTime">0:00</span>' +
                        '<div id="' + prefix + '-wave" class="np-card-wave" data-widget-element="waveform" aria-hidden="true">' + createNowPlayingWaveBars() + '</div>' +
                        '<span id="' + prefix + '-duration" class="np-card-time" data-widget-element="duration">' + formatTime(song.duration || 0) + '</span>' +
                    '</div>' +
                '</div>' +
                '<span class="np-card-source badge-source-' + source + '" title="' + sourceLabel + '" aria-label="' + sourceLabel + '">' + sourceIcon + '</span>' +
                '<span class="np-card-user' + requesterClass + '" data-widget-element="requester">' + user + '</span>' +
                favoriteButton +
                banButton +
                '<div class="np-card-progress" data-widget-element="progress"><div id="' + prefix + '-progress" class="np-card-progress-fill"></div></div>' +
            '</div>';
        }

        function getNowPlayingWidgetState(options = {}) {
            if (!options.ignoreWidgetTestState && widgetTestState) {
                if (Date.now() < widgetTestStateUntil) {
                    return { ...widgetTestState, srEnabled: isSrEnabled, updatedAt: Date.now() };
                }
                widgetTestState = null;
            }

            if (!currentSongInfo || currentSongStopped) {
                return { type: 'NOW_PLAYING_STATE', hasSong: false, currentTime: 0, duration: 0, progress: 0, srEnabled: isSrEnabled, isPlaying: false, isStopped: !!currentSongStopped, waveHold: false, updatedAt: Date.now() };
            }

            const playback = getActivePlaybackState();
            const duration = playback.duration > 0 ? playback.duration : (currentSongInfo.duration || 0);
            const rawCurrentTime = Math.max(0, playback.currentTime || 0);
            const currentTime = Math.floor(rawCurrentTime);
            const playerState = playback.playerState;
            const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
            const activeWaveEffect = nowPlayingWaveEffectUntil > Date.now() ? nowPlayingWaveEffect : '';
            const waveEnding = playback.isPlaying && duration > 0 && (duration - rawCurrentTime) <= 1.8;

            return {
                type: 'NOW_PLAYING_STATE',
                hasSong: true,
                id: currentSongInfo.id,
                source: getSongSource(currentSongInfo),
                sourceLabel: getSongSourceLabel(currentSongInfo),
                link: getSongLink(currentSongInfo),
                title: currentSongInfo.title || 'Unknown Title',
                author: cleanAuthorName(currentSongInfo.author || 'YouTube'),
                user: currentSongInfo.user || 'Auto',
                thumbnail: getSongThumbnail(currentSongInfo, 'mqdefault'),
                currentTime,
                duration,
                progress,
                srEnabled: isSrEnabled,
                isPlaying: playback.isPlaying,
                waveEnding,
                waveEffect: activeWaveEffect,
                waveEffectId: activeWaveEffect ? nowPlayingWaveEffectId : 0,
                waveHold: nowPlayingWaveHoldUntilStart && activeWaveEffect !== 'skip',
                isStopped: false,
                playerState,
                updatedAt: Date.now()
            };
        }

        function updateNowPlayingCardProgress(prefix, state) {
            const card = document.getElementById(prefix + '-card');
            const currentEl = document.getElementById(prefix + '-current');
            const durationEl = document.getElementById(prefix + '-duration');
            const progressEl = document.getElementById(prefix + '-progress');
            const waveEl = document.getElementById(prefix + '-wave');
            const isSkipEffect = state.waveEffect === 'skip';
            const isFadeEffect = state.waveEffect === 'fade';
            const isWaveHeld = !!state.waveHold && !isSkipEffect;

            if (currentEl) currentEl.innerText = formatTime(state.currentTime || 0);
            if (durationEl) durationEl.innerText = formatTime(state.duration || 0);
            if (progressEl) progressEl.style.width = (state.progress || 0) + '%';
            if (waveEl) {
                waveEl.style.setProperty('--np-progress', (state.progress || 0) + '%');
                syncNowPlayingWaveBars(waveEl);
            }
            if (card) {
                const skipEffectId = String(state.waveEffectId || (isSkipEffect ? state.updatedAt || Date.now() : ''));
                if (isSkipEffect && card.dataset.skipEffectId !== skipEffectId) {
                    card.dataset.skipEffectId = skipEffectId;
                    randomizeNowPlayingSkipBars(waveEl, skipEffectId);
                    card.classList.remove('is-skipping');
                    void card.offsetWidth;
                } else if (!isSkipEffect) {
                    card.dataset.skipEffectId = '';
                }

                card.classList.toggle('is-playing', !!state.isPlaying && !state.waveEnding && !isSkipEffect && !isFadeEffect && !isWaveHeld);
                card.classList.toggle('is-wave-ending', !!state.waveEnding);
                card.classList.toggle('is-skipping', isSkipEffect);
                card.classList.toggle('is-wave-fading', isFadeEffect);
                card.classList.toggle('is-wave-held', isWaveHeld);
            }
        }

        function publishNowPlayingWidgetStateToStreamerBot(state, force = false) {
            if (!canUseStreamerBotWebsocket()) return;
            const now = Date.now();
            if (!force && now - lastNowPlayingStreamerBotPush < NOW_PLAYING_STREAMERBOT_PUSH_INTERVAL) return;
            lastNowPlayingStreamerBotPush = now;

            try {
                ws.send(JSON.stringify({
                    request: 'DoAction',
                    action: { name: NOW_PLAYING_STREAMERBOT_ACTION },
                    args: { stateJson: JSON.stringify(state) },
                    id: 'NowPlayingWidgetState'
                }));
            } catch (error) {}
        }

        function publishNowPlayingWidgetState(state = getNowPlayingWidgetState(), forceStreamerBot = false) {
            const stateHasLayout = Object.prototype.hasOwnProperty.call(state, 'widgetLayout');
            const publishedState = {
                ...state,
                widgetLayout: stateHasLayout ? normalizeWidgetLayoutConfig(state.widgetLayout) : WIDGET_LAYOUT_CONFIG,
                widgetLayoutRevision: WIDGET_LAYOUT_REVISION
            };
            try {
                localStorage.setItem(NOW_PLAYING_WIDGET_KEY, JSON.stringify(publishedState));
            } catch (error) {}

            if (nowPlayingWidgetChannel) {
                try { nowPlayingWidgetChannel.postMessage(publishedState); } catch (error) {}
            }

            publishNowPlayingWidgetStateToStreamerBot(publishedState, forceStreamerBot);
        }

        function publishNowPlayingWidgetStartupBurst() {
            nowPlayingWidgetStartupBurstTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            nowPlayingWidgetStartupBurstTimeouts = [0, 350, 1200, 3000].map(delay => setTimeout(() => {
                publishNowPlayingWidgetState(getActiveWidgetPublishState(), true);
            }, delay));
        }

        function updateNowPlayingProgress() {
            const state = getNowPlayingWidgetState({ ignoreWidgetTestState: true });
            updateNowPlayingCardProgress('panel-now-playing', state);
            publishNowPlayingWidgetState(getActiveWidgetPublishState());
        }

        function triggerNowPlayingWaveEffect(effect, durationMs = 520) {
            nowPlayingWaveEffect = effect;
            nowPlayingWaveEffectUntil = Date.now() + durationMs;
            nowPlayingWaveEffectId = (nowPlayingWaveEffectId + 1) % 1000000;
            const state = getNowPlayingWidgetState({ ignoreWidgetTestState: true });
            updateNowPlayingCardProgress('panel-now-playing', state);
            publishNowPlayingWidgetState(getActiveWidgetPublishState(), true);
        }

        function clearNowPlayingWaveEffect() {
            nowPlayingWaveEffect = '';
            nowPlayingWaveEffectUntil = 0;
        }

        function stopCurrentSongWithWave() {
            clearTimeout(stopTransitionTimeout);
            resetVoteSkipVotes();
            nowPlayingWaveHoldUntilStart = false;
            triggerNowPlayingWaveEffect('fade', 900);
            stopActivePlayback().catch(() => {});
            document.getElementById('now-playing-title').innerText = t('ui_stop_state');

            stopTransitionTimeout = setTimeout(() => {
                currentSongStopped = true;
                clearNowPlayingWaveEffect();
                stopTransitionTimeout = null;
                publishNowPlayingWidgetState(getNowPlayingWidgetState(), true);
            }, 760);
        }

        function log(msg, type='normal') {
            const c = document.getElementById('log-content');
            const levelClass = type === 'error' ? 'log-error' : (type === 'warn' ? 'log-warn' : 'log-normal');
            c.innerHTML += `<div class="log-entry ${levelClass}">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
            document.getElementById('debug-console').scrollTop = document.getElementById('debug-console').scrollHeight;
        }

        function toggleDebug() {
            const consoleEl = document.getElementById('debug-console');
            const topSection = document.getElementById('app-top-section');
            
            if (consoleEl.style.display === 'block') {
                consoleEl.style.display = 'none';
                topSection.classList.remove('debug-open');
            } else {
                consoleEl.style.display = 'block';
                topSection.classList.add('debug-open');
                consoleEl.scrollTop = consoleEl.scrollHeight;
            }
        }

        function handleSrRememberStateToggle() {
            const rememberInput = document.getElementById('sr-remember-state-cb');
            SHOULD_REMEMBER_SR_STATE = !!(rememberInput && rememberInput.checked);
            localStorage.setItem(SR_REMEMBER_STATE_STORAGE_KEY, SHOULD_REMEMBER_SR_STATE ? 'true' : 'false');

            if (SHOULD_REMEMBER_SR_STATE) {
                localStorage.setItem(SR_ENABLED_STORAGE_KEY, isSrEnabled ? 'true' : 'false');
            } else {
                localStorage.removeItem(SR_ENABLED_STORAGE_KEY);
            }
        }

        function toggleSR(skipMsg = false) {
            isSrEnabled = document.getElementById('sr-toggle-cb').checked;
            if (SHOULD_REMEMBER_SR_STATE) {
                localStorage.setItem(SR_ENABLED_STORAGE_KEY, isSrEnabled ? 'true' : 'false');
            }
            const textEl = document.getElementById('sr-status-text');
            if (isSrEnabled) {
                textEl.innerText = " !SR ON";
                textEl.style.color = "#00ff88";
                textEl.style.textShadow = "0 0 10px rgba(0,255,136,0.5)";
                if(!skipMsg) sendChatMessage(t('msg_sr_on'));
            } else {
                textEl.innerText = " !SR OFF";
                textEl.style.color = "var(--red)";
                textEl.style.textShadow = "0 0 5px rgba(0,0,0,0.5)";
                if(!skipMsg) sendChatMessage(t('msg_sr_off'));
            }
            if(!skipMsg) log(`SR Toggle: ${isSrEnabled}`, "warn");
            syncSongRequestSettingsToStreamerBot();
            publishNowPlayingWidgetState(getActiveWidgetPublishState(), true);
        }

        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);

        function onYouTubeIframeAPIReady() {
            log("YT Player init...");
            player = new YT.Player('player', {
                height: '100%', width: '100%', 
                playerVars: { 'enablejsapi': 1, 'controls': 1, 'origin': window.location.origin },
                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange, 'onError': onPlayerError }
            });
        }

        function onPlayerError(e) {
            log(`⚠️ YT Error (${e.data}). Skip in 3s...`, "error");
            document.getElementById('now-playing-title').innerText = t('ui_error_skip');
            
            setTimeout(() => {
                if (currentSongInfo && currentSongInfo.user !== "Auto") sendChatMessage(t('msg_bot_blocked', {user: currentSongInfo.user}), getSongChatTarget(currentSongInfo));
                playNext();
            }, 3000);
        }

        function rememberPlayerVolume(value) {
            const normalized = Math.round(Math.min(100, Math.max(0, Number(value) || 0)));
            PLAYER_VOLUME = normalized;
            localStorage.setItem(PLAYER_VOLUME_STORAGE_KEY, String(normalized));
            renderSpotifyVolumeControl();
            return normalized;
        }

        function renderSpotifyVolumeControl() {
            const slider = document.getElementById('spotify-player-volume-input');
            const output = document.getElementById('spotify-player-volume-output');
            const volume = PLAYER_VOLUME === null ? 80 : PLAYER_VOLUME;
            if (slider && Number(slider.value) !== volume) slider.value = String(volume);
            if (slider) slider.setAttribute('aria-label', t('ui_spotify_volume'));
            if (output) output.value = `${volume}%`;
        }

        async function setSpotifyGuiVolume() {
            const slider = document.getElementById('spotify-player-volume-input');
            if (!slider) return;
            const volume = rememberPlayerVolume(slider.value);
            if (spotifyPlayer && spotifyPlayer.setVolume) {
                try { await spotifyPlayer.setVolume(volume / 100); } catch (error) {}
            }
        }

        function applyStoredPlayerVolume() {
            if (PLAYER_VOLUME === null || !player || !player.setVolume) return;
            player.setVolume(PLAYER_VOLUME);
        }

        async function syncPlayerVolumePreference() {
            if (playerVolumeSyncPending) return;
            playerVolumeSyncPending = true;
            try {
                let observedVolume = null;
                if (currentSongInfo && isSpotifySong(currentSongInfo) && spotifyPlayer && spotifyPlayer.getVolume) {
                    observedVolume = Math.round((await spotifyPlayer.getVolume()) * 100);
                } else if (player && player.getVolume) {
                    observedVolume = Math.round(player.getVolume());
                }
                if (Number.isFinite(observedVolume) && (PLAYER_VOLUME === null || observedVolume !== PLAYER_VOLUME)) {
                    rememberPlayerVolume(observedVolume);
                }
            } catch (error) {
            } finally {
                playerVolumeSyncPending = false;
            }
        }

        async function onPlayerReady() {
            ensureWebsocketConnection();
            applyStoredPlayerVolume();
            const restoredQueue = restorePersistedQueue();
            queuePersistenceReady = true;
            if (!restoredQueue) await loadInitialPlayerSong();
            
            if (!localStorage.getItem('ytm_tutorial_seen')) {
                openTutorial();
            } else {
                if (!API_KEY || API_KEY.trim() === '') {
                    updateApiStatusUI('error');
                    setBaseActionButtonMode('api-required');
                    fetchFullPlaylistFromAPI();
                    return;
                }
                let isValid = await verifyApiKey(API_KEY);
                if(isValid) fetchFullPlaylistFromAPI();
                else {
                    log("⚠️ API Key error.", "error");
                    setBaseActionButtonMode('error');
                    openSettings();
                }
            }
        }

        function cueStartupSong(song) {
            if (!song || !player || initialSongLoaded || currentSongInfo) return;
            initialSongLoaded = true;
            currentSongInfo = normalizeSongForStorage({ ...song, user: 'Auto', isStartup: true });
            currentSongStopped = false;
            resetVoteSkipVotes();
            currentSongInfo.isStartup = true;
            renderPlayerSurface(currentSongInfo);
            player.cueVideoById(currentSongInfo.id);
            document.getElementById('now-playing-title').innerText = currentSongInfo.title;
            setNowPlayingMeta(currentSongInfo);
            renderQueue();
        }

        function getStartupSongFromHoliday() {
            return activeHolidayVariant ? activeHolidayVariant.song : null;
        }

        async function fetchMostPopularStartupSong() {
            if (!API_KEY) return null;
            try {
                const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&chart=mostPopular&videoCategoryId=10&maxResults=25&key=${API_KEY}`;
                const response = await fetch(url);
                const data = await response.json();
                if (!data.items || data.items.length === 0) return null;
                const pick = data.items[Math.floor(Math.random() * data.items.length)];
                return {
                    id: pick.id,
                    title: pick.snippet.title,
                    author: cleanAuthorName(pick.snippet.channelTitle),
                    duration: parseISO8601Duration(pick.contentDetails.duration),
                    user: 'Auto'
                };
            } catch (error) {
                return null;
            }
        }

        async function loadInitialPlayerSong() {
            if (initialSongLoaded || currentSongInfo) return;
            const holidaySong = getStartupSongFromHoliday();
            if (holidaySong) {
                cueStartupSong(holidaySong);
                return;
            }
            const popularSong = await fetchMostPopularStartupSong();
            if (popularSong) {
                cueStartupSong(popularSong);
                return;
            }
            cueStartupSong(DEFAULT_STARTUP_SONGS[Math.floor(Math.random() * DEFAULT_STARTUP_SONGS.length)]);
        }

        function isSpotifySong(song) {
            return getSongSource(song) === SONG_SOURCE_SPOTIFY;
        }

        function renderPlayerSurface(song) {
            const spotifyView = document.getElementById('spotify-player-view');
            const youtubeView = document.getElementById('player');
            if (!spotifyView || !youtubeView) return;

            const useSpotify = !!(song && isSpotifySong(song));
            spotifyView.classList.toggle('is-hidden', !useSpotify);
            youtubeView.classList.toggle('is-hidden', useSpotify);
            renderSpotifyVolumeControl();

            if (useSpotify) {
                const cover = document.getElementById('spotify-player-cover');
                const title = document.getElementById('spotify-player-title');
                const author = document.getElementById('spotify-player-author');
                if (cover) cover.src = getSongThumbnail(song, 'mqdefault');
                if (title) title.innerText = song.title || 'Spotify';
                if (author) author.innerText = cleanAuthorName(song.author || 'Spotify');
            }
        }

        function playYoutubeSong(song) {
            clearSpotifyPlaybackMonitor();
            stopSpotifyPlayback().catch(() => {});
            renderPlayerSurface(song);
            if (!player || !player.loadVideoById) return;
            if (PLAYER_VOLUME !== null && player.setVolume) player.setVolume(PLAYER_VOLUME);
            currentSongStopped = false;
            player.loadVideoById(getSongIdentityId(song));
        }

        async function playCurrentSong(song) {
            if (!song) return;
            if (isSpotifySong(song)) {
                if (canTryNativeSpotifyPlayback()) {
                    try {
                        await playSpotifySong(song);
                        return;
                    } catch (error) {
                        spotifyLastError = error.message || String(error);
                        renderSpotifyStatus('ui_spotify_status_error');
                    }
                }

                const fallbackDone = await fallbackSpotifySongToYoutube(song, { playNow: true });
                if (!fallbackDone) playNext(playQueue.length === 0 ? 'shuffle' : basePlaybackMode);
                return;
            }

            playYoutubeSong(song);
        }

        function getActivePlaybackState() {
            if (currentSongInfo && isSpotifySong(currentSongInfo)) return getSpotifyPlaybackTiming();
            const playerState = player && player.getPlayerState ? player.getPlayerState() : 0;
            return {
                duration: player && player.getDuration ? Math.floor(player.getDuration()) : (currentSongInfo ? currentSongInfo.duration || 0 : 0),
                currentTime: player && player.getCurrentTime ? Math.floor(Math.max(0, player.getCurrentTime())) : 0,
                isPlaying: playerState === 1,
                playerState
            };
        }

        function isActivePlaybackPlaying() {
            return getActivePlaybackState().isPlaying;
        }

        async function pauseActivePlayback() {
            if (currentSongInfo && isSpotifySong(currentSongInfo)) await pauseSpotifyPlayback();
            else if (player && player.pauseVideo) player.pauseVideo();
        }

        async function resumeActivePlayback() {
            if (currentSongInfo && isSpotifySong(currentSongInfo)) {
                const spotifySong = currentSongInfo;
                try {
                    await resumeSpotifyPlayback(spotifySong);
                } catch (error) {
                    spotifyLastError = error.message || String(error);
                    renderSpotifyStatus('ui_spotify_status_error');
                    const fallbackDone = await fallbackSpotifySongToYoutube(spotifySong, { playNow: true });
                    if (!fallbackDone) {
                        showToast(t('ui_spotify_auth_failed', { error: spotifyLastError }), 'error', 9000);
                    }
                }
            } else if (player && player.playVideo) {
                player.playVideo();
            }
        }

        async function stopActivePlayback() {
            if (currentSongInfo && isSpotifySong(currentSongInfo)) await stopSpotifyPlayback();
            else if (player && player.stopVideo) player.stopVideo();
        }

        async function seekActivePlayback(seconds) {
            if (currentSongInfo && isSpotifySong(currentSongInfo)) {
                if (spotifyPlayer && spotifyPlayer.seek) {
                    try { await spotifyPlayer.seek(Math.max(0, seconds) * 1000); } catch (error) {}
                }
            } else if (player && player.seekTo) {
                player.seekTo(Math.max(0, seconds));
            }
        }

        async function fetchFullPlaylistFromAPI() {
            if(savedPlaylists.length === 0) {
                document.getElementById('base-list').innerHTML = `<div class="ex-style-068">${t('ui_empty_playlists')}</div>`;
                updateBaseCount();
                setBaseActionButtonMode(favoriteSongs.length > 0 ? 'ready' : 'empty');
                return;
            }

            setBaseActionButtonMode('downloading');
            masterList = []; titleCache = {};
            hydrateFavoriteTitleCache();

            try {
                for(let pObj of savedPlaylists) {
                    const playlistSource = normalizeSongSource(pObj.source);
                    if (playlistSource === SONG_SOURCE_SPOTIFY) {
                        if (!SPOTIFY_ENABLED) continue;
                        try {
                            const spotifySongs = await fetchSpotifyPlaylistTracks(pObj.id);
                            spotifySongs.forEach(song => {
                                const key = cacheSongInfo(song);
                                if (key && !masterList.includes(key)) masterList.push(key);
                            });
                        } catch (spotifyError) {
                            log("Spotify playlist error: " + spotifyError.message, "error");
                            const messageKey = spotifyError.status === 403
                                ? 'ui_spotify_playlist_access_error'
                                : 'ui_spotify_playlist_error';
                            showToast(t(messageKey), 'error', 10000);
                        }
                        continue;
                    }

                    if (!API_KEY || API_KEY.trim() === '') continue;

                    let pid = pObj.id;
                    let nextPageToken = '';
                    do {
                        let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${pid}&key=${API_KEY}`;
                        if (nextPageToken) url += `&pageToken=${nextPageToken}`;
                        let response = await fetch(url);
                        let data = await response.json();
                        
                        if(data.error) {
                            if (data.error.code === 400 || data.error.code === 403) {
                                setBaseActionButtonMode('error');
                                updateApiStatusUI('error');
                                openSettings();
                                return; 
                            }
                            break; 
                        }

                        if(data.items && data.items.length > 0) {
                            let ids = data.items.map(item => item.snippet.resourceId.videoId).join(',');
                            let vidUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${API_KEY}`;
                            let vidRes = await fetch(vidUrl);
                            let vidData = await vidRes.json();
                            
                            let durations = {};
                            if(vidData.items) {
                                vidData.items.forEach(v => { durations[v.id] = parseISO8601Duration(v.contentDetails.duration); });
                            }

                            data.items.forEach(item => {
                                let id = item.snippet.resourceId.videoId;
                                let title = item.snippet.title;
                                if(title === "Private video" || title === "Deleted video") return;
                                
                                const song = normalizeSongForStorage({ id, source: SONG_SOURCE_YOUTUBE, title: title, author: cleanAuthorName(item.snippet.videoOwnerChannelTitle), duration: durations[id] || 210 });
                                const key = cacheSongInfo(song);
                                if(key && !masterList.includes(key)) {
                                    masterList.push(key);
                                }
                            });
                        }
                        nextPageToken = data.nextPageToken;
                    } while (nextPageToken);
                }
                
                log(`Loaded ${masterList.length} tracks.`);
                updateBaseCount();
                setBaseActionButtonMode(getBasePoolItems().length > 0 ? 'ready' : 'empty');
                renderBaseList();
            } catch (e) {
                log("Error: " + e.message, "error");
                setBaseActionButtonMode('error');
            }
        }

        function buildBasePlaybackQueue(shuffle = false) {
            const items = getBasePoolItems();
            if (shuffle) {
                for (let i = items.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [items[i], items[j]] = [items[j], items[i]];
                }
            }

            return items.map(item => {
                let info = item.info;
                return info ? { ...info, user: "Auto", queueOrigin: item.queueOrigin || 'playlist' } : null;
            }).filter(Boolean);
        }

        function startBasePlayback(mode = basePlaybackMode) {
            if (getBasePoolItems().length === 0) return;
            basePlaybackMode = mode === 'shuffle' ? 'shuffle' : 'ordered';
            log(basePlaybackMode === 'shuffle' ? "Shuffling base playlists..." : "Starting base playlists in loaded order...");
            playQueue = buildBasePlaybackQueue(basePlaybackMode === 'shuffle');
            if (playQueue.length === 0) {
                renderQueue();
                return;
            }
            renderQueue(); playNext();
        }

        function startSystem() {
            activateSpotifyPlaybackElement();
            startBasePlayback('ordered');
        }

        function startSystemShuffle() {
            activateSpotifyPlaybackElement();
            startBasePlayback('shuffle');
        }

        function playNext(refillMode = basePlaybackMode) {
            clearTimeout(skipTransitionTimeout);
            clearTimeout(stopTransitionTimeout);
            skipTransitionTimeout = null;
            stopTransitionTimeout = null;
            clearNowPlayingWaveEffect();
            if(currentSongInfo) playHistory.push(currentSongInfo);
            resetVoteSkipVotes();
            
            if (playQueue.length > 0) {
                currentSongInfo = playQueue.shift();
                currentSongStopped = false;
                playCurrentSong(currentSongInfo);
                renderQueue();
            } else {
                const previousSong = currentSongInfo;
                currentSongInfo = null;
                currentSongStopped = false;
                if (previousSong && isSpotifySong(previousSong)) stopSpotifyPlayback().catch(() => {});
                else stopActivePlayback().catch(() => {});
                renderPlayerSurface(null);
                document.getElementById('now-playing-title').innerText = t('ui_waiting_start');
                document.getElementById('now-playing-meta').innerText = "---";
                renderQueue();
                startBasePlayback(refillMode); 
            }
        }

        function onPlayerStateChange(e) {
            if (currentSongInfo && isSpotifySong(currentSongInfo)) return;
            if (e.data === 0) playNext(playQueue.length === 0 ? 'shuffle' : basePlaybackMode); 
            if (e.data === 2 && currentSongInfo && !currentSongStopped) {
                triggerNowPlayingWaveEffect('fade', 900);
            }
            if (e.data === 1) {            
                currentSongStopped = false;
                nowPlayingWaveHoldUntilStart = false;
                clearTimeout(stopTransitionTimeout);
                stopTransitionTimeout = null;
                clearNowPlayingWaveEffect();
                document.getElementById('now-playing-title').innerText = currentSongInfo.title;
                setNowPlayingMeta(currentSongInfo);
                publishNowPlayingWidgetStartupBurst();
            }
        }

        function skipSong() {
            log("⏭️ SKIP", "warn");
            if (!currentSongInfo) {
                playNext(playQueue.length === 0 ? 'shuffle' : basePlaybackMode);
                return;
            }

            clearTimeout(skipTransitionTimeout);
            resetVoteSkipVotes();
            triggerNowPlayingWaveEffect('skip', 820);
            const refillMode = playQueue.length === 0 ? 'shuffle' : basePlaybackMode;
            skipTransitionTimeout = setTimeout(() => {
                nowPlayingWaveHoldUntilStart = true;
                nowPlayingWaveEffect = '';
                nowPlayingWaveEffectUntil = 0;
                skipTransitionTimeout = null;
                lastNowPlayingStreamerBotPush = 0;
                publishNowPlayingWidgetState(getNowPlayingWidgetState(), true);
                playNext(refillMode);
            }, 680);
        }
        
        function togglePlay() { 
            activateSpotifyPlaybackElement();
            if (!currentSongInfo) {
                if (playQueue.length === 0) {
                    if (getBasePoolItems().length > 0) startBasePlayback(basePlaybackMode);
                } else {
                    playNext();
                }
                return;
            }

            if(isActivePlaybackPlaying()) {
                triggerNowPlayingWaveEffect('fade', 900);
                pauseActivePlayback();
            } 
            else {
                currentSongStopped = false;
                nowPlayingWaveHoldUntilStart = false;
                clearTimeout(stopTransitionTimeout);
                stopTransitionTimeout = null;
                clearNowPlayingWaveEffect();
                resumeActivePlayback();
            }
        }
        
        function stopSongUI() { 
            stopCurrentSongWithWave();
        }

        function playFromChat(user) {
            if (!currentSongInfo) {
                if (playQueue.length === 0) {
                    if (getBasePoolItems().length > 0) {
                        sendChatMessage(t('msg_base_play', {user: user}));
                        startBasePlayback(basePlaybackMode);
                    } else {
                        sendChatMessage(t('msg_base_empty', {user: user}));
                    }
                } else {
                    sendChatMessage(t('msg_queue_play', {user: user}));
                    playNext();
                }
                return;
            }

            if (!isActivePlaybackPlaying()) {
                currentSongStopped = false;
                clearTimeout(stopTransitionTimeout);
                stopTransitionTimeout = null;
                clearNowPlayingWaveEffect();
                resumeActivePlayback();
                sendChatMessage(t('msg_resumed', {user: user}));
            } else {
                sendChatMessage(t('msg_already_playing', {user: user}));
            }
        }

        function pauseFromChat(user) {
            if (currentSongInfo && isActivePlaybackPlaying()) {
                triggerNowPlayingWaveEffect('fade', 900);
                pauseActivePlayback();
                sendChatMessage(t('msg_paused', {user: user}));
            } else {
                sendChatMessage(t('msg_already_paused', {user: user}));
            }
        }

        function stopFromChat(user) {
            if (currentSongInfo && !currentSongStopped) {
                stopCurrentSongWithWave();
                sendChatMessage(t('msg_stopped', {user: user}));
            } else {
                sendChatMessage(t('msg_nothing_playing', {user: user}));
            }
        }
        
        function prevSong() {
            if (playHistory.length > 0) {
                if(currentSongInfo) playQueue.unshift(currentSongInfo);
                currentSongInfo = playHistory.pop();
                currentSongStopped = false;
                resetVoteSkipVotes();
                playCurrentSong(currentSongInfo);
                renderQueue();
            } else seekActivePlayback(0); 
        }

        async function fetchAndAddById(videoId, user) {
            try {
                const song = await fetchYoutubeSongById(videoId, user);
                if (song) {
                    addSongFromChat(song);
                } else {
                    if(user !== "Streamer") sendChatMessage(t('msg_not_found', {user: user}));
                }
            } catch(e) {
                if (user !== "Streamer") sendChatMessage(t('msg_load_err', {user: user}));
            }
        }

        async function addManualUrl() {
            const inputEl = document.getElementById('manual-url');
            const url = inputEl.value.trim();
            if(!url) return;
            const spotify = parseSpotifyUrl(url);
            if (spotify && spotify.type === 'track') {
                inputEl.value = "";
                await addSpotifyTrackRequest({ id: spotify.id, spotifyUrl: spotify.url, input: url, user: "Streamer" }, true);
                return;
            }
            const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            const videoId = match ? match[1] : (url.length === 11 ? url : null);
            if(!videoId) {
                const found = await fetchYoutubeSongByQuery(url, "Streamer");
                if (found) {
                    inputEl.value = "";
                    addSongFromChat(found);
                }
                return;
            }
            inputEl.value = ""; 
            fetchAndAddById(videoId, "Streamer");
        }

        function getRequestUserKey(user) {
            return String(user || '').trim().toLowerCase();
        }

        function isViewerRequestSong(song) {
            const userKey = getRequestUserKey(song && song.user);
            return !!userKey && userKey !== 'auto' && userKey !== 'streamer';
        }

        function isRequestOrManualSong(song) {
            const userKey = getRequestUserKey(song && song.user);
            return !!userKey && userKey !== 'auto';
        }

        function getActiveViewerRequestSongs() {
            return [currentSongInfo, ...playQueue].filter(isViewerRequestSong);
        }

        function getSongRequestLimitCounts(user) {
            const userKey = getRequestUserKey(user);
            const activeRequests = getActiveViewerRequestSongs();
            return {
                user: activeRequests.filter(song => getRequestUserKey(song.user) === userKey).length,
                global: activeRequests.length
            };
        }

        function getSongRequestLimitStatePayload() {
            const userCounts = {};
            const activeRequests = getActiveViewerRequestSongs();
            activeRequests.forEach(song => {
                const userKey = getRequestUserKey(song.user);
                if (!userKey) return;
                userCounts[userKey] = (userCounts[userKey] || 0) + 1;
            });

            return {
                userLimitEnabled: SR_USER_QUEUE_LIMIT_ENABLED ? 'true' : 'false',
                globalLimitEnabled: SR_GLOBAL_QUEUE_LIMIT_ENABLED ? 'true' : 'false',
                globalRequestCount: activeRequests.length.toString(),
                userRequestCountsJson: JSON.stringify(userCounts)
            };
        }

        function canAcceptSongRequestWithinLimits(songObj) {
            if (!isViewerRequestSong(songObj)) return true;
            const counts = getSongRequestLimitCounts(songObj.user);
            const userLimit = Math.max(1, SR_USER_QUEUE_LIMIT || 25);
            const globalLimit = Math.max(1, SR_GLOBAL_QUEUE_LIMIT || 100);

            if (SR_USER_QUEUE_LIMIT_ENABLED && counts.user >= userLimit) {
                sendChatMessage(t('msg_sr_user_limit', {
                    user: songObj.user,
                    count: counts.user,
                    limit: userLimit
                }));
                return false;
            }

            if (SR_GLOBAL_QUEUE_LIMIT_ENABLED && counts.global >= globalLimit) {
                sendChatMessage(t('msg_sr_global_limit', {
                    user: songObj.user,
                    count: counts.global,
                    limit: globalLimit
                }));
                return false;
            }

            return true;
        }

        function addSongFromChat(songObj, force = false) {
            songObj = attachChatTargetToSong(songObj);
            if(songObj.author) songObj.author = cleanAuthorName(songObj.author);
            songObj = normalizeSongForStorage(songObj);
            if (!songObj) return;
            if (!force && songObj.user !== "Streamer" && songObj.duration && songObj.duration > SR_MAX_DURATION_MINUTES * 60) {
                sendChatMessage(t('msg_err_long', {user: songObj.user, info: Math.ceil(songObj.duration / 60), limit: SR_MAX_DURATION_MINUTES}));
                return;
            }
            if (!force && !canAcceptSongRequestWithinLimits(songObj)) return;
            songObj.isNew = true;

            let insertIndex = playQueue.findIndex(song => song.user === 'Auto');
            if (insertIndex === -1) { playQueue.push(songObj); insertIndex = playQueue.length - 1; } 
            else playQueue.splice(insertIndex, 0, songObj);

            recordViewerSongHistory(songObj);
            
            renderQueue();
            log(`➕ Added: "${songObj.title}" by ${songObj.user}`, "normal");

            let etaSeconds = 0;
            if (currentSongInfo && isActivePlaybackPlaying()) etaSeconds += getCurrentSongRemainingSeconds();
            for(let i = 0; i < insertIndex; i++) etaSeconds += playQueue[i].duration || 210;

            let displayPosition = insertIndex + 2; 
            if (songObj.user !== "Streamer") {
                sendChatMessage(t('msg_song_added', {
                    user: songObj.user,
                    author: songObj.author,
                    title: songObj.title,
                    pos: displayPosition,
                    m: Math.floor(etaSeconds / 60),
                    s: Math.floor(etaSeconds % 60)
                }));
            }
        }

        function removeSongFromUI(index) {
            let removed = playQueue.splice(index, 1)[0];
            renderQueue();
        }

        function clearQueueWithConfirm() {
            if (playQueue.length === 0) return;
            showConfirm(t('ui_clear_queue_confirm', {count: playQueue.length}), () => {
                playQueue = [];
                renderQueue();
                log("Cleared queued tracks.", "warn");
            }, { okText: t('ui_clear_queue') });
        }

        function sendChatMessage(msg) {
            if (!msg || !String(msg).trim()) return;
            if(canUseStreamerBotWebsocket()) {
                const args = { message: String(msg), chatSource: 'all' };
                ws.send(JSON.stringify({"request": "DoAction", "action": { "name": "ChatMessage" }, "args": args, "id": "MsgOut" }));
            }
        }

        function resetVoteSkipVotes() {
            voteSkipUsers.clear();
        }

        function getVoteSkipUserKey(user) {
            return String(user || 'Viewer').trim().toLowerCase() || 'viewer';
        }

        function handleGetSong(user) {
            if (currentSongInfo) {
                sendChatMessage(t('msg_current', {
                    user: user,
                    author: currentSongInfo.author,
                    title: currentSongInfo.title,
                    adder: currentSongInfo.user,
                    link: getSongLink(currentSongInfo)
                }));
            }
            else sendChatMessage(t('msg_nothing_playing', {user: user}));
        }

        function getCurrentSongRemainingSeconds() {
            if (!currentSongInfo) return 0;
            const fallbackDuration = currentSongInfo.duration || 210;
            const playback = getActivePlaybackState();
            let duration = playback.duration || fallbackDuration;
            let currentTime = playback.currentTime || 0;
            return Math.max(0, Math.round(duration - currentTime));
        }

        function estimateSecondsUntilQueueIndex(index) {
            let seconds = currentSongInfo ? getCurrentSongRemainingSeconds() : 0;
            for (let i = 0; i < index; i++) {
                seconds += playQueue[i].duration || 210;
            }
            return Math.max(0, Math.round(seconds));
        }

        function trimChatListText(text, limit = 420) {
            const value = String(text || '').trim();
            if (value.length <= limit) return value;
            return value.slice(0, Math.max(0, limit - 3)).trimEnd() + '...';
        }

        function handleWhenSong(user) {
            const viewer = user || 'Viewer';
            const userKey = getRequestUserKey(viewer);

            if (currentSongInfo && getRequestUserKey(currentSongInfo.user) === userKey) {
                sendChatMessage(t('msg_when_current', {
                    user: viewer,
                    title: currentSongInfo.title
                }));
                return;
            }

            const queueIndex = playQueue.findIndex(song => getRequestUserKey(song.user) === userKey);
            if (queueIndex === -1) {
                sendChatMessage(t('msg_when_none', { user: viewer }));
                return;
            }

            const song = playQueue[queueIndex];
            const etaSeconds = estimateSecondsUntilQueueIndex(queueIndex);
            sendChatMessage(t('msg_when_next', {
                user: viewer,
                title: song.title,
                m: Math.floor(etaSeconds / 60),
                s: etaSeconds % 60
            }));
        }

        function handleQueueSongs(user) {
            const viewer = user || 'Viewer';
            const current = currentSongInfo && isRequestOrManualSong(currentSongInfo) ? currentSongInfo.title : '-';
            const nextSongs = playQueue.filter(isRequestOrManualSong).slice(0, 10);
            const queue = trimChatListText(nextSongs.map(song => song.title).join(' | ')) || '-';

            if (current === '-' && queue === '-') {
                sendChatMessage(t('msg_queue_empty', { user: viewer }));
                return;
            }

            sendChatMessage(t('msg_queue_list', {
                user: viewer,
                current,
                queue
            }));
        }

        function handleSkipSong(user) { 
            if (currentSongInfo) {
                sendChatMessage(t('msg_skip', {user: user, author: currentSongInfo.author, title: currentSongInfo.title}));
            } else {
                sendChatMessage(t('msg_skip_empty', {user: user}));
            }
            skipSong(); 
        }

        function handleVoteSkip(user) {
            const voter = user || 'Viewer';
            const required = Math.max(1, SR_VOTESKIP_REQUIRED || 5);

            if (skipTransitionTimeout) {
                sendChatMessage(t('msg_voteskip_skipping', {user: voter}));
                return;
            }

            if (!currentSongInfo || currentSongStopped) {
                sendChatMessage(t('msg_voteskip_empty', {user: voter}));
                return;
            }

            const userKey = getVoteSkipUserKey(voter);
            if (voteSkipUsers.has(userKey)) {
                sendChatMessage(t('msg_voteskip_duplicate', {
                    user: voter,
                    votes: voteSkipUsers.size,
                    required: required,
                    left: Math.max(0, required - voteSkipUsers.size)
                }));
                return;
            }

            voteSkipUsers.add(userKey);
            const votes = voteSkipUsers.size;
            const left = Math.max(0, required - votes);

            if (votes >= required) {
                sendChatMessage(t('msg_voteskip_passed', {
                    user: voter,
                    votes: votes,
                    required: required,
                    author: currentSongInfo.author,
                    title: currentSongInfo.title
                }));
                skipSong();
                return;
            }

            sendChatMessage(t('msg_voteskip_count', {
                user: voter,
                votes: votes,
                required: required,
                left: left
            }));
        }

        function handleWrongSong(user) {
            let foundIndex = -1;
            for (let i = playQueue.length - 1; i >= 0; i--) {
                if (playQueue[i].user.toLowerCase() === user.toLowerCase()) { foundIndex = i; break; }
            }
            if (foundIndex !== -1) {
                let removed = playQueue.splice(foundIndex, 1)[0];
                renderQueue();
                sendChatMessage(t('msg_wrong_rm', {user: user, title: removed.title}));
            } else sendChatMessage(t('msg_wrong_none', {user: user}));
        }

        async function handleVolume(data) {
            if (currentSongInfo && isSpotifySong(currentSongInfo)) {
                if (!spotifyPlayer || !spotifyPlayer.getVolume) return;
                let currentSpotifyVol = Math.round((await spotifyPlayer.getVolume()) * 100);
                let newSpotifyVol = currentSpotifyVol;
                if (data.mode === "add") newSpotifyVol = currentSpotifyVol + data.value;
                else if (data.mode === "sub") newSpotifyVol = currentSpotifyVol - data.value;
                else if (data.mode === "set") newSpotifyVol = data.value;
                if (newSpotifyVol > 100) newSpotifyVol = 100; if (newSpotifyVol < 0) newSpotifyVol = 0;
                if (data.mode !== "get") {
                    await spotifyPlayer.setVolume(newSpotifyVol / 100);
                    rememberPlayerVolume(newSpotifyVol);
                    sendChatMessage(t('msg_vol', {user: data.user, vol: newSpotifyVol}));
                } else sendChatMessage(t('msg_vol', {user: data.user, vol: currentSpotifyVol}));
                return;
            }
            if (!player || !player.getVolume) return;
            let currentVol = player.getVolume();
            let newVol = currentVol;
            if (data.mode === "add") newVol = currentVol + data.value;
            else if (data.mode === "sub") newVol = currentVol - data.value;
            else if (data.mode === "set") newVol = data.value;
            if (newVol > 100) newVol = 100; if (newVol < 0) newVol = 0;
            if (data.mode !== "get") {
                player.setVolume(newVol);
                rememberPlayerVolume(newVol);
                sendChatMessage(t('msg_vol', {user: data.user, vol: newVol}));
            } else sendChatMessage(t('msg_vol', {user: data.user, vol: currentVol}));
        }

        function handleDragStart(e) { dragSourceIndex = parseInt(e.currentTarget.getAttribute('data-index')); e.currentTarget.style.opacity = '0.4'; }
        function handleDragOver(e) { e.preventDefault(); e.currentTarget.style.borderTop = '3px solid var(--accent)'; }
        function handleDragLeave(e) { e.currentTarget.style.borderTop = ''; }
        function handleDrop(e) {
            e.preventDefault(); e.currentTarget.style.borderTop = '';
            let targetIndexStr = e.currentTarget.getAttribute('data-index');
            let targetIndex = targetIndexStr ? parseInt(targetIndexStr) : 0;
            if (dragSourceIndex !== null && dragSourceIndex !== targetIndex) {
                const draggedItem = playQueue.splice(dragSourceIndex, 1)[0];
                playQueue.splice(targetIndex, 0, draggedItem);
            }
            renderQueue(); 
        }
        function handleDragEnd(e) { renderQueue(); }

        function handleFavoriteDragStart(e) {
            favoriteDragSourceIndex = parseInt(e.currentTarget.getAttribute('data-favorite-index'), 10);
            e.currentTarget.style.opacity = '0.4';
        }

        function handleFavoriteDragOver(e) {
            e.preventDefault();
            e.currentTarget.style.borderTop = '3px solid var(--gold)';
        }

        function handleFavoriteDragLeave(e) {
            e.currentTarget.style.borderTop = '';
        }

        function handleFavoriteDrop(e) {
            e.preventDefault();
            e.currentTarget.style.borderTop = '';
            const targetIndex = parseInt(e.currentTarget.getAttribute('data-favorite-index'), 10);
            if (Number.isInteger(favoriteDragSourceIndex) && Number.isInteger(targetIndex) && favoriteDragSourceIndex !== targetIndex) {
                const draggedFavorite = favoriteSongs.splice(favoriteDragSourceIndex, 1)[0];
                favoriteSongs.splice(targetIndex, 0, draggedFavorite);
                saveFavoriteSongs();
            }
            favoriteDragSourceIndex = null;
            renderBaseList();
        }

        function handleFavoriteDragEnd(e) {
            favoriteDragSourceIndex = null;
            renderBaseList();
        }

        function renderQueue() {
            const queueContainer = document.getElementById('queue-list');
            const nowPlayingBox = document.getElementById('now-playing-content');
            const clearQueueBtn = document.getElementById('btn-clear-queue');
            
            document.getElementById('queue-count').innerText = '🎵 ' + (playQueue.length + (currentSongInfo ? 1 : 0));
            if (clearQueueBtn) clearQueueBtn.disabled = playQueue.length === 0;
            
            let totalSeconds = 0;
            if (currentSongInfo) totalSeconds += (currentSongInfo.duration || 210);
            playQueue.forEach(song => { totalSeconds += (song.duration || 210); });
            
            let h = Math.floor(totalSeconds / 3600); let m = Math.floor((totalSeconds % 3600) / 60); let s = totalSeconds % 60;
            document.getElementById('queue-time').innerText = `⏱️ ${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;

            if (currentSongInfo) {
                nowPlayingBox.innerHTML = renderNowPlayingCard(currentSongInfo, { prefix: 'panel-now-playing', dropTarget: true, showBan: true, showFavorite: true, className: 'panel-card' });
                applyCoverThemeToNowPlayingCard(document.getElementById('panel-now-playing-card'), getSongThumbnail(currentSongInfo, 'mqdefault'));
            } else nowPlayingBox.innerHTML = `<div class="ex-style-013">${t('ui_no_song')}</div>`;

            updateNowPlayingProgress();

            if (playQueue.length === 0) {
                queueContainer.innerHTML = `<div class="ex-style-071">---</div>`;
                savePersistedQueue();
                syncSongRequestSettingsToStreamerBot();
                return;
            }
            
            queueContainer.innerHTML = playQueue.slice(0, 40).map((song, i) => {
                let typeClass = ""; let badgeClass = "badge";
                if (song.user !== "Auto") {
                    if (song.user === "Streamer") { typeClass = "manual"; badgeClass = "badge badge-manual"; } 
                    else { typeClass = "request"; badgeClass = "badge badge-user"; }
                }
                let animClass = song.isNew ? "animate-in" : "";
                if (song.isNew) setTimeout(() => { song.isNew = false; }, 500); 
                const thumbnail = escapeHtml(getSongThumbnail(song));
                const source = getSongSource(song);
                const sourceLabel = escapeHtml(getSongSourceLabel(song));
                const sourceIcon = escapeHtml(getSongSourceIcon(song));
                const chatSourceClass = getSongChatSourceClass(song);
                const sourceClass = ` source-${source}`;
                const originClass = ` origin-${getSongQueueOrigin(song)}`;
                const favoriteClass = isFavoriteSong(song) ? ' favorite-track' : '';

                return `
                <div class="q-item has-drag-handle ${typeClass} ${animClass}${chatSourceClass}${sourceClass}${originClass}${favoriteClass}" draggable="true" data-index="${i}" ondragstart="handleDragStart(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)" ondragend="handleDragEnd(event)">
                    <div class="queue-drag-handle" aria-hidden="true">&#9776;</div>
                    <div class="track-num">${i + 2}.</div>
                    <img src="${thumbnail}">
                    <div class="track-info">
                        <div class="track-title">${escapeHtml(song.title)}</div>
                        <span class="badge badge-time track-time-badge">${formatTime(song.duration)}</span>
                        <div class="track-meta">
                            <span class="badge badge-source badge-source-${source}" title="${sourceLabel}" aria-label="${sourceLabel}">${sourceIcon}</span>
                            ${song.user !== 'Auto' ? `<span class="${badgeClass}">${getSongRequesterHtml(song)}</span>` : `<span class="badge badge-auto"><span class="badge-auto-label">${getSongRequesterHtml(song)}</span></span>`}
                            <span class="badge badge-author">&#127908; ${escapeHtml(song.author)}</span>
                        </div>
                    </div>
                    ${renderFavoriteButton(song, `data-favorite-action="queue" data-song-index="${i}"`)}
                    <button class="btn-ban" onclick="banSong(${i})" title="Ban">&#128296;</button>
                    <button class="btn-remove" onclick="removeSongFromUI(${i})" title="Remove">&#10006;</button>
                </div>`;
            }).join('');
            savePersistedQueue();
            syncSongRequestSettingsToStreamerBot();
            updateNowPlayingProgress();
        }

        function renderBaseList() {
            const container = document.getElementById('base-list');
            const searchInput = document.getElementById('base-search');
            const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
            const basePoolItems = getBasePoolItems();
            updateBaseCount();

            let filteredList = basePoolItems;
            
            if (query !== "") {
                filteredList = basePoolItems.filter(item => {
                    let info = item.info;
                    if(!info) return false;
                    let searchStr = (info.title + " " + info.author).toLowerCase();
                    return searchStr.includes(query);
                });
            }

            if (filteredList.length === 0 && basePoolItems.length > 0) {
                container.innerHTML = `<div class="ex-style-068">0 results</div>`;
                return;
            }

            if (filteredList.length === 0) {
                container.innerHTML = `<div class="ex-style-068">${t('ui_empty_playlists')}</div>`;
                return;
            }

            container.innerHTML = filteredList.map((item) => {
                let id = item.id;
                let key = item.key || getSongKey(item.info || id);
                let info = item.info;
                let trackNumber = item.isFavorite ? `${item.favoriteIndex + 1}.` : `${item.originalIndex}.`;
                let favoriteClass = item.isFavorite ? ' favorite-track' : '';
                let favoriteDragAttrs = item.isFavorite ? ` draggable="true" data-favorite-index="${item.favoriteIndex}" ondragstart="handleFavoriteDragStart(event)" ondragover="handleFavoriteDragOver(event)" ondragleave="handleFavoriteDragLeave(event)" ondrop="handleFavoriteDrop(event)" ondragend="handleFavoriteDragEnd(event)"` : '';
                let thumbnail = escapeHtml(getSongThumbnail(info));
                let source = getSongSource(info);
                let sourceLabel = escapeHtml(getSongSourceLabel(info));
                let sourceIcon = escapeHtml(getSongSourceIcon(info));
                let sourceClass = ` source-${source}`;
                let originClass = ` origin-${item.queueOrigin || getSongQueueOrigin(info, 'playlist')}`;
                let dragHandleClass = item.isFavorite ? ' has-drag-handle' : '';
                let favoriteHandle = item.isFavorite ? '<div class="favorite-drag-handle" aria-hidden="true">&#9776;</div>' : '';
                
                return `
                <div class="q-item compact${favoriteClass}${sourceClass}${originClass}${dragHandleClass}"${favoriteDragAttrs}>
                    ${favoriteHandle}
                    <div class="track-num" title="Base ID">${trackNumber}</div>
                    <img src="${thumbnail}">
                    <div class="track-info">
                        <div class="track-title" title="${escapeHtml(info.title)}">${escapeHtml(info.title)}</div>
                        <span class="badge badge-time track-time-badge">${formatTime(info.duration)}</span>
                        <div class="track-meta">
                            <span class="badge badge-source badge-source-${source}" title="${sourceLabel}" aria-label="${sourceLabel}">${sourceIcon}</span>
                            <span class="badge badge-auto"><span class="badge-auto-label">${getSongRequesterHtml('Auto')}</span></span>
                            <span class="badge badge-author">&#127908; ${escapeHtml(info.author)}</span>
                        </div>
                    </div>
                    ${renderFavoriteButton(info, `data-favorite-action="base" data-song-key="${escapeHtml(key)}"`)}
                    <button type="button" class="btn-add" draggable="false" data-add-song-action="base" data-song-key="${escapeHtml(key)}" title="Add">+</button>
                </div>`;
            }).join('');
        }

        async function createStreamerBotAuthentication(password, salt, challenge) {
            const encoder = new TextEncoder();
            const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
            const secretBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password + salt));
            const secret = toBase64(secretBuffer);
            const authBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secret + challenge));
            return toBase64(authBuffer);
        }

        function subscribeToStreamerBotEvents() {
            if(ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({"request": "Subscribe", "events": {"General": ["Custom"]}, "id": "Sub"}));
                syncSongRequestSettingsToStreamerBot();
            }
        }

        function isActiveWebsocket(socket, attempt) {
            return socket && socket === ws && attempt === wsConnectionAttempt;
        }

        function canUseStreamerBotWebsocket() {
            return !!(ws && ws.readyState === WebSocket.OPEN && wsStreamerBotReady);
        }

        function ensureWebsocketConnection() {
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
            connectWebsocket();
        }

        function setWebsocketConnecting() {
            wsStreamerBotReady = false;
            wsStatusKey = 'ui_bot_connecting';
            wsStatusColor = '#ffaa00';
            renderWebsocketStatus();
        }

        function setWebsocketConnected(socket, attempt) {
            if (!isActiveWebsocket(socket, attempt)) return;
            wsStreamerBotReady = true;
            wsStatusKey = 'ui_bot_connected';
            wsStatusColor = '#00ff88';
            renderWebsocketStatus();
            scheduleImportStatusCheck();
        }

        function setWebsocketDisconnected() {
            wsStreamerBotReady = false;
            wsStatusKey = 'ui_bot_disconnected';
            wsStatusColor = 'var(--red)';
            renderWebsocketStatus();
            setImportStatus('unknown');
            resolveImportDiagnosticsWaiters(null);
            resolveStreamerBotRequestWaiters(null);
        }

        function setWebsocketAuthFailed(message = "WebSocket Authentication Failed!") {
            wsStreamerBotReady = false;
            wsStatusKey = 'ui_bot_auth_fail';
            wsStatusColor = 'var(--red)';
            renderWebsocketStatus();
            setImportStatus('unknown');
            resolveImportDiagnosticsWaiters(null);
            resolveStreamerBotRequestWaiters(null);
            log(`🔴 ${message}`, "error");
        }

        function renderWebsocketStatus() {
            const statusEl = document.getElementById('status');
            if (!statusEl) return;
            statusEl.innerText = t(wsStatusKey);
            statusEl.style.color = wsStatusColor;
        }

        async function handleStreamerBotHello(raw, socket, attempt) {
            if (!isActiveWebsocket(socket, attempt)) return;

            if (raw.authentication) {
                if (!WS_PASS) {
                    setWebsocketAuthFailed("WebSocket password is required by Streamer.bot.");
                    return;
                }

                try {
                    const authentication = await createStreamerBotAuthentication(
                        WS_PASS,
                        raw.authentication.salt,
                        raw.authentication.challenge
                    );
                    if (isActiveWebsocket(socket, attempt) && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ "request": "Authenticate", "authentication": authentication, "id": "auth" }));
                    }
                } catch (error) {
                    setWebsocketAuthFailed("Unable to generate WebSocket authentication.");
                    console.error(error);
                }
                return;
            }

            setWebsocketConnected(socket, attempt);
            subscribeToStreamerBotEvents();
        }

        function connectWebsocket() {
            clearTimeout(wsReconnectTimeout);
            const attempt = ++wsConnectionAttempt;
            const socket = new WebSocket(buildStreamerBotWebsocketUrl(WS_HOST, WS_PORT));
            ws = socket;
            setWebsocketConnecting();

            socket.onopen = () => {
                if (!isActiveWebsocket(socket, attempt)) return;
                log(`🔌 WebSocket opened on ${WS_HOST}:${WS_PORT}`, "normal");
            };
            socket.onmessage = async (e) => {
                if (!isActiveWebsocket(socket, attempt)) return;
                const rawData = e.data.toString();
                try {
                    const raw = JSON.parse(rawData);

                    if (raw.request === "Hello") {
                        await handleStreamerBotHello(raw, socket, attempt);
                        return;
                    }

                    if (resolveStreamerBotRequest(raw)) return;

                    if (raw.id === "Sub") return;
                    
                    if (raw.id === "auth") {
                        if (!isActiveWebsocket(socket, attempt)) return;
                        if (raw.status === "ok") {
                            setWebsocketConnected(socket, attempt);
                            subscribeToStreamerBotEvents();
                        } else {
                            setWebsocketAuthFailed();
                        }
                        return;
                    }

                    let inner = null;
                    if (raw.data && typeof raw.data === 'object' && raw.data.data) inner = JSON.parse(raw.data.data);
                    else if (raw.type) inner = raw;

                    if (inner) {
                        const previousChatReplyTarget = activeChatReplyTarget;
                        activeChatReplyTarget = getPayloadChatTarget(inner);
                        try {
                            if (inner.type === "IMPORT_DIAGNOSTICS") {
                                handleImportDiagnosticsPayload(inner);
                            }
                            else if (inner.type === "SONG_REQUEST") {
                                if (!isSrEnabled) sendChatMessage(t('msg_sr_disabled', {user: inner.user}));
                                else if (bannedSongs.some(b => getSongKey(b) === getSongKey(inner))) sendChatMessage(t('msg_sr_banned', {user: inner.user}));
                                else {
                                    let requestKey = getSongKey(inner);
                                    let isDuplicate = playQueue.some(song => getSongKey(song) === requestKey && song.user !== "Auto" && song.user !== "Streamer");
                                    let isCurrentDuplicate = currentSongInfo && getSongKey(currentSongInfo) === requestKey && currentSongInfo.user !== "Auto" && currentSongInfo.user !== "Streamer";
                                    if (isDuplicate || isCurrentDuplicate) sendChatMessage(t('msg_sr_dupe', {user: inner.user}));
                                    else addSongFromChat(inner);
                                }
                            }
                            else if (inner.type === "SPOTIFY_SONG_REQUEST") {
                                if (!isSrEnabled) sendChatMessage(t('msg_sr_disabled', {user: inner.user}));
                                else {
                                    const spotifyKey = getSongKeyFromParts(SONG_SOURCE_SPOTIFY, inner.spotifyId || inner.id);
                                    const isBanned = bannedSongs.some(b => getSongKey(b) === spotifyKey);
                                    const isDuplicate = playQueue.some(song => getSongKey(song) === spotifyKey && song.user !== "Auto" && song.user !== "Streamer");
                                    const isCurrentDuplicate = currentSongInfo && getSongKey(currentSongInfo) === spotifyKey && currentSongInfo.user !== "Auto" && currentSongInfo.user !== "Streamer";
                                    if (isBanned) sendChatMessage(t('msg_sr_banned', {user: inner.user}));
                                    else if (isDuplicate || isCurrentDuplicate) sendChatMessage(t('msg_sr_dupe', {user: inner.user}));
                                    else await addSpotifyTrackRequest(inner);
                                }
                            }
                            else if (inner.type === "SONG_REQUEST_FORCE") addSongFromChat(inner, true); 
                            else if (inner.type === "GET_SONG") handleGetSong(inner.user);
                            else if (inner.type === "WHEN_SONG") handleWhenSong(inner.user);
                            else if (inner.type === "QUEUE_SONGS") handleQueueSongs(inner.user);
                            else if (inner.type === "SKIP_SONG") handleSkipSong(inner.user);
                            else if (inner.type === "VOTE_SKIP") handleVoteSkip(inner.user);
                            else if (inner.type === "WRONG_SONG") handleWrongSong(inner.user);
                            else if (inner.type === "VOLUME") handleVolume(inner);
                            
                            else if (inner.type === "PLAY_SONG") playFromChat(inner.user);
                            else if (inner.type === "PAUSE_SONG") pauseFromChat(inner.user);
                            else if (inner.type === "STOP_SONG") stopFromChat(inner.user);

                            else if (inner.type === "SR_ERROR") {
                                let msg = "";
                                switch(inner.errorCode) {
                                    case "EMPTY_INPUT": msg += t('msg_err_empty', {user: inner.user}); break;
                                    case "SR_DISABLED": msg += t('msg_sr_disabled', {user: inner.user}); break;
                                    case "NOT_FOUND": msg += t('msg_err_not_found', {user: inner.user, info: inner.extraInfo}); break;
                                    case "TOO_LONG": msg += t('msg_err_long', {user: inner.user, info: Math.floor(parseInt(inner.extraInfo)/60), limit: SR_MAX_DURATION_MINUTES}); break;
                                    case "NOT_MUSIC": msg += t('msg_err_cat', {user: inner.user, info: inner.extraInfo}); break;
                                    case "USER_LIMIT": {
                                        const [count, limit] = String(inner.extraInfo || '').split('|');
                                        msg += t('msg_sr_user_limit', {user: inner.user, count: count || '?', limit: limit || SR_USER_QUEUE_LIMIT});
                                        break;
                                    }
                                    case "GLOBAL_LIMIT": {
                                        const [count, limit] = String(inner.extraInfo || '').split('|');
                                        msg += t('msg_sr_global_limit', {user: inner.user, count: count || '?', limit: limit || SR_GLOBAL_QUEUE_LIMIT});
                                        break;
                                    }
                                    case "API_ERROR": msg += t('msg_err_api', {user: inner.user}); break;
                                }
                                if (msg) sendChatMessage(msg);
                            }
                            else if (inner.type === "SR_SEARCHING") {
                                sendChatMessage(t('msg_searching', {user: inner.user}));
                            }
                            else if (inner.type === "SR_FORCE_ERROR") {
                                if(inner.errorCode === "INVALID_ID") sendChatMessage(t('msg_err_id', {user: inner.user}));
                                else sendChatMessage(t('msg_err_yt_read', {user: inner.user}));
                            }
                        } finally {
                            activeChatReplyTarget = previousChatReplyTarget;
                        }
                    }
                } catch(err) {}
            };
            socket.onerror = () => {
                if (!isActiveWebsocket(socket, attempt)) return;
                wsStreamerBotReady = false;
            };
            socket.onclose = () => {
                if (!isActiveWebsocket(socket, attempt)) return;
                setWebsocketDisconnected();
                wsReconnectTimeout = setTimeout(connectWebsocket, 5000);
            };
        }


Object.assign(window, {
    onYouTubeIframeAPIReady,
    saveCustomMsg,
    resetCustomMsg,
    toggleCustomMsgEnabled,
    removeBasePlaylist,
    unbanSong,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleFavoriteDragStart,
    handleFavoriteDragOver,
    handleFavoriteDragLeave,
    handleFavoriteDrop,
    handleFavoriteDragEnd,
    handlePlaylistDragStart,
    handlePlaylistDragOver,
    handlePlaylistDragLeave,
    handlePlaylistDrop,
    handlePlaylistDragEnd,
    banCurrentSong,
    banSong,
    removeSongFromUI,
    toggleFavoriteFromBase,
    toggleFavoriteFromQueue,
    toggleFavoriteFromCurrentSong,
    toggleFavoriteFromHistory,
    addHistorySongToQueue,
    addBaseSongToQueue,
    fetchAndAddById
});
}
