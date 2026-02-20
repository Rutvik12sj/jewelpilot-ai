const HISTORY_KEY = 'lustrepilot_history_v1';
const SETTINGS_KEY = 'lustrepilot_settings_v1';
const PROJECTS_KEY = 'lustrepilot_projects_v1';
const VALIDATOR_AUTO_KEY = 'lustrepilot_validator_auto_v1';
const ONBOARD_DISMISSED_KEY = 'lustrepilot_onboarding_dismissed_v1';
const COMPACT_MODE_KEY = 'lustrepilot_compact_mode_v1';

const TEMPLATE_PRESETS = [
  {
    id: 'amazon-luxury',
    name: 'Amazon Luxury Listing',
    desc: 'Premium/luxury tone with gift-focused messaging.',
    defaults: {
      tone: 'luxury',
      audience: 'Premium shoppers',
      voice: 'Elegant, polished, upscale language. Avoid fluff. Keep buyer trust high.',
      notes: 'Gift-ready packaging, premium feel, focus on craftsmanship and sparkle.'
    }
  },
  {
    id: 'etsy-handmade',
    name: 'Etsy Handmade Style',
    desc: 'Warm handcrafted vibe for Etsy audience.',
    defaults: {
      tone: 'friendly',
      audience: 'Etsy audience',
      voice: 'Warm, handmade, story-driven copy with authentic tone.',
      notes: 'Handmade-inspired narrative, gifting angle, include occasion ideas.'
    }
  },
  {
    id: 'gift-season',
    name: 'Gift Season Push',
    desc: 'Holiday/gifting conversion focused template.',
    defaults: {
      tone: 'high-converting',
      audience: 'Gift buyers',
      voice: 'Clear, benefit-first, emotional gifting triggers with urgency.',
      notes: 'Mention ready-to-ship, gift moments, easy choice for birthdays/anniversary/holidays.'
    }
  },
  {
    id: 'minimal-clean',
    name: 'Minimal Clean Catalog',
    desc: 'Simple and concise listing style.',
    defaults: {
      tone: 'minimal',
      audience: 'US buyers',
      voice: 'Short, clear, no hype, high readability.',
      notes: 'Keep bullet points concise with practical specs and fit details.'
    }
  }
];

function showToast(text) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap || !text) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(4px)';
    setTimeout(() => toast.remove(), 220);
  }, 1800);
}

function dismissOnboarding() {
  localStorage.setItem(ONBOARD_DISMISSED_KEY, '1');
  const card = document.getElementById('onboardingCard');
  if (card) card.style.display = 'none';
}

function setStatus(text) {
  const status = document.getElementById('status');
  if (status) status.textContent = text;

  if (/saved|exported|copied|done|failed|error|applied|cleared/i.test(String(text || ''))) {
    showToast(text);
  }
}

function between(text, startRegex, endRegex) {
  const start = text.search(startRegex);
  if (start === -1) return '';
  const sliced = text.slice(start);
  const end = sliced.search(endRegex);
  return (end === -1 ? sliced : sliced.slice(0, end)).trim();
}

function titleCaseWord(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function deriveKeywordLineFromTitles(titleBlock = '') {
  const stop = new Set([
    'a', 'an', 'and', 'or', 'the', 'for', 'with', 'in', 'on', 'to', 'of', 'by', 'at', 'from',
    'is', 'are', 'as', 'this', 'that', 'it', 'your', 'you', 'our', 'their', 'be', 'up', 'new'
  ]);

  const words = (titleBlock.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((w) => w.length > 2 && !stop.has(w) && !/^\d+$/.test(w));

  const seen = new Set();
  const picked = [];
  for (const w of words) {
    if (!seen.has(w)) {
      seen.add(w);
      picked.push(titleCaseWord(w));
    }
    if (picked.length >= 20) break;
  }

  return picked.join(', ');
}

function parseSectionsByLetter(text) {
  const src = String(text || '').replace(/\r/g, '');
  const re = /^\s*(?:\*\*)?([A-H])\)\s*/gim;
  const hits = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    hits.push({ letter: m[1].toUpperCase(), index: m.index });
  }

  const sections = {};
  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i];
    const next = hits[i + 1];
    sections[cur.letter] = src.slice(cur.index, next ? next.index : src.length).trim();
  }
  return sections;
}

function stripHeadingLine(section = '') {
  return String(section || '')
    .replace(/^\s*(?:\*\*)?[A-H]\)\s*[^\n]*\n?/i, '')
    .trim();
}

function sanitizeLine(line = '') {
  return String(line || '')
    .replace(/^[-*•\s]+/, '')
    .replace(/^"|"$/g, '')
    .trim();
}

