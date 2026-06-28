// =================== VANDHU MAKKAL KURAL - APP.JS ===================

const API = '/api';
const categoryLabel = {
  road: "சாலை",
  water: "குடிநீர்",
  electricity: "மின்சாரம்",
  garbage: "குப்பை",
  drainage: "வடிகால்",
  streetlight: "தெருவிளக்கு",
  noise: "சத்தம்",
  pollution: "மாசு",
  corruption: "ஊழல்",
  health: "சுகாதாரம்",
  transport: "போக்குவரத்து",
  other: "மற்றவை"
};
let currentLang = 'tamil';
let currentPage = 1;
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let voiceBlob = null;
let selectedImages = [];

// ======= LANGUAGE TOGGLE =======
function toggleLang() {
  currentLang = currentLang === 'tamil' ? 'english' : 'tamil';
    localStorage.setItem('lang', currentLang);
  document.getElementById('langLabel').textContent = currentLang === 'tamil' ? 'English' : 'தமிழ்';
  document.documentElement.lang = currentLang === 'tamil' ? 'ta' : 'en';
  applyLang();
}

function applyLang() {
  const attr = `data-${currentLang}`;
  document.querySelectorAll(`[${attr}]`).forEach(el => {
    el.textContent = el.getAttribute(attr);
  });
  // Update placeholders
  const phs = {
    'f-name': { tamil: 'உங்கள் பெயர்', english: 'Your Name' },
    'f-phone': { tamil: '9876543210', english: '9876543210' },
    'f-email': { tamil: 'விரும்பினால்', english: 'optional' },
    'f-address': { tamil: 'தெரு, ஊர், பகுதி...', english: 'Street, Area, City...' },
    'f-title': { tamil: 'புகாரின் சுருக்கமான தலைப்பு...', english: 'Brief complaint title...' },
    'f-description': { tamil: 'சிக்கலை விரிவாக விளக்குங்கள்...', english: 'Describe the issue in detail...' },
    'trackInput': { tamil: 'VMK-2024-00001 அல்லது Phone Number', english: 'VMK-2024-00001 or Phone Number' }
  };
  Object.entries(phs).forEach(([id, vals]) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = vals[currentLang] || vals.tamil;
  });
}

// ======= PAGE NAVIGATION =======
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageName}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (pageName === 'home') loadStats(), loadRecentFeed();
  if (pageName === 'feed') { currentPage = 1; loadFeed(); }
  if (pageName === 'admin') loadAdminDashboard();
}

function startComplaintWithCategory(cat) {
  showPage('submit');
  setTimeout(() => {
    const sel = document.getElementById('f-category');
    if (sel) sel.value = cat;
  }, 100);
}

// ======= LOAD STATS =======
async function loadStats() {
  try {
    const res = await fetch(`${API}/complaints/stats`);
    const data = await res.json();
    if (data.success) {
      animateNum('statTotal', data.stats.total);
      animateNum('statPending', data.stats.pending);
      animateNum('statResolved', data.stats.resolved);
      animateNum('statUrgent', data.stats.urgent);
    }
  } catch (e) {
    ['statTotal','statPending','statResolved','statUrgent'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
  }
}

function animateNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const duration = 800;
  const step = (target - start) / (duration / 16);
  let current = start;
  const timer = setInterval(() => {
    current += step;
    if ((step > 0 && current >= target) || (step < 0 && current <= target)) {
      el.textContent = target;
      clearInterval(timer);
    } else {
      el.textContent = Math.round(current);
    }
  }, 16);
}

