const messagesEl = document.getElementById('messages');
const form = document.getElementById('chatForm');
const input = document.getElementById('messageInput');
const fileInput = document.getElementById('fileInput');
const imageInput = fileInput;
const docInput = fileInput;
const sendBtn = document.getElementById('sendBtn');
const resetBtn = document.getElementById('resetBtn');
const sideResetBtn = document.getElementById('sideResetBtn');
const composerContextBtn = document.getElementById('composerContextBtn');
const sideImageInput = document.getElementById('sideImageInput');
const sessionListEl = document.getElementById('sessionList');
const fileHint = document.getElementById('fileHint');
const imagePreview = document.getElementById('imagePreview');
const kbUploadInput = document.getElementById('kbUploadInput');
const kbFilesEl = document.getElementById('kbFiles');
const kbStatus = document.getElementById('kbStatus');
const webSearchToggle = document.getElementById('webSearchToggle');
const reasoningToggle = document.getElementById('reasoningToggle');
const contextToggle = document.getElementById('contextToggle');
const contextCard = document.getElementById('contextCard');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileSidebarBackdrop = document.getElementById('mobileSidebarBackdrop');
const sidebarEl = document.querySelector('.sidebar');
const mobileSidebarCloseBtn = document.getElementById('mobileSidebarCloseBtn');
const shareBar = document.getElementById('shareBar');
const shareStatus = document.getElementById('shareStatus');
const shareDownloadBtn = document.getElementById('shareDownloadBtn');
const shareCancelBtn = document.getElementById('shareCancelBtn');
let sessionId = localStorage.getItem('chat_session_id') || crypto.randomUUID();
let currentAbortController = null;
let isGenerating = false;
let shareMode = false;
const selectedShareMessages = new Set();
function selectedShareRows() { return shareRows().filter(row => selectedShareMessages.has(row.dataset.shareId)); }
function updateSendButtonState() {
  if (!sendBtn) return;
  if (isGenerating) {
    sendBtn.textContent = '停止';
    sendBtn.classList.add('is-stopping');
    sendBtn.classList.remove('is-share-ready');
    sendBtn.disabled = false;
    return;
  }
  if (selectedShareMessages.size > 0) {
    sendBtn.textContent = '生成HTML';
    sendBtn.classList.remove('is-stopping');
    sendBtn.classList.add('is-share-ready');
    sendBtn.disabled = false;
    return;
  }
  sendBtn.textContent = '发送';
  sendBtn.classList.remove('is-stopping', 'is-share-ready');
  sendBtn.disabled = false;
}
localStorage.setItem('chat_session_id', sessionId);


function setMobileSidebar(open) {
  open = !!open;
  document.body.classList.toggle('mobile-sidebar-open', open);
  if (mobileSidebarBackdrop) {
    mobileSidebarBackdrop.hidden = !open;
    mobileSidebarBackdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
  }
  sidebarEl?.setAttribute('aria-hidden', open ? 'false' : 'true');
  mobileMenuBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
}
mobileMenuBtn?.addEventListener('click', () => setMobileSidebar(!document.body.classList.contains('mobile-sidebar-open')));
mobileSidebarBackdrop?.addEventListener('click', () => setMobileSidebar(false));
mobileSidebarCloseBtn?.addEventListener('click', () => setMobileSidebar(false));
document.addEventListener('click', (e) => {
  if (!window.matchMedia('(max-width: 920px)').matches) return;
  if (!document.body.classList.contains('mobile-sidebar-open')) return;
  if (e.target.closest('.sidebar')) return;
  if (e.target.closest('#mobileMenuBtn')) return;
  setMobileSidebar(false);
}, true);
sidebarEl?.addEventListener('click', (e) => {
  if (!window.matchMedia('(max-width: 920px)').matches) return;
  if (e.target.closest('.session-item') || e.target.closest('.new-chat')) {
    setTimeout(() => setMobileSidebar(false), 80);
  }
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMobileSidebar(false); });