function extractBestTitle(text = '', sections = {}) {
  const b = stripHeadingLine(sections.B || '');
  const bLines = b.split('\n').map(sanitizeLine).filter(Boolean);

  let picked = '';
  for (const line of bLines) {
    const clean = line.replace(/^Why\s*:/i, '').trim();
    if (!clean || /^why\b/i.test(line)) continue;

    const aBody = stripHeadingLine(sections.A || '');
    const pickByLetter = (letter) => {
      const varRegex = new RegExp(`(?:^|\\n)\\s*[-*•]?\\s*${letter}[\\)\\.:\\-]?\\s*["']?([^\\n]+)`, 'i');
      const vm = aBody.match(varRegex);
      return vm?.[1] ? sanitizeLine(vm[1]) : '';
    };

    const letterOnly = clean.match(/^([A-C])[\)\.:\-]?\s*$/i);
    if (letterOnly) {
      const found = pickByLetter(letterOnly[1].toUpperCase());
      if (found) return found;
      continue;
    }

    const inferredLetter = clean.match(/^([A-C])\b/i);
    if (inferredLetter && /best/i.test(clean)) {
      const found = pickByLetter(inferredLetter[1].toUpperCase());
      if (found) return found;
      continue;
    }

    if (/is the best/i.test(clean)) continue;

    if (/[A-Za-z]/.test(clean) && clean.length > 12) {
      picked = clean;
      break;
    }
  }

  if (picked) return picked;

  const top1 = String(text || '').match(/Top\s*1\s*[:\-]\s*(.+)/i);
  if (top1?.[1]) return sanitizeLine(top1[1]);

  const aBody = stripHeadingLine(sections.A || '');
  const firstVariant = aBody.match(/(?:^|\n)\s*[-*•]?\s*A\)\s*["']?([^\n]+)/i);
  if (firstVariant?.[1]) return sanitizeLine(firstVariant[1]);

  return '';
}

function extractBulletLines(sectionF = '') {
  const body = stripHeadingLine(sectionF || '');
  const lines = body
    .split('\n')
    .map(sanitizeLine)
    .filter((x) => x && !/^F\)/i.test(x));

  const bullets = [];
  for (const line of lines) {
    const clean = line.replace(/^\d+[\).:-]\s*/, '').trim();
    if (clean) bullets.push(clean);
    if (bullets.length >= 5) break;
  }
  return bullets.join('\n');
}

function extractKeywordCsv(sectionG = '', fallback = '') {
  const body = stripHeadingLine(sectionG || fallback || '');
  const cleaned = body
    .replace(/^Keywords?\s*:/i, '')
    .replace(/^Backend\s*Keyword\s*List\s*:?/i, '')
    .replace(/^[-*•\s]+/, '')
    .replace(/\n+/g, ', ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  return cleaned;
}

function parseAmazonSections(text) {
  if (!text) return { title: '', bullets: '', keywords: '', backend: '' };

  const sections = parseSectionsByLetter(text);
  const title = extractBestTitle(text, sections);
  const bullets = extractBulletLines(sections.F || between(text, /F\)\s*5\s*Bullet Points/i, /\n\s*G\)\s|$|\n\s*$/i));

  const keywordLineMatch = String(text || '').match(/(?:^|\n)\s*Keywords?\s*:\s*(.+)/i);
  const keywordFallback = keywordLineMatch ? keywordLineMatch[1] : '';

  const keywordCsv = extractKeywordCsv(sections.G || sections.H || '', keywordFallback);
  const keywords = keywordCsv || deriveKeywordLineFromTitles(title);
  const backend = keywordCsv || keywords;

  return {
    title: title.trim(),
    bullets: bullets.trim(),
    keywords: keywords.trim(),
    backend: backend.trim()
  };
}

function cleanSectionText(value = '') {
  return String(value || '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/^[ \t]*#+[ \t]*/gm, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function setTabValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = cleanSectionText(value || '');
}

function normalizeAmazonSections(explicitSections = {}, fullText = '') {
  const rawTitle = String(explicitSections.title || '').trim();
  const rawBullets = String(explicitSections.bullets || '').trim();
  const rawKeywords = String(explicitSections.keywords || '').trim();
  const rawBackend = String(explicitSections.backend || '').trim();

  const parsedFromText = parseAmazonSections(fullText || '');

  const looksVerboseTitle = /Title Variations|Best Title Pick|\bA\)\b|\bB\)\b/i.test(rawTitle);
  const title = looksVerboseTitle ? (parsedFromText.title || rawTitle) : rawTitle;

  const bullets = extractBulletLines(rawBullets) || parsedFromText.bullets || rawBullets;
  const keywordCsv = extractKeywordCsv(rawKeywords || rawBackend, rawKeywords || rawBackend);
  const keywords = keywordCsv || parsedFromText.keywords;
  const backend = extractKeywordCsv(rawBackend || rawKeywords, rawBackend || rawKeywords) || keywords || parsedFromText.backend;

  return { title, bullets, keywords, backend };
}