// ======= LOAD RECENT FEED =======
async function loadRecentFeed() {
  const container = document.getElementById('recentFeed');
  container.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
  try {
    const res = await fetch(`${API}/complaints?limit=6&sort=-createdAt`);
    const data = await res.json();
    if (data.complaints && data.complaints.length > 0) {
      container.innerHTML = data.complaints.map(renderComplaintCard).join('');
    } else {
      container.innerHTML = `
  <div class="empty-state">
    <p data-ta="இன்னும் புகார்கள் இல்லை" data-en="No complaints yet">
      இன்னும் புகார்கள் இல்லை
    </p>
  </div>
`;
    }
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>Server உடன் இணைக்க முடியவில்லை. npm start இயக்குங்கள்.</p></div>`;
  }
}

// ======= LOAD FEED (FILTERED) =======
let feedDebounce = null;
function loadFeed() {
  clearTimeout(feedDebounce);
  feedDebounce = setTimeout(_loadFeed, 300);
}

async function _loadFeed() {
  const container = document.getElementById('fullFeed');
  container.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
  const status = document.getElementById('filterStatus')?.value || '';
  const category = document.getElementById('filterCategory')?.value || '';
  const sort = document.getElementById('filterSort')?.value || '-createdAt';
  const search = document.getElementById('filterSearch')?.value || '';
  const params = new URLSearchParams({ page: currentPage, limit: 10, sort });
  if (status) params.set('status', status);
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  try {
    const res = await fetch(`${API}/complaints?${params}`);
    const data = await res.json();
    if (data.complaints && data.complaints.length > 0) {
      const grouped = {};

  data.complaints.forEach(c => {
 const key = c.phone || (c.name + "_" + c.street + "_" + c.ward);// user identify
  if (!grouped[key]) grouped[key] = [];
  grouped[key].push(c);
  });

container.innerHTML = Object.values(grouped)
  .sort((a, b) => b.length - a.length)
  .map(group => renderUserGroup(group))
  .join('');
      renderPagination(data.totalPages);
    } else {
      container.innerHTML = `
  <div class="empty-state">
    <p data-ta="புகார்கள் இல்லை" data-en="No complaints found">
      புகார்கள் இல்லை
    </p>
  </div>
`;
      renderPagination(0);
    }
  } catch (e) {
    container.innerHTML = `
  <div class="empty-state">
    <p data-ta="சேவையகப் பிழை. மீண்டும் முயற்சிக்கவும்"
       data-en="Server error. Please try again">
      சேவையகப் பிழை. மீண்டும் முயற்சிக்கவும்
    </p>
  </div>
`;
  }
}

function renderPagination(totalPages) {
  const pg = document.getElementById('pagination');
  if (!pg || totalPages <= 1) { if (pg) pg.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  pg.innerHTML = html;
}

function goToPage(p) { currentPage = p; _loadFeed(); }

// ======= RENDER COMPLAINT CARD =======
function renderComplaintCard(c) {
  const statusLabel = { pending: 'நிலுவை', inprogress: 'செயல்பாட்டில்', resolved: 'தீர்க்கப்பட்டது', rejected: 'நிராகரிக்கப்பட்டது', closed: 'மூடப்பட்டது' };
  const catIcon = { road:'🛣️', water:'💧', electricity:'⚡', garbage:'🗑️', drainage:'🚰', streetlight:'💡', noise:'🔊', pollution:'🌫️', corruption:'⚖️', health:'🏥', transport:'🚌', other:'📌' };
  const prioClass = { urgent: 'badge-urgent', high: 'badge-high', medium: 'badge-pending', low: 'badge-low' };
  const date = new Date(c.createdAt).toLocaleDateString('ta-IN');
  const hasVoice = c.voiceNote ? '<span class="voice-indicator">🎙️ குரல்</span>' : '';
  return `
  <div class="complaint-card" onclick="openDetail('${c._id}')">
    <div class="card-header">
      <span class="card-id">${c.complaintId}</span>
      <span class="badge badge-${c.status}">${statusLabel[c.status] || c.status}</span>
    </div>
    <div class="card-title">${escHtml(c.title)}</div>
    <div class="card-desc">${escHtml(c.description)}</div>
    <div class="card-meta">
      <span class="badge badge-cat">${catIcon[c.category] || '📌'} ${categoryLabel[c.category]}</span>
      <span class="badge ${prioClass[c.priority] || ''}">${c.priority}</span>
      <span class="card-views">👁 ${c.views}</span>
      ${hasVoice}
      <span class="card-date">${date}</span>
    </div>
    <div class="card-actions" onclick="event.stopPropagation()">
      <button class="btn-upvote" onclick="upvote('${c._id}', this)">
        👍 <span class="upvote-count">${c.upvotes}</span>
        <span style="font-size:11px" data-ta="ஆதரவு" data-en="Support">ஆதரவு</span>
      </button>
      <span style="font-size:12px;color:var(--text3)">📍 ${escHtml(c.street)}, ${escHtml(c.ward)}</span>
    </div>
  </div>`;
}
function renderUserGroup(complaints) {
  const user = complaints[0];

  return `
  <div style="margin-bottom:20px;border:1px solid var(--border);border-radius:12px;padding:12px">
    
    <div style="font-weight:700;margin-bottom:10px">
      👤 ${user.name} (${user.phone || 'No phone'}) — ${complaints.length} complaints
    </div>

    ${complaints.map(c => `
      <div style="margin-bottom:10px;padding:10px;background:var(--bg3);border-radius:8px">
        <div style="font-weight:600">${c.title}</div>
        <div style="font-size:13px;color:var(--text2)">
          ${categoryLabel[c.category]} • ${c.street}, ${c.ward}
        </div>
        <div style="font-size:12px">👍 ${c.upvotes}</div>
      </div>
    `).join('')}

  </div>`;
}
// ======= OPEN DETAIL =======
async function openDetail(id) {
  const modal = document.getElementById('detailModal');
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('detailContent');
  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');
  content.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
  setTimeout(() => modal.classList.add('show'), 10);
  try {
    const res = await fetch(`${API}/complaints/${id}`);
    const data = await res.json();
    if (data.success) content.innerHTML = renderDetail(data.complaint);
  } catch (e) {
    content.innerHTML = '<p>Error loading complaint</p>';
  }
}

function renderDetail(c) {
  const statusLabel = { pending: 'நிலுவையில்', inprogress: 'செயல்பாட்டில்', resolved: 'தீர்க்கப்பட்டது', rejected: 'நிராகரிக்கப்பட்டது', closed: 'மூடப்பட்டது' };
  const date = new Date(c.createdAt).toLocaleDateString('ta-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const imgs = (c.images || []).map(img => `<img src="/uploads/images/${img}" alt="evidence" onclick="window.open(this.src)" />`).join('');
  const voice = c.voiceNote ? `<audio controls src="/uploads/voice/${c.voiceNote}" style="width:100%;margin-top:8px"></audio>` : '';
  const adminResp = c.adminResponse ? `<div class="admin-response-box"><h4>✅ அதிகாரி பதில்</h4><p>${escHtml(c.adminResponse)}</p></div>` : '';
  return `
  <div class="detail-header">
    <div class="detail-id">${c.complaintId} &nbsp;|&nbsp; 📍 ${escHtml(c.street)} - ${escHtml(c.ward)} &nbsp;|&nbsp; ${date}</div>
    <div class="detail-title">${escHtml(c.title)}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <span class="badge badge-${c.status}">${statusLabel[c.status]}</span>
      <span class="badge badge-cat">${categoryLabel[c.category]}</span>
      <span class="badge ${c.priority === 'urgent' ? 'badge-urgent' : 'badge-high'}">${c.priority}</span>
      <span class="badge badge-cat">👍 ${c.upvotes} ஆதரவு</span>
      <span class="badge badge-cat">👁 ${c.views} பார்வை</span>
    </div>
  </div>
  <div class="detail-section">
    <h4>புகாரின் விவரம்</h4>
    <p>${escHtml(c.description)}</p>
  </div>
  <div class="detail-section">
    <h4>தொடர்பு</h4>
    <p>${escHtml(c.name)} | 📞 ${escHtml(c.phone)} ${c.email ? '| ✉️ ' + escHtml(c.email) : ''}</p>
    <p style="margin-top:6px;color:var(--text2);font-size:13px">${escHtml(c.address)}</p>
  </div>
  ${c.images?.length ? `<div class="detail-section"><h4>படங்கள்</h4><div class="detail-imgs">${imgs}</div></div>` : ''}
  ${c.voiceNote ? `<div class="detail-section"><h4>🎙️ குரல் குறிப்பு</h4>${voice}</div>` : ''}
  ${adminResp}`;
}

function closeDetail() {
  const modal = document.getElementById('detailModal');
  const overlay = document.getElementById('modalOverlay');
  modal.classList.remove('show');
  setTimeout(() => { modal.classList.add('hidden'); overlay.classList.add('hidden'); }, 300);
}

function closeModals() { closeDetail(); }
window.onload = () => {
  const savedLang = localStorage.getItem('lang') || 'tamil';
  currentLang = savedLang;

  document.getElementById('langLabel').textContent =
    currentLang === 'tamil' ? 'English' : 'தமிழ்';

  document.documentElement.lang =
    currentLang === 'tamil' ? 'ta' : 'en';

  applyLang();
};

// ======= UPVOTE =======
async function upvote(id, btn) {
  try {
    const res = await fetch(`${API}/complaints/${id}/upvote`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      btn.querySelector('.upvote-count').textContent = data.upvotes;
      btn.classList.add('voted');
      showToast(
  currentLang === 'tamil'
    ? 'ஆதரவு பதிவாகியது!'
    : 'Support recorded!',
  'success'
);
    } else {
      showToast(
  currentLang === 'tamil'
    ? 'ஏற்கனவே ஆதரவளித்தீர்கள்'
    : 'Already supported',
  'info'
);
    }
  } catch (e) { showToast('Error', 'error'); }
}

// ======= TRACK COMPLAINT =======
async function trackComplaint() {
  const input = document.getElementById('trackInput').value.trim();
  const result = document.getElementById('trackResult');
  if (!input) { showToast('புகார் எண் அல்லது தொலைபேசி எண் உள்ளிடுங்கள்', 'error'); return; }
  result.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
  try {
    const res = await fetch(`${API}/complaints/${input}`);
    const data = await res.json();
    if (data.success) {
      result.innerHTML = renderTrackCard(data.complaint);
    } else {
      result.innerHTML = `<div class="empty-state"><p data-ta="புகார் கிடைக்கவில்லை" data-en="Complaint not found">
  புகார் கிடைக்கவில்லை
</p></div>`;
    }
  } catch (e) {
    result.innerHTML = `<div class="empty-state"><p>Server error</p></div>`;
  }
}

function renderTrackCard(c) {
  const steps = [
    { key: 'pending', label: 'புகார் பதிவு / Filed', sub: 'System received', icon: '📝' },
    { key: 'inprogress', label: 'செயல்பாட்டில் / Processing', sub: 'Under review', icon: '⚙️' },
    { key: 'resolved', label: 'தீர்க்கப்பட்டது / Resolved', sub: 'Issue fixed', icon: '✅' }
  ];
  const order = ['pending', 'inprogress', 'resolved', 'rejected', 'closed'];
  const currentIdx = order.indexOf(c.status);
  return `
  <div class="track-card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <div>
        <div style="font-size:12px;color:var(--text3);font-family:var(--font-en)">${c.complaintId}</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px">${escHtml(c.title)}</div>
        <div style="font-size:13px;color:var(--text2);margin-top:6px">📍 ${escHtml(c.street)} - ${escHtml(c.ward)} | 📂 ${categoryLabel[c.category]}</div>
      </div>
      <span class="badge badge-${c.status}" style="font-size:13px;padding:8px 16px">${c.status}</span>
    </div>
    <div class="track-timeline">
      ${steps.map((step, i) => {
        const stepIdx = order.indexOf(step.key);
        const isDone = currentIdx >= stepIdx;
        const isCurrent = c.status === step.key;
        return `<div class="timeline-step">
          <div class="timeline-dot ${isCurrent ? 'current' : isDone ? 'done' : ''}">${isDone ? step.icon : i + 1}</div>
          <div>
            <div class="timeline-label" style="color:${isDone ? 'var(--text)' : 'var(--text3)'}">${step.label}</div>
            <div class="timeline-sublabel">${step.sub}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
    ${c.adminResponse ? `<div class="admin-response-box"><h4>✅ அதிகாரி பதில்</h4><p>${escHtml(c.adminResponse)}</p></div>` : ''}
  </div>`;
}

// ======= ADMIN DASHBOARD =======
async function loadAdminDashboard() {
  try {
    const [statsRes, complaintsRes] = await Promise.all([
      fetch(`${API}/complaints/stats`),
      fetch(`${API}/complaints?limit=50&sort=-createdAt`)
    ]);
    const stats = await statsRes.json();
    const complaints = await complaintsRes.json();

    if (stats.success) {
      document.getElementById('adminStats').innerHTML = `
        <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--text)">${stats.stats.total}</div><div class="admin-stat-label">மொத்தம் / Total</div></div>
        <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--yellow)">${stats.stats.pending}</div><div class="admin-stat-label">நிலுவை / Pending</div></div>
        <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--blue)">${stats.stats.inprogress}</div><div class="admin-stat-label">செயல்பாட்டில்</div></div>
        <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--green)">${stats.stats.resolved}</div><div class="admin-stat-label">தீர்க்கப்பட்டது</div></div>
        <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--red)">${stats.stats.urgent}</div><div class="admin-stat-label">அவசரம் / Urgent</div></div>
      `;
    }

    if (complaints.success) {
      const rows = complaints.complaints.map(c => `
        <tr>
          <td style="font-family:var(--font-en);font-size:12px">${c.complaintId}</td>
          <td>${escHtml(c.name)}</td>
          <td>${escHtml(c.title).substring(0, 40)}...</td>
          <td>${categoryLabel[c.category]}</td>
          <td><span class="badge badge-${c.priority}">${c.priority}</span></td>
          <td>
            <select class="status-select" id="st-${c._id}">
              <option value="pending" ${c.status==='pending'?'selected':''}>நிலுவை</option>
              <option value="inprogress" ${c.status==='inprogress'?'selected':''}>செயல்பாட்டில்</option>
              <option value="resolved" ${c.status==='resolved'?'selected':''}>தீர்க்கப்பட்டது</option>
              <option value="rejected" ${c.status==='rejected'?'selected':''}>நிராகரிக்கப்பட்டது</option>
            </select>
          </td>
          <td>
            <input type="text" placeholder="பதில்..." id="ar-${c._id}"
              style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:6px 8px;border-radius:6px;font-size:12px;width:140px;font-family:var(--font-ta)"
              value="${escHtml(c.adminResponse || '')}" />
          </td>
          <td><button class="btn-update" onclick="updateStatus('${c._id}')">புதுப்பி</button></td>
          <td><button class="btn-update" onclick="openDetail('${c._id}')" style="background:var(--surface2);border:1px solid var(--border)">பார்</button></td>
          <td>
  <button class="btn-update"style="background:red;color:white"onclick="deleteComplaint('${c._id}')">நீக்கு</button>
</td>
        </tr>
      `).join('');
      document.getElementById('adminComplaints').innerHTML = `
        <div style="overflow-x:auto">
        <table class="admin-table">
          <thead><tr><th>ID</th><th>பெயர்</th><th>தலைப்பு</th><th>வகை</th><th>முன்னுரிமை</th><th>நிலை</th><th>பதில்</th><th>புதுப்பி</th><th>பார்</th><th>நீக்கு</th> </tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`;
    }
  } catch (e) {
    document.getElementById('adminStats').innerHTML = '<p style="color:var(--red)">Server இயங்கவில்லை</p>';
    document.getElementById('adminComplaints').innerHTML = '';
  }
}

async function updateStatus(id) {
  const status = document.getElementById(`st-${id}`)?.value;
  const adminResponse = document.getElementById(`ar-${id}`)?.value || '';
  try {
    const res = await fetch(`${API}/complaints/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminResponse })
    });
    const data = await res.json();
    if (data.success) showToast('நிலை புதுப்பிக்கப்பட்டது! / Status updated!', 'success');
    else showToast('Error: ' + data.message, 'error');
  } catch (e) { showToast(
  currentLang === 'tamil'
    ? 'சேவையகப் பிழை'
    : 'Server error',
  'error'
); 
}
}
async function deleteComplaint(id) {

  if (!confirm("Delete செய்ய வேண்டுமா?")) return;

  try {
    const res = await fetch(`${API}/complaints/${id}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (data.success) {
      showToast("Deleted Successfully", "success");
      loadAdminDashboard();
    } else {
      showToast(data.message, "error");
    }

  } catch (err) {
    showToast("Server Error", "error");
  }
}

// ======= VOICE RECORDING =======
async function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = handleRecordingStop;
    mediaRecorder.start();

    const btn = document.getElementById('recordBtn');
    const btnText = document.getElementById('recordBtnText');
    btn.classList.add('recording');
    btnText.setAttribute('data-ta', '⏹ பதிவு நிறுத்து');
    btnText.setAttribute('data-en', '⏹ Stop Recording');
    btnText.textContent = currentLang === 'tamil' ? '⏹ பதிவு நிறுத்து' : '⏹ Stop Recording';

    recordingSeconds = 0;
    recordingTimer = setInterval(() => {
      recordingSeconds++;
      const m = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
      const s = (recordingSeconds % 60).toString().padStart(2, '0');
      const timerEl = document.getElementById('recordTimer');
      timerEl.textContent = `${m}:${s}`;
      timerEl.classList.add('active');
      if (recordingSeconds >= 120) stopRecording(); // 2 min max
    }, 1000);
  } catch (e) {
  showToast(
  currentLang === 'tamil'
    ? 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது'
    : 'Microphone permission denied',
  'error'
);  
  }
}

function stopRecording() {
  if (mediaRecorder) { mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(t => t.stop()); }
  clearInterval(recordingTimer);
  const btn = document.getElementById('recordBtn');
  const btnText = document.getElementById('recordBtnText');
  btn.classList.remove('recording');
  btnText.setAttribute('data-ta', '⏺ மீண்டும் பதிவு');
  btnText.setAttribute('data-en', '⏺ Re-record');
  btnText.textContent = currentLang === 'tamil' ? '⏺ மீண்டும் பதிவு' : '⏺ Re-record';
  document.getElementById('recordTimer').classList.remove('active');
}

function handleRecordingStop() {
  voiceBlob = new Blob(recordedChunks, { type: 'audio/webm' });
  const url = URL.createObjectURL(voiceBlob);
  const audio = document.getElementById('voiceAudio');
  audio.src = url;
  document.getElementById('voicePreview').classList.remove('hidden');
  document.getElementById('voiceStatus').classList.add('hidden');
  showToast(
  currentLang === 'tamil'
    ? 'குரல் குறிப்பு பதிவாகியது!'
    : 'Voice note recorded!',
  'success'
);
}

function deleteVoice() {
  voiceBlob = null;
  document.getElementById('voicePreview').classList.add('hidden');
  document.getElementById('voiceStatus').classList.remove('hidden');
  document.getElementById('voiceAudio').src = '';
  document.getElementById('recordTimer').textContent = '00:00';
}

// ======= IMAGE HANDLING =======
function handleImageSelect(event) {
  const files = Array.from(event.target.files).slice(0, 3);
  selectedImages = files;
  renderImagePreviews();
}

function renderImagePreviews() {
  const container = document.getElementById('imagePreviews');
  container.innerHTML = selectedImages.map((file, i) => {
    const url = URL.createObjectURL(file);
    return `<div class="preview-item">
      <img src="${url}" alt="preview" />
      <button class="preview-delete" onclick="removeImage(${i},event)">✕</button>
    </div>`;
  }).join('');
  if (selectedImages.length > 0) {
    document.querySelector('.upload-placeholder').style.display = 'none';
  } else {
    document.querySelector('.upload-placeholder').style.display = '';
  }
}

function removeImage(index, event) {
  event.stopPropagation();
  selectedImages.splice(index, 1);
  renderImagePreviews();
}

// Enable drag-drop on image area
document.addEventListener('DOMContentLoaded', () => {
  const area = document.getElementById('imageUploadArea');
  if (area) {
    area.addEventListener('dragover', e => { e.preventDefault(); area.style.borderColor = 'var(--accent)'; });
    area.addEventListener('dragleave', () => { area.style.borderColor = ''; });
    area.addEventListener('drop', e => {
      e.preventDefault(); area.style.borderColor = '';
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).slice(0, 3);
      selectedImages = files;
      renderImagePreviews();
    });
  }
});

// ======= FORM SUBMIT =======
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('complaintForm');
  if (form) form.addEventListener('submit', handleSubmit);
  loadStats();
  loadRecentFeed();
});