function syncComposerToggles() {
  if (webSearchToggle) {
    const webTool = webSearchToggle.closest('.tool-toggle');
    const webOn = !!webSearchToggle.checked;
    webTool?.classList.toggle('active', webOn);
    webTool?.classList.toggle('is-on', webOn);
    webTool?.setAttribute('aria-pressed', webOn ? 'true' : 'false');
    webTool?.setAttribute('title', webOn ? '联网搜索已开启' : '联网搜索已关闭');
  }
  if (reasoningToggle) {
    const reasoningTool = reasoningToggle.closest('.tool-toggle');
    const reasoningOn = !!reasoningToggle.checked;
    reasoningTool?.classList.toggle('active', reasoningOn);
    reasoningTool?.classList.toggle('is-on', reasoningOn);
    reasoningTool?.setAttribute('aria-pressed', reasoningOn ? 'true' : 'false');
    reasoningTool?.setAttribute('title', reasoningOn ? '思考模式已开启' : '思考模式已关闭');
  }
  const kbSelected = getSelectedKb().length > 0;
  composerContextBtn?.classList.toggle('active', kbSelected);
  composerContextBtn?.classList.toggle('is-on', kbSelected);
  composerContextBtn?.setAttribute('aria-pressed', kbSelected ? 'true' : 'false');
  composerContextBtn?.setAttribute('title', kbSelected ? '已选择知识库，将嵌入本次回答' : '未选择知识库，点击打开选择面板');
}


function formatSessionTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

async function loadSessionList() {
  if (!sessionListEl) return;
  try {
    const res = await fetch('/chat/api/sessions');
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const items = Array.isArray(data.sessions) ? data.sessions : [];
    if (!items.length) {
      sessionListEl.innerHTML = '<div class="session-empty">暂无历史对话</div>';
      return;
    }
    sessionListEl.innerHTML = items.map(item => {
      const active = item.sessionId === sessionId ? ' active' : '';
      const title = escapeHtml(item.title || '新会话');
      const time = escapeHtml(formatSessionTime(item.updatedAt));
      return `<div class="session-row${active}" data-session-id="${escapeHtml(item.sessionId)}"><button class="session-item" type="button"><span class="session-title">${title}</span><span class="session-meta">${time} · ${item.messageCount || 0} 条</span></button><button class="session-delete" type="button" title="删除历史对话" aria-label="删除历史对话">×</button></div>`;
    }).join('');
    sessionListEl.querySelectorAll('.session-row').forEach(row => {
      const itemBtn = row.querySelector('.session-item');
      const delBtn = row.querySelector('.session-delete');
      itemBtn?.addEventListener('click', async () => {
        const nextId = row.dataset.sessionId;
        if (!nextId || nextId === sessionId) return;
        sessionId = nextId;
        localStorage.setItem('chat_session_id', sessionId);
        await loadHistory();
        await loadSessionList();
      });
      delBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetId = row.dataset.sessionId;
        if (!targetId) return;
        const ok = window.confirm('确定要删除这条历史对话吗？\n\n删除后它将不再出现在左侧历史列表中；出于合规留存，服务器后台仍会保留原始记录。');
        if (!ok) return;
        const res = await fetch('/chat/api/sessions/hide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: targetId }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (targetId === sessionId) {
          sessionId = crypto.randomUUID();
          localStorage.setItem('chat_session_id', sessionId);
          messagesEl.innerHTML = '';
          addMessage('assistant', '这条历史对话已从列表删除。我们开始新的会话吧。');
        }
        await loadSessionList();
      });
    });
  } catch (err) {
    sessionListEl.innerHTML = `<div class="session-empty">加载失败：${escapeHtml(err.message)}</div>`;
  }
}