function populateAmazonTabs(text, explicitSections = null) {
  const sections = explicitSections
    ? normalizeAmazonSections(explicitSections, text)
    : parseAmazonSections(text);

  setTabValue('tabTitle', sections.title);
  setTabValue('tabBullets', sections.bullets);
  setTabValue('tabKeywords', sections.keywords);
  setTabValue('tabBackend', sections.backend);
}

function parseShopifySections(text) {
  const src = String(text || '').replace(/\r/g, '');
  const title = (src.match(/Shopify\s*Title\s*[:\-]\s*([^\n]+)/i) || [])[1] || '';
  const handle = (src.match(/Handle\s*[:\-]\s*([^\n]+)/i) || [])[1] || '';
  const tags = (src.match(/Tags\s*[:\-]\s*([^\n]+)/i) || [])[1] || '';

  const descMatch = src.match(/Description\s*[:\-]\s*([\s\S]*?)(?:\n\s*HTML\s*Description\s*[:\-]|\n\s*SEO\s*Title\s*[:\-]|$)/i);
  const htmlMatch = src.match(/HTML\s*Description\s*[:\-]\s*([\s\S]*?)(?:\n\s*Key\s*Features\s*[:\-]|\n\s*SEO\s*Title\s*[:\-]|$)/i);
  const seoTitle = (src.match(/SEO\s*Title\s*[:\-]\s*([^\n]+)/i) || [])[1] || '';
  const seoMeta = (src.match(/Meta\s*Description\s*[:\-]\s*([^\n]+)/i) || [])[1] || '';

  return {
    title: title.trim(),
    description: (descMatch?.[1] || '').trim(),
    html: (htmlMatch?.[1] || '').trim(),
    seo: [seoTitle ? `SEO Title: ${seoTitle.trim()}` : '', seoMeta ? `Meta Description: ${seoMeta.trim()}` : ''].filter(Boolean).join('\n'),
    tags: tags.trim(),
    handle: handle.trim()
  };
}

function populateShopifyTabs(text, explicitSections = null) {
  const sections = explicitSections || parseShopifySections(text);
  setTabValue('shopifyTitle', sections.title || '');
  setTabValue('shopifyDescription', sections.description || '');
  setTabValue('shopifyHtml', sections.html || '');
  setTabValue('shopifySeo', sections.seo || '');
  setTabValue('shopifyTags', sections.tags || '');
  setTabValue('shopifyHandle', sections.handle || '');
}

function getCurrentTypeFromOutput() {
  if (document.getElementById('tabTitle')?.value?.trim()) return 'amazon';
  if (document.getElementById('shopifyTitle')?.value?.trim()) return 'shopify';
  return 'generic';
}