async function handleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳ அனுப்புகிறோம்...</span>';

  const formData = new FormData();
  const fields = ['name', 'phone', 'street', 'ward', 'address','category', 'priority', 'title', 'description'];
  fields.forEach(f => {
    const el = document.getElementById(`f-${f}`);
    if (el) formData.append(f, el.value.trim());
  });
  const langRadio = document.querySelector('input[name="language"]:checked');
  formData.append('language', langRadio ? langRadio.value : 'tamil');

  // Voice note
  if (voiceBlob) {
    formData.append('voiceNote', voiceBlob, 'voice-note.webm');
  }

  // Images
  selectedImages.forEach(img => formData.append('images', img));

  try {
    const res = await fetch(`${API}/complaints`, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {

  if (data.duplicate) {
    showToast("Already complaint exists — vote added 👍", "info");
  } else {
    document.getElementById('successComplaintId').textContent = data.complaintId;
    showModal('successModal');
  }

  form.reset();
  deleteVoice();
  selectedImages = [];
  renderImagePreviews();
  loadFeed();

} else {
  showToast('Error: ' + data.message, 'error');
}
  } catch (e) {
    showToast('Server error. Make sure npm start is running.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span data-ta="📨 புகார் அனுப்பு" data-en="📨 Submit Complaint">📨 புகார் அனுப்பு</span>';
    applyLang();
  }
}

// ======= MODAL HELPERS =======
function showModal(id) {
  const modal = document.getElementById(id);
  const overlay = document.getElementById('modalOverlay');
  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');
  setTimeout(() => modal.classList.add('show'), 10);
}

function copyId() {
  const id = document.getElementById('successComplaintId').textContent;
  navigator.clipboard.writeText(id).then(() => showToast('ID நகல் எடுக்கப்பட்டது! / ID Copied!', 'success'));
}

// ======= TOAST =======
let toastContainer;
function showToast(msg, type = 'info') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; }, 2800);
  setTimeout(() => toast.remove(), 3100);
}

// ======= UTILITY =======
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