async function loadHistory() {
  try {
    const res = await fetch(`/chat/api/history?sessionId=${encodeURIComponent(sessionId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
    sessionId = data.sessionId || sessionId;
    localStorage.setItem('chat_session_id', sessionId);
    messagesEl.innerHTML = '';
    const history = Array.isArray(data.messages) ? data.messages : [];
    if (!history.length) {
      addMessage('assistant', '你好，我是 caolaobancloud 聊天助手。聊天记录会保存在服务器本地，下次打开还能继续。');
      return;
    }
    history.forEach(m => addMessage(m.role, m.content));
  } catch (err) {
    messagesEl.innerHTML = '';
    addMessage('assistant', `历史记录加载失败：${err.message}`);
  }
}

function getHiddenKbFiles() {
  return new Set(JSON.parse(localStorage.getItem('chat_hidden_kb') || '[]'));
}
function saveHiddenKbFiles(hidden) {
  localStorage.setItem('chat_hidden_kb', JSON.stringify([...hidden]));
}

async function loadKbFiles() {
  try {
    const res = await fetch('/chat/api/kb/files');
    const data = await res.json();
    const selected = new Set(JSON.parse(localStorage.getItem('chat_selected_kb') || '[]'));
    const hidden = getHiddenKbFiles();
    const visibleFiles = (data.files || []).filter(name => !hidden.has(name));
    kbStatus.textContent = `${visibleFiles.length}/${data.files.length} 个文件 · ${data.chunks} 个片段`;
    if (!visibleFiles.length) {
      kbFilesEl.innerHTML = data.files.length ? '<span class="kb-empty">知识库文件已从当前页面隐藏（服务器仍保留）</span>' : '<span class="kb-empty">暂无知识库文件，请上传 .md 或 .txt</span>';
      saveSelectedKb();
      return;
    }
    kbFilesEl.innerHTML = visibleFiles.map(name => {
      const safeName = escapeHtml(name);
      const checked = selected.size === 0 || selected.has(name) ? 'checked' : '';
      return `<label class="kb-chip"><input type="checkbox" value="${safeName}" ${checked}><span class="kb-chip-name">${safeName}</span><button class="kb-fake-delete" type="button" data-kb-name="${safeName}" title="从当前页面隐藏，不删除服务器文件" aria-label="隐藏知识库文件">×</button></label>`;
    }).join('');
    kbFilesEl.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', saveSelectedKb));
    kbFilesEl.querySelectorAll('.kb-fake-delete').forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const name = btn.dataset.kbName;
      if (!name) return;
      const ok = window.confirm(`仅从当前页面隐藏「${name}」？\n\n这不会删除服务器上的知识库文件。`);
      if (!ok) return;
      const hiddenNow = getHiddenKbFiles();
      hiddenNow.add(name);
      saveHiddenKbFiles(hiddenNow);
      const selectedNow = new Set(getSelectedKb());
      selectedNow.delete(name);
      localStorage.setItem('chat_selected_kb', JSON.stringify([...selectedNow]));
      loadKbFiles();
    }));
    saveSelectedKb();
  } catch (err) {
    kbStatus.textContent = `加载失败：${err.message}`;
  }
}
function getSelectedKb() {
  return [...kbFilesEl.querySelectorAll('input[type="checkbox"]:checked')].map(x => x.value);
}
function saveSelectedKb() {
  localStorage.setItem('chat_selected_kb', JSON.stringify(getSelectedKb()));
  syncComposerToggles();
}
kbUploadInput?.addEventListener('change', async () => {
  const files = [...(kbUploadInput.files || [])];
  if (!files.length) return;
  kbStatus.textContent = '正在上传...';
  try {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    const res = await fetch('/chat/api/kb/upload', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const savedFiles = Array.isArray(data.saved) ? data.saved : [];
    // If a file with the same sanitized name had been hidden locally before,
    // uploading it again should make it visible immediately.
    const hiddenNow = getHiddenKbFiles();
    savedFiles.forEach(name => hiddenNow.delete(name));
    saveHiddenKbFiles(hiddenNow);
    // Select newly uploaded files by default so the composer "知识库嵌入" state updates.
    const selectedNow = new Set(JSON.parse(localStorage.getItem('chat_selected_kb') || '[]'));
    savedFiles.forEach(name => selectedNow.add(name));
    localStorage.setItem('chat_selected_kb', JSON.stringify([...selectedNow]));
    kbUploadInput.value = '';
    await loadKbFiles();
    addMessage('assistant', `知识库已上传：${savedFiles.join(', ') || '已保存'}`);
  } catch (err) {
    kbStatus.textContent = `上传失败：${err.message}`;
  }
});

let mdRenderer = null;

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function getMarkdownRenderer() {
  if (mdRenderer) return mdRenderer;
  if (!window.markdownit) { console.warn('[markdown] markdown-it not loaded'); return null; }
  mdRenderer = window.markdownit({
    html: false,
    linkify: true,
    typographer: true,
    breaks: true
  });
  if (window.texmath && window.katex) {
    mdRenderer.use(window.texmath, {
      engine: window.katex,
      delimiters: ['brackets', 'dollars', 'beg_end'],
      katexOptions: {
        throwOnError: false,
        strict: false,
        output: 'html'
      }
    });
  } else {
    console.warn('[markdown] texmath/katex not loaded', { texmath: !!window.texmath, katex: !!window.katex });
  }
  return mdRenderer;
}

function renderMarkdown(text) {
  const md = getMarkdownRenderer();
  if (!md || !window.DOMPurify) return escapeHtml(text).replace(/\n/g, '<br>');
  const raw = md.render(String(text || ''));
  return window.DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['section', 'eqn', 'eq'],
    ADD_ATTR: ['target', 'rel', 'class']
  });
}

function setBubbleText(bubble, text, role = 'assistant') {
  if (role === 'assistant') {
    bubble.classList.add('markdown-body');
    bubble.innerHTML = renderMarkdown(text);
    bubble.querySelectorAll('a[href]').forEach(a => {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    enhanceGeneratedMedia(bubble);
  } else {
    bubble.classList.remove('markdown-body');
    bubble.textContent = text || '';
  }
}

function enhanceGeneratedMedia(bubble) {
  bubble.querySelectorAll('img[src]').forEach((img, index) => {
    const src = img.getAttribute('src') || '';
    if (!isLikelyImageUrl(src) || img.closest('.generated-image-card')) return;
    const card = document.createElement('figure');
    card.className = 'generated-image-card';
    const preview = img.cloneNode(true);
    preview.alt = img.alt || `生成图片 ${index + 1}`;
    preview.loading = 'lazy';
    const actions = document.createElement('figcaption');
    const download = document.createElement('a');
    download.href = src;
    download.download = generatedImageFilename(src, index + 1);
    download.textContent = '下载图片';
    download.className = 'image-download-link';
    actions.append(download);
    card.append(preview, actions);
    img.replaceWith(card);
  });
  bubble.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (!isLikelyImageUrl(href) || a.closest('.generated-image-card')) return;
    const card = document.createElement('figure');
    card.className = 'generated-image-card';
    const img = document.createElement('img');
    img.src = href;
    img.alt = '生成图片预览';
    img.loading = 'lazy';
    const actions = document.createElement('figcaption');
    const download = document.createElement('a');
    download.href = href;
    download.download = generatedImageFilename(href, 1);
    download.textContent = '下载图片';
    download.className = 'image-download-link';
    actions.append(download);
    card.append(img, actions);
    a.replaceWith(card);
  });
}

function isLikelyImageUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    return /\.(png|jpe?g|webp|gif)(?:$|[?#])/i.test(u.pathname) || u.pathname.includes('/image/generated/') || String(url).startsWith('data:image/');
  } catch { return false; }
}

function generatedImageFilename(url, index = 1) {
  try {
    const u = new URL(url, window.location.origin);
    const name = decodeURIComponent(u.pathname.split('/').pop() || '');
    return name || `generated-image-${index}.jpg`;
  } catch { return `generated-image-${index}.jpg`; }
}


function isImageOnlyMessage(text) {
  const value = String(text || '').trim();
  return /^!\[[^\]]*\]\((?:\/image\/generated\/|data:image\/|https?:\/\/)[^)]+\)\s*$/.test(value);
}

function addMessage(role, text, extraClass='') {
  const row = document.createElement('div');
  row.className = `msg ${role} ${extraClass}`.trim();
  if (role === 'assistant' && isImageOnlyMessage(text)) row.classList.add('image-result-msg');
  row.dataset.role = role;
  row.dataset.raw = text || '';
  row.dataset.shareId = crypto.randomUUID();
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  if (role === 'user') {
    avatar.textContent = '你';
  } else {
    const img = document.createElement('img');
    img.src = '/chat/assets/assistant-avatar.png?v=20260516-2033';
    img.alt = 'AI';
    avatar.append(img);
  }
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  setBubbleText(bubble, text, role);
  row.append(avatar, bubble);
  row.addEventListener('dblclick', (e) => {
    e.preventDefault();
    if (role === 'assistant') {
      if (!shareMode) setShareMode(true);
      toggleShareSelection(row);
      return;
    }
    if (shareMode) toggleShareSelection(row);
  });
  messagesEl.append(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return row;
}


function shareRows() {
  return [...messagesEl.querySelectorAll('.msg')].filter(row => row.dataset.shareId && !row.classList.contains('thinking'));
}
function updateShareStatus() {
  const count = selectedShareMessages.size;
  if (shareStatus) shareStatus.textContent = shareMode ? (count ? `已选择 ${count} 条对话` : '选择要分享的对话') : '';
  if (shareDownloadBtn) shareDownloadBtn.disabled = count === 0;
  updateSendButtonState();
}
function toggleShareSelection(row) {
  const id = row.dataset.shareId;
  if (!id) return;
  if (selectedShareMessages.has(id)) {
    selectedShareMessages.delete(id);
    row.classList.remove('share-selected');
  } else {
    selectedShareMessages.add(id);
    row.classList.add('share-selected');
  }
  updateShareStatus();
}
function setShareMode(on) {
  shareMode = !!on;
  document.body.classList.toggle('share-mode', shareMode);
  if (shareBar) shareBar.hidden = true;
  if (!shareMode) {
    selectedShareMessages.clear();
    shareRows().forEach(row => row.classList.remove('share-selected'));
  }
  updateShareStatus();
  updateSendButtonState();
}
function shareHtmlEscape(text) {
  return String(text || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}
function buildShareHtml(rows) {
  const items = rows.map(row => {
    const role = row.dataset.role === 'user' ? 'user' : 'assistant';
    const label = role === 'user' ? '你' : 'AI';
    const content = role === 'assistant' ? row.querySelector('.bubble')?.innerHTML || '' : shareHtmlEscape(row.dataset.raw || row.querySelector('.bubble')?.textContent || '').replace(/\n/g, '<br>');
    return `<article class="msg ${role}"><div class="avatar">${label}</div><div class="bubble">${content}</div></article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chat 分享</title>
<style>
:root{--brand:#4f8cff;--brand2:#66ccff;--text:#1f2937;--muted:#718096;--line:#dfe6f0}*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--text);background:#f7fbff}.wrap{width:min(860px,calc(100% - 24px));margin:0 auto;padding:18px 0}.card{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 10px 34px rgba(31,41,55,.08);padding:18px}.msg{display:flex;gap:10px;margin:0 0 14px;align-items:flex-start}.msg:last-child{margin-bottom:0}.msg.user{justify-content:flex-end}.avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#eef6ff;color:#4f8cff;flex:0 0 auto;font-weight:700;font-size:13px;border:1px solid #dfeaf7}.user .avatar{order:2;background:linear-gradient(135deg,var(--brand2),var(--brand));color:#fff;border:0}.bubble{max-width:min(760px,calc(100% - 44px));white-space:pre-wrap;line-height:1.62;overflow-wrap:anywhere;color:#1f2937;font-size:15px}.assistant .bubble{padding-top:1px}.user .bubble{max-width:min(660px,78%);padding:9px 12px;border-radius:15px;background:#edf4ff;color:#172033;border:1px solid #dce8fb}.bubble p{margin:.25em 0 .55em}.bubble p:last-child{margin-bottom:0}.bubble ul,.bubble ol{margin:.35em 0 .55em;padding-left:1.35em}.bubble pre{white-space:pre-wrap;background:#f6f8fb;border:1px solid #e5edf6;border-radius:12px;padding:10px;overflow:auto;margin:8px 0}.bubble code{background:#f3f6fa;border-radius:5px;padding:.08em .25em}.bubble blockquote{margin:8px 0;padding:6px 10px;border-left:3px solid #8bc7ff;background:#f5faff;border-radius:8px}.bubble table{border-collapse:collapse;width:100%;margin:8px 0}.bubble th,.bubble td{border:1px solid #dfe6f0;padding:6px 8px}.bubble th{background:#f3f8ff}@media(max-width:720px){.wrap{width:calc(100% - 16px);padding:10px 0}.card{padding:12px;border-radius:14px}.bubble{font-size:14px;line-height:1.58}.user .bubble{max-width:86%}.avatar{width:28px;height:28px}}
</style></head><body><main class="wrap"><section class="card">${items}</section></main></body></html>`;
}

function downloadShareHtml() {
  const rows = selectedShareRows();
  if (!rows.length) return;
  const html = buildShareHtml(rows);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `chat-share-${stamp}.html`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setShareMode(false);
  updateSendButtonState();
}
shareCancelBtn?.addEventListener('click', () => setShareMode(false));
shareDownloadBtn?.addEventListener('click', downloadShareHtml);

function autosize() {
  input.style.height = 'auto';
  const styles = window.getComputedStyle(input);
  const lineHeight = parseFloat(styles.lineHeight) || 24;
  const paddingY = parseFloat(styles.paddingTop || 0) + parseFloat(styles.paddingBottom || 0);
  const maxHeight = Math.ceil(lineHeight * 6 + paddingY);
  input.style.height = Math.min(input.scrollHeight, maxHeight) + 'px';
  input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';
}
input.addEventListener('input', autosize);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
let imagePreviewUrl = '';
function updateFileHint() {
  const parts = [];
  const files = Array.from(fileInput?.files || []);
  const images = files.filter(f => /^image\//i.test(f.type || ''));
  const docs = files.filter(f => !/^image\//i.test(f.type || ''));
  if (images.length) parts.push(`图片：${images.map(f => f.name).join('、')}`);
  if (docs.length) parts.push(`资料：${docs.map(f => f.name).join('、')}`);
  fileHint.textContent = parts.length ? `已选择 ${parts.join('；')}` : '';
}
function clearDocs() { if (fileInput) fileInput.value = ''; updateFileHint(); }

function clearImagePreview() {
  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  imagePreviewUrl = '';
  if (imagePreview) {
    imagePreview.hidden = true;
    imagePreview.innerHTML = '';
  }
  if (fileInput) fileInput.value = '';
  updateFileHint();
}
function updateImagePreview(file) {
  if (!imagePreview) return;
  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  imagePreviewUrl = '';
  if (!file) {
    imagePreview.hidden = true;
    imagePreview.innerHTML = '';
    updateFileHint();
    return;
  }
  imagePreviewUrl = URL.createObjectURL(file);
  const safeName = escapeHtml(file.name || '粘贴图片');
  const size = Math.max(1, Math.round((file.size || 0) / 1024));
  imagePreview.innerHTML = `<div class="preview-card"><img src="${imagePreviewUrl}" alt="图片预览"><div class="preview-info"><strong>${safeName}</strong><span>${size} KB · 将随下一条消息发送</span></div><button id="clearImageBtn" class="preview-clear" type="button" title="移除图片" aria-label="移除图片">×</button></div>`;
  imagePreview.hidden = false;
  imagePreview.querySelector('#clearImageBtn')?.addEventListener('click', clearImagePreview);
  updateFileHint();
}
fileInput?.addEventListener('change', () => {
  const f = Array.from(fileInput.files || []).find(file => /^image\//i.test(file.type || ''));
  updateImagePreview(f || null);
  updateFileHint();
});


function setImageFile(file) {
  if (!file) return false;
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type || '')) {
    fileHint.textContent = '只支持拖入/粘贴 PNG、JPG、WebP、GIF 图片';
    return false;
  }
  const dt = new DataTransfer();
  for (const existing of Array.from(fileInput?.files || []).filter(f => !/^image\//i.test(f.type || ''))) dt.items.add(existing);
  dt.items.add(file);
  fileInput.files = dt.files;
  fileInput.dispatchEvent(new Event('change'));
  input.focus();
  return true;
}

function firstImageFileFromItems(items) {
  for (const item of Array.from(items || [])) {
    if (item.kind === 'file' && /^image\//i.test(item.type || '')) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

['dragenter', 'dragover'].forEach(type => {
  document.addEventListener(type, (e) => {
    const hasFile = Array.from(e.dataTransfer?.items || []).some(item => item.kind === 'file');
    if (!hasFile) return;
    e.preventDefault();
    e.stopPropagation();
    messagesEl?.classList.add('drag-over');
    fileHint.textContent = '松开即可添加图片到本次对话';
  });
});

['dragleave', 'drop'].forEach(type => {
  document.addEventListener(type, (e) => {
    if (type === 'dragleave' && e.relatedTarget) return;
    messagesEl?.classList.remove('drag-over');
  });
});

document.addEventListener('drop', (e) => {
  const file = firstImageFileFromItems(e.dataTransfer?.items) || Array.from(e.dataTransfer?.files || []).find(f => /^image\//i.test(f.type || ''));
  if (!file) return;
  e.preventDefault();
  e.stopPropagation();
  setImageFile(file);
});

input.addEventListener('paste', (e) => {
  const file = firstImageFileFromItems(e.clipboardData?.items);
  if (!file) return;
  e.preventDefault();
  setImageFile(file);
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isGenerating && currentAbortController) {
    currentAbortController.abort();
    return;
  }
  if (selectedShareMessages.size > 0) {
    downloadShareHtml();
    return;
  }
  const text = input.value.trim();
  const allFiles = Array.from(fileInput?.files || []);
  const file = allFiles.find(f => /^image\//i.test(f.type || ''));
  const docs = allFiles.filter(f => !/^image\//i.test(f.type || ''));
  if (!text && !file && !docs.length) return;
  const docLine = docs.length ? `\n[资料：${docs.map(f => f.name).join('、')}]` : '';
  addMessage('user', `${text || (file ? '请分析这张图片' : '请阅读这些资料')}${file ? `\n[图片：${file.name}]` : ''}${docLine}`);
  input.value = ''; autosize();
  const thinkingText = /^\s*\/(?:图片生成|image)(?:\s|$)/i.test(text) ? '正在生成图片...' : (/^\s*\/(?:视频生成|video)(?:\s|$)/i.test(text) ? '正在检查视频生成状态...' : '正在思考...');
  const thinking = addMessage('assistant', thinkingText, 'thinking');
  isGenerating = true;
  currentAbortController = new AbortController();
  sendBtn.disabled = false;
  updateSendButtonState();
  try {
    const fd = new FormData();
    fd.append('sessionId', sessionId);
    fd.append('message', text || (file ? '请分析这张图片。' : '请阅读并分析这些资料。'));
    fd.append('selectedKb', JSON.stringify(getSelectedKb()));
    fd.append('useWebSearch', webSearchToggle?.checked ? 'true' : 'false');
    fd.append('useReasoning', reasoningToggle?.checked ? 'true' : 'false');
    fd.append('stream', 'true');
    if (file) fd.append('image', file);
    docs.forEach(f => fd.append('documents', f));
    const res = await fetch('/chat/api/chat', { method: 'POST', body: fd, signal: currentAbortController.signal });
    if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || `HTTP ${res.status}`); }
    const bubble = thinking.querySelector('.bubble');
    let answer = '', buffer = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n'); buffer = parts.pop() || '';
      for (const part of parts) for (const line of part.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim(); if (!payload) continue;
        const event = JSON.parse(payload);
        if (event.type === 'meta' && event.sessionId) { sessionId = event.sessionId; localStorage.setItem('chat_session_id', sessionId); }
        else if (event.type === 'delta') { answer += event.content || ''; setBubbleText(bubble, answer, 'assistant'); messagesEl.scrollTop = messagesEl.scrollHeight; }
        else if (event.type === 'error') throw new Error(event.error || '流式输出失败');
      }
    }
    if (!answer) setBubbleText(bubble, '没有返回内容。', 'assistant');
    clearImagePreview(); clearDocs();
    thinking.classList.remove('thinking');
    await loadSessionList();
  } catch (err) {
    const bubble = thinking.querySelector('.bubble');
    if (err.name === 'AbortError') setBubbleText(bubble, ((bubble.textContent || '').replace(/正在思考\.\.\.$/, '').trim() || '生成') + '\n\n[已停止生成]', 'assistant');
    else { if (!Array.from(fileInput?.files || []).some(f => /^image\//i.test(f.type || ''))) updateImagePreview(null); setBubbleText(bubble, `出错了：${err.message}`, 'assistant'); }
    thinking.classList.remove('thinking');
  } finally {
    isGenerating = false; currentAbortController = null;
    updateSendButtonState();
  }
});
async function resetSession() {
  setShareMode(false);
  selectedShareMessages.clear();
  shareMode = false;
  isGenerating = false;
  currentAbortController = null;
  updateSendButtonState();
  const res = await fetch('/chat/api/reset', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ sessionId }) }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : {};
  sessionId = data.sessionId || crypto.randomUUID();
  localStorage.setItem('chat_session_id', sessionId);
  messagesEl.innerHTML = '';
  addMessage('assistant', '已新建会话。之前的对话仍保留在左侧历史里。');
  setShareMode(false);
  updateSendButtonState();
  await loadSessionList();
}
resetBtn?.addEventListener('click', resetSession);
sideResetBtn?.addEventListener('click', resetSession);

loadHistory().then(loadSessionList);
loadKbFiles();

webSearchToggle.checked = localStorage.getItem('chat_use_web_search') === 'true';
reasoningToggle.checked = localStorage.getItem('chat_use_reasoning') === 'true';
syncComposerToggles();
webSearchToggle.addEventListener('change', () => {
  localStorage.setItem('chat_use_web_search', webSearchToggle.checked ? 'true' : 'false');
  syncComposerToggles();
});
reasoningToggle.addEventListener('change', () => {
  localStorage.setItem('chat_use_reasoning', reasoningToggle.checked ? 'true' : 'false');
  syncComposerToggles();
});
composerContextBtn?.addEventListener('click', () => {
  contextCard.classList.toggle('open');
  syncComposerToggles();
});
sideImageInput?.addEventListener('change', () => {
  if (sideImageInput.files?.[0]) {
    const dt = new DataTransfer();
    for (const existing of Array.from(fileInput?.files || []).filter(f => !/^image\//i.test(f.type || ''))) dt.items.add(existing);
    dt.items.add(sideImageInput.files[0]);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change'));
  }
});
contextToggle?.addEventListener('click', () => {
  contextCard.classList.toggle('open');
  syncComposerToggles();
});