function validateCurrentOutput() {
  const type = getCurrentTypeFromOutput();
  const checks = [];
  const riskWords = ['guaranteed', 'cure', 'healing', 'miracle', 'best price', '100%'];

  if (type === 'amazon') {
    const title = (document.getElementById('tabTitle')?.value || '').trim();
    const bullets = (document.getElementById('tabBullets')?.value || '').trim().split('\n').filter(Boolean);
    const keywords = (document.getElementById('tabKeywords')?.value || '').split(',').map((x) => x.trim()).filter(Boolean);
    const joined = [title, ...bullets, ...keywords].join(' ').toLowerCase();

    checks.push({ ok: title.length > 10 && title.length <= 180, msg: `Amazon title length: ${title.length}/180` });
    checks.push({ ok: bullets.length >= 5, msg: `Amazon bullets count: ${bullets.length} (target 5+)` });
    checks.push({ ok: keywords.length >= 10, msg: `Amazon keywords count: ${keywords.length} (target 10+)` });
    checks.push({ ok: !riskWords.some((w) => joined.includes(w)), msg: 'Policy-risk words check' });
  } else if (type === 'shopify') {
    const title = (document.getElementById('shopifyTitle')?.value || '').trim();
    const html = (document.getElementById('shopifyHtml')?.value || '').trim();
    const seo = (document.getElementById('shopifySeo')?.value || '').trim();
    const tags = (document.getElementById('shopifyTags')?.value || '').split(',').map((x) => x.trim()).filter(Boolean);
    const joined = [title, html, seo, tags.join(', ')].join(' ').toLowerCase();

    checks.push({ ok: title.length > 10 && title.length <= 140, msg: `Shopify title length: ${title.length}/140` });
    checks.push({ ok: /<p>|<ul>|<li>/i.test(html), msg: 'Shopify HTML includes supported tags' });
    checks.push({ ok: seo.length > 20, msg: 'Shopify SEO section present' });
    checks.push({ ok: tags.length >= 6, msg: `Shopify tags count: ${tags.length} (target 6+)` });
    checks.push({ ok: !riskWords.some((w) => joined.includes(w)), msg: 'Policy-risk words check' });
  } else {
    const out = (document.getElementById('output')?.value || '').trim();
    checks.push({ ok: out.length > 40, msg: `Output length: ${out.length}` });
  }

  const pass = checks.filter((c) => c.ok).length;
  const summary = `${pass}/${checks.length} checks passed (${type.toUpperCase()})`;
  const details = checks.map((c) => `${c.ok ? '✅' : '⚠️'} ${c.msg}`).join('\n');

  const summaryEl = document.getElementById('validatorSummary');
  const detailsEl = document.getElementById('validatorDetails');
  if (summaryEl) {
    summaryEl.textContent = summary;
    summaryEl.classList.remove('validator-good', 'validator-warn', 'validator-bad');
    const ratio = checks.length ? pass / checks.length : 0;
    if (ratio >= 0.85) summaryEl.classList.add('validator-good');
    else if (ratio >= 0.5) summaryEl.classList.add('validator-warn');
    else summaryEl.classList.add('validator-bad');
  }
  if (detailsEl) detailsEl.value = details;

  return { type, checks };
}

function fixIssues() {
  const type = getCurrentTypeFromOutput();
  if (type === 'amazon') {
    const bulletsEl = document.getElementById('tabBullets');
    const bullets = (bulletsEl?.value || '').split('\n').map((x) => x.trim()).filter(Boolean);
    while (bullets.length < 5) bullets.push('Add concise buyer-focused feature benefit.');
    if (bulletsEl) bulletsEl.value = bullets.slice(0, 5).join('\n');
  }
  if (type === 'shopify') {
    const htmlEl = document.getElementById('shopifyHtml');
    if (htmlEl && htmlEl.value && !/<p>/i.test(htmlEl.value)) {
      htmlEl.value = `<p>${htmlEl.value}</p>`;
    }
  }
  validateCurrentOutput();
  setStatus('Issues fixed where possible');
}

async function runThreeVariants() {
  const output = document.getElementById('output');
  const settings = getSettings();
  const product = {
    name: document.getElementById('name').value,
    metal: document.getElementById('metal').value,
    stone: document.getElementById('stone').value,
    targetPrice: document.getElementById('price').value,
    notes: document.getElementById('notes').value
  };

  setStatus('Generating 3 variants...');
  try {
    const types = ['etsy', 'shopify', 'ads'];
    const chunks = [];
    for (const t of types) {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: t, product, modelTier: settings.modelTier, settings, variants: 3 })
      });
      const data = await res.json();
      chunks.push(`=== ${t.toUpperCase()} VARIANTS ===\n${data.content || data.error || 'No response'}`);
    }
    output.value = chunks.join('\n\n');
    validateCurrentOutput();
    setStatus('3 variants generated');
  } catch {
    setStatus('Variant generation failed');
  }
}

function showTab(name) {
  const tabs = ['title', 'bullets', 'keywords', 'backend'];
  tabs.forEach((t) => {
    const panel = document.getElementById(`panel-${t}`);
    const btn = document.getElementById(`btn-${t}`);
    const active = t === name;
    if (panel) panel.style.display = active ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', active);
  });
}

function showShopifyTab(name) {
  const tabs = ['title', 'description', 'html', 'seo', 'tags', 'handle'];
  tabs.forEach((t) => {
    const panel = document.getElementById(`panel-shopify-${t}`);
    const btn = document.getElementById(`btn-shopify-${t}`);
    const active = t === name;
    if (panel) panel.style.display = active ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', active);
  });
}

function showPage(name) {
  const pages = ['generator', 'history', 'settings', 'templates'];
  pages.forEach((p) => {
    const page = document.getElementById(`page-${p}`);
    const btn = document.getElementById(`nav-${p}`);
    const active = p === name;
    if (page) page.style.display = active ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', active);
  });
}

function renderTemplates() {
  const list = document.getElementById('templateList');
  if (!list) return;

  list.innerHTML = TEMPLATE_PRESETS.map((t) => `
    <div class="template-card">
      <h4>${t.name}</h4>
      <p>${t.desc}</p>
      <button onclick="applyTemplate('${t.id}')">Apply Template</button>
    </div>
  `).join('');
}

function applyTemplate(id) {
  const t = TEMPLATE_PRESETS.find((x) => x.id === id);
  if (!t) return;
  const d = t.defaults || {};
  if (d.tone) document.getElementById('settingTone').value = d.tone;
  if (d.audience) document.getElementById('settingAudience').value = d.audience;
  if (d.voice != null) document.getElementById('settingVoice').value = d.voice;
  if (d.notes != null) {
    const current = document.getElementById('notes').value.trim();
    document.getElementById('notes').value = current ? `${current}\n${d.notes}` : d.notes;
  }
  saveSettings();
  showPage('generator');
  setStatus(`Template applied: ${t.name}`);
}

function getSettings() {
  const tone = document.getElementById('settingTone')?.value || 'high-converting';
  const audience = document.getElementById('settingAudience')?.value || 'US buyers';
  const voice = document.getElementById('settingVoice')?.value || '';
  const modelTier = document.getElementById('modelTier')?.value || 'balanced';
  return { tone, audience, voice, modelTier };
}

function saveSettings() {
  const settings = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  setStatus('Settings saved');
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.tone) document.getElementById('settingTone').value = s.tone;
    if (s.audience) document.getElementById('settingAudience').value = s.audience;
    if (s.voice != null) document.getElementById('settingVoice').value = s.voice;
    if (s.modelTier) document.getElementById('modelTier').value = s.modelTier;
  } catch {}
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistoryItem(item) {
  const items = getHistory();
  items.unshift(item);
  const trimmed = items.slice(0, 30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  renderHistory();
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;
  const items = getHistory();
  if (!items.length) {
    list.innerHTML = '<div class="history-empty">No generations yet. Start in Generator, then your runs will show up here with one-click reload.</div>';
    return;
  }

  list.innerHTML = items.map((it, idx) => `
    <div class="history-item">
      <div class="history-head">
        <div><strong>${it.type}</strong> • ${it.modelTier} • ${it.productName || 'Unnamed product'}</div>
        <div class="history-time">${formatTime(it.ts)}</div>
      </div>
      <div class="history-actions">
        <button onclick="loadHistoryItem(${idx})">Load</button>
        <button onclick="copyHistoryItem(${idx})">Copy</button>
      </div>
      <div class="history-preview">${String(it.content || '').slice(0, 220).replace(/</g, '&lt;')}</div>
    </div>
  `).join('');
}

function loadHistoryItem(index) {
  const item = getHistory()[index];
  if (!item) return;
  document.getElementById('output').value = item.content || '';
  populateAmazonTabs(item.content || '');
  populateShopifyTabs(item.content || '');
  showPage('generator');
  setStatus('Loaded from history');
}

function copyHistoryItem(index) {
  const item = getHistory()[index];
  if (!item) return;
  copyText(item.content || '', 'History item');
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  setStatus('History cleared');
}

function getProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveProjects(items) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(items.slice(0, 50)));
}

function saveProject() {
  const nameInput = document.getElementById('projectName');
  const name = (nameInput?.value || '').trim() || `Project ${new Date().toLocaleString()}`;
  const project = {
    id: `p_${Date.now()}`,
    name,
    ts: Date.now(),
    product: {
      name: document.getElementById('name').value,
      metal: document.getElementById('metal').value,
      stone: document.getElementById('stone').value,
      targetPrice: document.getElementById('price').value,
      notes: document.getElementById('notes').value
    },
    modelTier: document.getElementById('modelTier')?.value || 'balanced',
    output: document.getElementById('output').value || '',
    amazon: {
      title: document.getElementById('tabTitle')?.value || '',
      bullets: document.getElementById('tabBullets')?.value || '',
      keywords: document.getElementById('tabKeywords')?.value || '',
      backendTerms: document.getElementById('tabBackend')?.value || ''
    },
    shopify: {
      title: document.getElementById('shopifyTitle')?.value || '',
      description: document.getElementById('shopifyDescription')?.value || '',
      html: document.getElementById('shopifyHtml')?.value || '',
      seo: document.getElementById('shopifySeo')?.value || '',
      tags: document.getElementById('shopifyTags')?.value || '',
      handle: document.getElementById('shopifyHandle')?.value || ''
    },
    performance: {
      ctr: document.getElementById('perfCtr')?.value || '',
      cvr: document.getElementById('perfCvr')?.value || '',
      sales: document.getElementById('perfSales')?.value || '',
      notes: document.getElementById('perfNotes')?.value || ''
    }
  };

  const items = getProjects();
  items.unshift(project);
  saveProjects(items);
  if (nameInput) nameInput.value = '';
  renderProjects();
  setStatus('Project saved');
}

function loadProject(id) {
  const p = getProjects().find((x) => x.id === id);
  if (!p) return;
  document.getElementById('name').value = p.product?.name || '';
  document.getElementById('metal').value = p.product?.metal || '';
  document.getElementById('stone').value = p.product?.stone || '';
  document.getElementById('price').value = p.product?.targetPrice || '';
  document.getElementById('notes').value = p.product?.notes || '';
  document.getElementById('modelTier').value = p.modelTier || 'balanced';
  document.getElementById('output').value = p.output || '';
  setTabValue('tabTitle', p.amazon?.title || '');
  setTabValue('tabBullets', p.amazon?.bullets || '');
  setTabValue('tabKeywords', p.amazon?.keywords || '');
  setTabValue('tabBackend', p.amazon?.backendTerms || '');
  setTabValue('shopifyTitle', p.shopify?.title || '');
  setTabValue('shopifyDescription', p.shopify?.description || '');
  setTabValue('shopifyHtml', p.shopify?.html || '');
  setTabValue('shopifySeo', p.shopify?.seo || '');
  setTabValue('shopifyTags', p.shopify?.tags || '');
  setTabValue('shopifyHandle', p.shopify?.handle || '');
  if (document.getElementById('perfCtr')) document.getElementById('perfCtr').value = p.performance?.ctr || '';
  if (document.getElementById('perfCvr')) document.getElementById('perfCvr').value = p.performance?.cvr || '';
  if (document.getElementById('perfSales')) document.getElementById('perfSales').value = p.performance?.sales || '';
  if (document.getElementById('perfNotes')) document.getElementById('perfNotes').value = p.performance?.notes || '';
  showPage('generator');
  setStatus('Project loaded');
}

function deleteProject(id) {
  const items = getProjects().filter((x) => x.id !== id);
  saveProjects(items);
  renderProjects();
  setStatus('Project deleted');
}

function copyProject(id) {
  const p = getProjects().find((x) => x.id === id);
  if (!p) return;
  copyText(p.output || '', 'Project output');
}

function reuseWinningPattern(id) {
  const p = getProjects().find((x) => x.id === id);
  if (!p) return;
  const winnerNotes = [
    'Reuse winning pattern from previous high-performing listing:',
    p.product?.name ? `Reference product: ${p.product.name}` : '',
    p.performance?.ctr ? `CTR: ${p.performance.ctr}` : '',
    p.performance?.cvr ? `CVR: ${p.performance.cvr}` : '',
    p.performance?.sales ? `Sales: ${p.performance.sales}` : '',
    p.performance?.notes ? `Notes: ${p.performance.notes}` : ''
  ].filter(Boolean).join('\n');

  const notesEl = document.getElementById('notes');
  if (notesEl) notesEl.value = notesEl.value ? `${notesEl.value}\n\n${winnerNotes}` : winnerNotes;
  setStatus('Winning pattern appended to notes');
}

function renderProjects() {
  const list = document.getElementById('projectList');
  if (!list) return;
  const items = getProjects();
  if (!items.length) {
    list.innerHTML = '<div class="history-empty">No saved projects yet. Save a good generation to build your winning library.</div>';
    return;
  }
  list.innerHTML = items.map((p) => `
    <div class="history-item">
      <div class="history-head">
        <div><strong>${p.name}</strong></div>
        <div class="history-time">${formatTime(p.ts)}</div>
      </div>
      <div class="history-preview">CTR: ${p.performance?.ctr || '-'} | CVR: ${p.performance?.cvr || '-'} | Sales: ${p.performance?.sales || '-'} ${p.performance?.notes ? `| Notes: ${String(p.performance.notes).replace(/</g,'&lt;')}` : ''}</div>
      <div class="history-actions">
        <button onclick="loadProject('${p.id}')">Open</button>
        <button onclick="copyProject('${p.id}')">Copy</button>
        <button onclick="reuseWinningPattern('${p.id}')">Reuse Pattern</button>
        <button onclick="deleteProject('${p.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function copyAllAmazonFields() {
  const all = [
    'TITLE:\n' + (document.getElementById('tabTitle')?.value || ''),
    'BULLETS:\n' + (document.getElementById('tabBullets')?.value || ''),
    'KEYWORDS:\n' + (document.getElementById('tabKeywords')?.value || ''),
    'BACKEND TERMS:\n' + (document.getElementById('tabBackend')?.value || '')
  ].join('\n\n');
  copyText(all, 'All Amazon fields');
}

function copyAllShopifyFields() {
  const all = [
    'TITLE:\n' + (document.getElementById('shopifyTitle')?.value || ''),
    'DESCRIPTION:\n' + (document.getElementById('shopifyDescription')?.value || ''),
    'HTML DESCRIPTION:\n' + (document.getElementById('shopifyHtml')?.value || ''),
    'SEO:\n' + (document.getElementById('shopifySeo')?.value || ''),
    'TAGS:\n' + (document.getElementById('shopifyTags')?.value || ''),
    'HANDLE:\n' + (document.getElementById('shopifyHandle')?.value || '')
  ].join('\n\n');
  copyText(all, 'All Shopify fields');
}

function copyShopifyPublishPack() {
  const pack = {
    title: document.getElementById('shopifyTitle')?.value || '',
    body_html: document.getElementById('shopifyHtml')?.value || '',
    seo: document.getElementById('shopifySeo')?.value || '',
    tags: (document.getElementById('shopifyTags')?.value || '').split(',').map((x) => x.trim()).filter(Boolean),
    handle: document.getElementById('shopifyHandle')?.value || ''
  };
  copyText(JSON.stringify(pack, null, 2), 'Shopify product pack');
}

function exportProjectBundle() {
  const bundle = {
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    product: {
      name: document.getElementById('name').value,
      metal: document.getElementById('metal').value,
      stone: document.getElementById('stone').value,
      targetPrice: document.getElementById('price').value,
      notes: document.getElementById('notes').value
    },
    amazon: {
      title: document.getElementById('tabTitle')?.value || '',
      bullets: document.getElementById('tabBullets')?.value || '',
      keywords: document.getElementById('tabKeywords')?.value || '',
      backendTerms: document.getElementById('tabBackend')?.value || ''
    },
    shopify: {
      title: document.getElementById('shopifyTitle')?.value || '',
      description: document.getElementById('shopifyDescription')?.value || '',
      html: document.getElementById('shopifyHtml')?.value || '',
      seo: document.getElementById('shopifySeo')?.value || '',
      tags: document.getElementById('shopifyTags')?.value || '',
      handle: document.getElementById('shopifyHandle')?.value || ''
    },
    performance: {
      ctr: document.getElementById('perfCtr')?.value || '',
      cvr: document.getElementById('perfCvr')?.value || '',
      sales: document.getElementById('perfSales')?.value || '',
      notes: document.getElementById('perfNotes')?.value || ''
    },
    output: document.getElementById('output').value || ''
  };
  downloadFile('lustrepilot-project-bundle.json', JSON.stringify(bundle, null, 2), 'application/json');
  setStatus('Project bundle exported');
}

async function run(type) {
  const output = document.getElementById('output');
  const settings = getSettings();
  output.value = 'Generating...';
  setStatus(`Generating ${type} (${settings.modelTier})...`);

  const product = {
    name: document.getElementById('name').value,
    metal: document.getElementById('metal').value,
    stone: document.getElementById('stone').value,
    targetPrice: document.getElementById('price').value,
    notes: document.getElementById('notes').value
  };

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, product, modelTier: settings.modelTier, settings })
    });
    const data = await res.json();
    const content = data.content || data.error || 'No response';

    populateAmazonTabs(content, data.amazonSections || null);
    populateShopifyTabs(content, data.shopifySections || null);

    const finalTitleOnly = (type === 'amazon' && data.amazonSections?.title)
      ? String(data.amazonSections.title).trim()
      : '';

    const finalShopifyTitleOnly = (type === 'shopify' && data.shopifySections?.title)
      ? String(data.shopifySections.title).trim()
      : '';

    const displayContent = finalTitleOnly || finalShopifyTitleOnly || content;
    output.value = displayContent;

    saveHistoryItem({ ts: Date.now(), type, modelTier: settings.modelTier, productName: product.name, content: displayContent });
    validateCurrentOutput();
    setStatus((finalTitleOnly || finalShopifyTitleOnly) ? 'Done (final title mode)' : 'Done');
  } catch (e) {
    output.value = 'Error generating output.';
    setStatus('Error');
  }
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text || '');
    setStatus(`${label} copied`);
  } catch {
    setStatus('Copy failed');
  }
}

function copyById(id, label) {
  const value = document.getElementById(id)?.value || '';
  if (!value) {
    setStatus(`No ${label.toLowerCase()} found`);
    return;
  }
  copyText(value, label);
}

function copyAll() {
  copyText(document.getElementById('output').value, 'Full output');
}

function copySection(type) {
  const map = { title: 'tabTitle', bullets: 'tabBullets', keywords: 'tabKeywords', backend: 'tabBackend' };
  const id = map[type];
  const val = id ? document.getElementById(id)?.value : '';
  if (!val) {
    setStatus(`No ${type} section found`);
    return;
  }
  copyText(val, `${type} tab`);
}

function copyShopifySection(type) {
  const map = {
    title: 'shopifyTitle',
    description: 'shopifyDescription',
    html: 'shopifyHtml',
    seo: 'shopifySeo',
    tags: 'shopifyTags',
    handle: 'shopifyHandle'
  };
  const id = map[type];
  const val = id ? document.getElementById(id)?.value : '';
  if (!val) {
    setStatus(`No Shopify ${type} found`);
    return;
  }
  copyText(val, `Shopify ${type}`);
}

function downloadFile(filename, content, contentType = 'text/plain') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportTxt() {
  downloadFile('lustrepilot-output.txt', document.getElementById('output').value || '');
  setStatus('TXT exported');
}

function csvEscape(value) {
  const v = String(value ?? '');
  return `"${v.replace(/"/g, '""')}"`;
}

function exportCsv() {
  const product = {
    name: document.getElementById('name').value,
    metal: document.getElementById('metal').value,
    stone: document.getElementById('stone').value,
    targetPrice: document.getElementById('price').value,
    notes: document.getElementById('notes').value,
    output: document.getElementById('output').value,
    title: document.getElementById('tabTitle')?.value || '',
    bullets: document.getElementById('tabBullets')?.value || '',
    keywords: document.getElementById('tabKeywords')?.value || '',
    backendTerms: document.getElementById('tabBackend')?.value || '',
    shopifyTitle: document.getElementById('shopifyTitle')?.value || '',
    shopifyDescription: document.getElementById('shopifyDescription')?.value || '',
    shopifyHtml: document.getElementById('shopifyHtml')?.value || '',
    shopifySeo: document.getElementById('shopifySeo')?.value || '',
    shopifyTags: document.getElementById('shopifyTags')?.value || '',
    shopifyHandle: document.getElementById('shopifyHandle')?.value || ''
  };
  const headers = ['name', 'metal', 'stone', 'targetPrice', 'notes', 'title', 'bullets', 'keywords', 'backendTerms', 'shopifyTitle', 'shopifyDescription', 'shopifyHtml', 'shopifySeo', 'shopifyTags', 'shopifyHandle', 'output'];
  const row = headers.map((h) => csvEscape(product[h])).join(',');
  downloadFile('lustrepilot-output.csv', `${headers.join(',')}\n${row}\n`, 'text/csv');
  setStatus('CSV exported');
}

window.addEventListener('DOMContentLoaded', () => {
  showPage('generator');
  showTab('title');
  showShopifyTab('title');
  loadSettings();
  renderHistory();
  renderProjects();
  renderTemplates();

  const onboardingCard = document.getElementById('onboardingCard');
  const onboardingDismissed = localStorage.getItem(ONBOARD_DISMISSED_KEY) === '1';
  if (onboardingCard && !onboardingDismissed) onboardingCard.style.display = 'block';

  const compactEl = document.getElementById('compactMode');
  const compactSaved = localStorage.getItem(COMPACT_MODE_KEY) === '1';
  if (compactSaved) document.body.classList.add('compact');
  if (compactEl) {
    compactEl.checked = compactSaved;
    compactEl.addEventListener('change', () => {
      const on = compactEl.checked;
      document.body.classList.toggle('compact', on);
      localStorage.setItem(COMPACT_MODE_KEY, on ? '1' : '0');
    });
  }

  const autoEl = document.getElementById('validatorAuto');
  const savedAuto = localStorage.getItem(VALIDATOR_AUTO_KEY) === '1';
  if (autoEl) {
    autoEl.checked = savedAuto;
    autoEl.addEventListener('change', () => {
      localStorage.setItem(VALIDATOR_AUTO_KEY, autoEl.checked ? '1' : '0');
      if (autoEl.checked) validateCurrentOutput();
    });
  }

  let timer;
  document.addEventListener('input', () => {
    if (!document.getElementById('validatorAuto')?.checked) return;
    clearTimeout(timer);
    timer = setTimeout(() => validateCurrentOutput(), 450);
  });

  validateCurrentOutput();
});
