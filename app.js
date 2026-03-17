/* ============================================================
   BloodBridge — app.js
   Frontend Application Logic
   Depends on: database.js (DB, openDB, seed)
   ============================================================ */

/* ─── MAP (Leaflet.js) ─── */
let lmap = null;
let lmarkers = [];

const BLOOD_COLORS = {
  'A+': '#e8192c', 'A-': '#e8192c',
  'B+': '#3b82f6', 'B-': '#3b82f6',
  'O+': '#22c55e', 'O-': '#f59e0b',
  'AB+': '#a855f7', 'AB-': '#a855f7',
};

function mkIcon(blood, color) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;display:inline-block">
      <div style="background:${color};color:#fff;font-family:'Syne',sans-serif;font-weight:800;font-size:11px;padding:5px 8px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.6);border:1.5px solid rgba(255,255,255,0.25);white-space:nowrap">${blood}</div>
      <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${color}"></div>
    </div>`,
    iconAnchor: [20, 33],
    popupAnchor: [0, -33],
  });
}


async function initMap() {
  if (lmap) return;
  lmap = L.map('mapCon', { center: [22, 80], zoom: 5, zoomControl: true, preferCanvas: false });

  // CartoDB Dark Matter — native dark basemap, no CSS filter hacks needed
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(lmap);

  setTimeout(() => lmap.invalidateSize(), 100);
  await loadMarkers('all');
}

async function loadMarkers(filter) {
  lmarkers.forEach(m => m.remove());
  lmarkers = [];

  const donors = await DB.getAll('donors');
  const list = filter === 'all' ? donors : donors.filter(d => d.bloodGroup === filter);

  list.forEach(d => {
    const col = BLOOD_COLORS[d.bloodGroup] || '#e8192c';
    const marker = L.marker([d.lat, d.lng], { icon: mkIcon(d.bloodGroup, col) }).addTo(lmap);

    const popupHtml = `
      <div style="padding:14px 16px;min-width:175px;font-family:'DM Sans',sans-serif;">
        <div style="font-family:'Syne',sans-serif;font-size:1.05rem;font-weight:800;color:${col};margin-bottom:4px">${d.bloodGroup}</div>
        <div style="font-weight:600;font-size:.9rem;color:#f0f0f5;margin-bottom:6px">${d.name}</div>
        <div style="font-size:.74rem;color:#8888aa;margin-bottom:3px"><i class="fas fa-map-marker-alt"></i> ${d.city}, ${d.state}</div>
        <div style="font-size:.74rem;color:#8888aa;margin-bottom:6px"><i class="fas fa-phone"></i> ${d.phone}</div>
        <div style="font-size:.74rem;font-weight:700;color:${d.status === 'available' ? '#22c55e' : '#8888aa'};margin-bottom:10px">
          ${d.status === 'available' ? '✓ Available' : '✗ Unavailable'}
        </div>
        <button onclick="openMsgFromMap('${d.name.replace(/'/g, "\\'")}','${d.id}')"
          style="width:100%;background:#E8192C;border:none;color:#fff;padding:7px;border-radius:8px;font-size:.78rem;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">
          <i class="fas fa-comment"></i> Send Message
        </button>
      </div>`;

    marker.bindPopup(popupHtml, { maxWidth: 220 });
    lmarkers.push(marker);
  });
}

function setMF(filter, btn) {
  document.querySelectorAll('.mctrl-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadMarkers(filter);
}

function openMsgFromMap(name, id) {
  curMsgDId = id ? +id : null;
  document.getElementById('mdn').textContent = name;
  loadMsgThread();
  openM('msgM');
}


/* ─── DONOR CARDS ─── */
async function renderDonors(filter = 'all') {
  const donors = await DB.getAll('donors');
  const list = filter === 'all' ? donors : donors.filter(d => d.bloodGroup === filter);

  const availTxt = currentLang === 'hi' ? 'उपलब्ध' : 'Available';
  const unavailTxt = currentLang === 'hi' ? 'अनुपलब्ध' : 'Unavailable';
  const contactTxt = t('contact_btn');
  const messageTxt = t('message_btn');

  document.getElementById('dgrid').innerHTML = list.map(d => `
    <div class="dcard" onclick="openDP(${d.id})">
      <div class="bbadge">${d.bloodGroup}</div>
      <div class="dtop">
        <div class="dav" style="background:${d.color || '#e8192c'}">${d.name.charAt(0)}</div>
        <div class="di">
          <h4>${d.name}</h4>
          <p><i class="fas fa-map-marker-alt" style="font-size:.7rem"></i> ${d.city}, ${d.state}</p>
        </div>
      </div>
      <div class="dmeta">
        <span><i class="fas fa-phone" style="font-size:.7rem"></i> ${d.phone}</span>
        <span class="sdot ${d.status === 'unavailable' ? 'un' : ''}">${d.status === 'available' ? availTxt : unavailTxt}</span>
      </div>
      <div class="dacts" onclick="event.stopPropagation()">
        <button class="bcn" onclick="showT('Calling ${d.phone}...','info')"><i class="fas fa-phone"></i> ${contactTxt}</button>
        <button class="bmsg" onclick="openMsg(${d.id},'${d.name.replace(/'/g, "\\'")}')"><i class="fas fa-comment"></i> ${messageTxt}</button>
      </div>
    </div>
  `).join('');
}

function fDonors(filter, btn) {
  document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDonors(filter);
}


/* ─── REQUESTS DASHBOARD ─── */
const BG_MAP = { 'O-': '#22c55e', 'O+': '#22c55e', 'A+': '#e8192c', 'A-': '#e8192c', 'B+': '#3b82f6', 'B-': '#3b82f6', 'AB+': '#a855f7', 'AB-': '#a855f7' };

async function renderRequests() {
  const all = await DB.getAll('requests');
  const active = all.filter(r => r.status === 'active');

  document.getElementById('rqgrid').innerHTML = active.map(r => `
    <div class="rqcard ${r.urgency === 'critical' ? 'cc' : ''}">
      ${r.urgency === 'critical' ? '<div class="cbadge"><i class="fas fa-arrow-up"></i> CRITICAL</div>' : ''}
      <div class="rqtop">
        <div class="btbadge" style="background:${BG_MAP[r.bloodGroup] || '#e8192c'}">${r.bloodGroup}<span>${r.units} UNIT${r.units > 1 ? 'S' : ''}</span></div>
        <div class="rqi"><h4>${r.patientName}</h4><p>${tAgo(r.createdAt)}</p></div>
      </div>
      <div class="rqmeta">
        <span><i class="fas fa-hospital"></i> ${r.hospital}</span>
        <span><i class="fas fa-map-marker-alt"></i> ${r.city}</span>
        <span style="grid-column:1/-1"><i class="fas fa-phone"></i> ${r.contactName}: ${r.contactPhone}</span>
      </div>
      <p style="font-size:.73rem;color:var(--green);margin-bottom:.55rem"><i class="fas fa-heart"></i> ${r.matchedDonors || 0} matches nearby</p>
      <button class="vbtn ${r.urgency === 'critical' ? '' : 'sec'}"
        onclick="showT('Showing ${r.bloodGroup} donors near ${r.city}','info')">
        View Matches <i class="fas fa-arrow-right"></i>
      </button>
    </div>
  `).join('');

  document.getElementById('dashT').textContent = active.length;
  document.getElementById('dashC').textContent = '● ' + active.filter(r => r.urgency === 'critical').length;
}

function tAgo(iso) {
  if (!iso) return 'just now';
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (mins < 1) return 'just now';
  if (mins < 60) return `${~~mins} mins ago`;
  if (mins < 1440) return `${~~(mins / 60)} hrs ago`;
  return `${~~(mins / 1440)} days ago`;
}


/* ─── REGISTER DONOR ─── */
const COLOR_MAP = { 'A+': '#e8192c', 'A-': '#e8192c', 'B+': '#3b82f6', 'B-': '#3b82f6', 'O+': '#22c55e', 'O-': '#f59e0b', 'AB+': '#a855f7', 'AB-': '#a855f7' };
const CITY_COORDS = {
  'Delhi':     [28.6139, 77.2090], 'Mumbai':    [19.0760, 72.8777],
  'Bangalore': [12.9716, 77.5946], 'Chennai':   [13.0827, 80.2707],
  'Hyderabad': [17.3850, 78.4867], 'Kolkata':   [22.5726, 88.3639],
  'Pune':      [18.5204, 73.8567], 'Ahmedabad': [23.0225, 72.5714],
  'Lucknow':   [26.8467, 80.9462], 'Jaipur':    [26.9124, 75.7873],
  'Surat':     [21.1702, 72.8311], 'Kochi':     [ 9.9312, 76.2673],
};

// Disqualifying blood-related diseases
const DISQUALIFYING_CONDITIONS = [
  { key: 'hiv',        label: 'HIV / AIDS' },
  { key: 'hepatitis',  label: 'Hepatitis B or C' },
  { key: 'malaria',    label: 'Active Malaria' },
  { key: 'sickle',     label: 'Sickle Cell Disease' },
  { key: 'leukemia',   label: 'Leukemia / Blood Cancer' },
  { key: 'haemophilia',label: 'Haemophilia / Bleeding Disorder' },
];

function renderDiseaseChecklist() {
  const container = document.getElementById('diseaseChecklist');
  if (!container) return;
  container.innerHTML = DISQUALIFYING_CONDITIONS.map(d => `
    <label class="disease-check">
      <input type="checkbox" id="dc_${d.key}" value="${d.key}">
      <span>${d.label}</span>
    </label>`).join('');
}

async function regDonor() {
  const name  = document.getElementById('rn').value.trim();
  const age   = document.getElementById('ra').value;
  const blood = document.getElementById('rb').value;
  const phone = document.getElementById('rph').value.trim();
  const city  = document.getElementById('rci').value.trim();
  const state = document.getElementById('rst').value.trim();

  if (!name || !age || !blood || !phone || !city || !state) { showT('Please fill all required fields', 'error'); return; }
  if (!document.getElementById('tc2').checked) { showT('Please agree to terms', 'error'); return; }

  // Disease disqualification check
  const checkedDiseases = DISQUALIFYING_CONDITIONS.filter(d => {
    const el = document.getElementById(`dc_${d.key}`);
    return el && el.checked;
  });
  if (checkedDiseases.length > 0) {
    const diseaseNames = checkedDiseases.map(d => d.label).join(', ');
    showT(`❌ Cannot register: ${diseaseNames} disqualifies blood donation.`, 'error');
    document.getElementById('diseaseWarning').style.display = 'block';
    document.getElementById('diseaseWarning').innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      Sorry, you cannot register as a donor due to: <strong>${diseaseNames}</strong>.<br>
      <small>Blood donation is not permitted with these conditions for your safety and the recipient's safety.</small>`;
    return;
  }
  document.getElementById('diseaseWarning').style.display = 'none';

  // Handle report upload
  const reportInput = document.getElementById('rf');
  let reportFileName = null;
  if (reportInput && reportInput.files[0]) {
    const file = reportInput.files[0];
    if (file.size > 5 * 1024 * 1024) { showT('Report file too large (max 5MB)', 'error'); return; }
    reportFileName = file.name;
    // Store as base64 in IndexedDB
    const b64 = await new Promise(res => {
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file);
    });
    localStorage.setItem(`bb_report_${name}`, b64);
  }

  const coords = CITY_COORDS[city] || [20 + Math.random() * 8, 77 + Math.random() * 8];

  await DB.add('donors', {
    name, age: +age, bloodGroup: blood, phone,
    email:             document.getElementById('rem').value,
    city, state,
    medicalConditions: document.getElementById('rmc').value,
    lastDonationDate:  document.getElementById('rld').value,
    status:            document.getElementById('avt').classList.contains('on') ? 'available' : 'unavailable',
    lat:    coords[0], lng: coords[1],
    color:  COLOR_MAP[blood] || '#e8192c',
    userId: currentUser ? currentUser.id : null,
    reportFile: reportFileName,
  });

  showT(`🎉 ${name} registered as donor!`, 'success');
  addNotif({ t: 'matched', icon: 'fas fa-heart', txt: `New donor: ${name} (${blood}) in ${city}`, time: 'just now' });

  // reset form
  ['rn','ra','rb','rph','rem','rci','rst','rmc','rld'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('tc2').checked = false;
  document.querySelectorAll('[id^="dc_"]').forEach(el => el.checked = false);
  document.getElementById('diseaseWarning').style.display = 'none';
  document.getElementById('reportPreview').textContent = '';
  if (reportInput) reportInput.value = '';

  await renderDonors();
  await loadMarkers('all');
  await refreshDB();
}


/* ─── EMERGENCY BROADCAST ─── */
let curUrg = 'critical';

function setUrg(btn, val) {
  document.querySelectorAll('.ubtn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  curUrg = val;
}

async function broadcast() {
  const name  = document.getElementById('en').value.trim();
  const blood = document.getElementById('eb').value;
  if (!name || !blood) { showT('Fill patient name and blood group', 'error'); return; }

  const donors  = await DB.getAll('donors');
  const matched = donors.filter(d => d.bloodGroup === blood && d.status === 'available').length;

  await DB.add('requests', {
    patientName:  name,
    bloodGroup:   blood,
    units:        +document.getElementById('eu').value || 1,
    hospital:     document.getElementById('eh').value  || 'Unknown',
    city:         document.getElementById('ec').value  || 'Unknown',
    contactName:  document.getElementById('ect').value || 'Unknown',
    contactPhone: document.getElementById('ep').value  || 'N/A',
    urgency:      curUrg,
    status:       'active',
    matchedDonors: matched,
  });

  closeM('emgM');
  showT(`🚨 Broadcast sent! ${matched} ${blood} donors found.`, 'error');
  addNotif({ t: 'emergency', icon: 'fas fa-exclamation-triangle', txt: `Emergency: ${blood} for ${name}`, time: 'just now' });

  // reset form
  ['en', 'eb', 'eh', 'ec', 'ect', 'ep'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('eu').value = 1;

  await renderRequests();
  await refreshDB();
}


/* ─── MESSAGING ─── */
let curMsgDId = null;
let msgPollingInterval = null;

function openMsg(donorId, name) {
  curMsgDId = donorId;
  document.getElementById('mdn').textContent = name;
  loadMsgThread();
  openM('msgM');
}

async function loadMsgThread() {
  if (!curMsgDId) return;
  const allMsgs = await DB.getAll('messages');
  const myId = currentUser ? currentUser.id : 0;
  const thread = allMsgs.filter(m =>
    (m.fromId === myId && m.toId === curMsgDId) ||
    (m.fromId === curMsgDId && m.toId === myId)
  ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const threadEl = document.getElementById('msgt');
  if (thread.length === 0) {
    const donorName = document.getElementById('mdn').textContent;
    threadEl.innerHTML = `<div class="cmsg bot">नमस्ते! / Hello! I'm ${donorName}, a registered BloodBridge donor. How can I help you?</div>`;
  } else {
    threadEl.innerHTML = thread.map(m => {
      const isMe = m.fromId === myId;
      const time = new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      return `<div class="cmsg ${isMe ? 'user' : 'bot'}">
        ${m.text}
        ${m.reportFile ? `<div style="margin-top:.4rem;font-size:.72rem;color:var(--green)"><i class="fas fa-file-medical"></i> Report attached: ${m.reportFile}</div>` : ''}
        <div style="font-size:.65rem;opacity:.5;margin-top:.25rem">${time} · ${m.fromName || 'Unknown'}</div>
      </div>`;
    }).join('');
  }
  threadEl.scrollTop = threadEl.scrollHeight;
}

async function sendMsg() {
  const inp = document.getElementById('minp');
  const msg = inp.value.trim();
  const reportInput = document.getElementById('msgReportFile');
  const reportFile = reportInput && reportInput.files[0] ? reportInput.files[0].name : null;
  if (!msg && !reportFile) return;

  const myId = currentUser ? currentUser.id : 0;
  const myName = currentUser ? currentUser.name : 'Patient';

  await DB.add('messages', {
    fromId:   myId,
    toId:     curMsgDId,
    text:     msg || (reportFile ? '📎 Sent a report' : ''),
    fromName: myName,
    toName:   document.getElementById('mdn').textContent,
    requestId: null,
    reportFile: reportFile || null,
    read: false,
  });

  inp.value = '';
  if (reportInput) reportInput.value = '';
  document.getElementById('msgReportName').textContent = '';

  addNotif({ t: 'message', icon: 'fas fa-comment', txt: `Msg to ${document.getElementById('mdn').textContent}: "${(msg || '📎 Report').substring(0, 35)}"`, time: 'just now' });
  await loadMsgThread();
  await refreshDB();
}

// Donor inbox — opens messages received by logged-in donor
async function openDonorInbox() {
  if (!currentUser) { showT('Please login first', 'error'); return; }
  const allMsgs = await DB.getAll('messages');
  const received = allMsgs.filter(m => m.toId === currentUser.id || m.toId === currentUser.donorId);

  // Group by sender
  const threads = {};
  received.forEach(m => {
    if (!threads[m.fromId]) threads[m.fromId] = { fromName: m.fromName, messages: [], fromId: m.fromId };
    threads[m.fromId].messages.push(m);
  });

  const inboxEl = document.getElementById('donorInboxList');
  if (!inboxEl) return;
  const threadList = Object.values(threads);

  if (threadList.length === 0) {
    inboxEl.innerHTML = '<div style="text-align:center;color:var(--muted);padding:2rem;font-size:.85rem">No messages yet</div>';
    return;
  }

  inboxEl.innerHTML = threadList.map(th => {
    const last = th.messages[th.messages.length - 1];
    const unread = th.messages.filter(m => !m.read && m.fromId !== currentUser.id).length;
    return `<div class="inbox-thread" onclick="openThreadReply(${th.fromId}, '${(th.fromName||'Patient').replace(/'/g,"\\'")}')">
      <div class="inbox-av">${(th.fromName||'?').charAt(0)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.88rem">${th.fromName || 'Patient'}</div>
        <div style="font-size:.75rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${last.text || '📎 Report'}</div>
      </div>
      ${unread > 0 ? `<div class="inbox-badge">${unread}</div>` : ''}
    </div>`;
  }).join('');
}

let replyToId = null;
let replyToName = '';

async function openThreadReply(fromId, fromName) {
  replyToId = fromId;
  replyToName = fromName;
  document.getElementById('replyThreadTitle').textContent = `Thread with ${fromName}`;

  const allMsgs = await DB.getAll('messages');
  const thread = allMsgs.filter(m =>
    (m.fromId === fromId && m.toId === currentUser.id) ||
    (m.fromId === currentUser.id && m.toId === fromId)
  ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Mark as read
  for (const m of thread) {
    if (!m.read && m.fromId === fromId) await DB.update('messages', { ...m, read: true });
  }

  const el = document.getElementById('replyThread');
  el.innerHTML = thread.map(m => {
    const isMe = m.fromId === currentUser.id;
    const time = new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `<div class="cmsg ${isMe ? 'user' : 'bot'}">
      ${m.text}
      ${m.reportFile ? `<div style="margin-top:.4rem;font-size:.72rem;color:var(--green)"><i class="fas fa-file-medical"></i> ${m.reportFile}</div>` : ''}
      <div style="font-size:.65rem;opacity:.5;margin-top:.25rem">${time} · ${m.fromName || 'Unknown'}</div>
    </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;

  document.getElementById('inboxView').style.display = 'none';
  document.getElementById('replyView').style.display = 'flex';
}

async function sendReply() {
  if (!currentUser || !replyToId) return;
  const inp = document.getElementById('replyInp');
  const msg = inp.value.trim();
  if (!msg) return;

  await DB.add('messages', {
    fromId: currentUser.id,
    toId: replyToId,
    text: msg,
    fromName: currentUser.name,
    toName: replyToName,
    requestId: null,
    read: false,
  });

  inp.value = '';
  addNotif({ t: 'message', icon: 'fas fa-comment', txt: `Reply sent to ${replyToName}: "${msg.substring(0, 35)}"`, time: 'just now' });
  await openThreadReply(replyToId, replyToName);
  await refreshDB();
}

function openDonorInboxPanel() {
  document.getElementById('inboxView').style.display = 'flex';
  document.getElementById('inboxView').style.flexDirection = 'column';
  document.getElementById('replyView').style.display = 'none';
  openDonorInbox();
}


/* ─── DONOR PROFILE MODAL ─── */
let curDP = null;

async function openDP(id) {
  const donors = await DB.getAll('donors');
  curDP = donors.find(d => d.id === id);
  if (!curDP) return;

  document.getElementById('dpHead').innerHTML = `
    <div class="pav" style="background:${curDP.color || '#e8192c'}">${curDP.name.charAt(0)}</div>
    <div>
      <div style="font-family:var(--font-head);font-size:1.2rem;font-weight:800">${curDP.name}</div>
      <div style="color:var(--muted);font-size:.82rem"><i class="fas fa-map-marker-alt"></i> ${curDP.city}, ${curDP.state}</div>
      <div style="margin-top:.3rem">
        <span style="background:var(--red);color:#fff;font-size:.7rem;font-weight:800;padding:.18rem .5rem;border-radius:6px">${curDP.bloodGroup}</span>
        <span style="color:${curDP.status === 'available' ? 'var(--green)' : 'var(--muted)'};font-size:.75rem;margin-left:.4rem">
          ${curDP.status === 'available' ? '● Available' : '● Unavailable'}
        </span>
      </div>
    </div>`;

  swPTab(document.querySelector('.ptab'), 'h');
  openM('dpM');
}

function swPTab(btn, tab) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const d = curDP;
  const body = document.getElementById('dpBody');

  if (tab === 'h') {
    body.innerHTML = `
      <div class="scrow">
        <div class="smc"><div class="smcn">5</div><div class="sml">Donations</div></div>
        <div class="smc"><div class="smcn">4</div><div class="sml">Lives Saved</div></div>
        <div class="smc"><div class="smcn">${d ? d.bloodGroup : '—'}</div><div class="sml">Blood Type</div></div>
      </div>
      ${['Jan 2026','Oct 2025','Jul 2025','Apr 2025','Jan 2025'].map((dt, i) => `
        <div class="histi">
          <div><div style="font-size:.85rem;font-weight:600">${dt}</div><div style="font-size:.78rem;color:var(--muted)">${['AIIMS Delhi','Apollo Mumbai','Fortis Gurgaon','Medanta Noida','Max Hospital'][i]}</div></div>
          <div class="hbdg">Donated</div>
        </div>`).join('')}`;
  } else if (tab === 'm') {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:.8rem">
        <div style="background:var(--bg3);border-radius:12px;padding:1rem"><div style="font-size:.72rem;color:var(--muted);font-weight:700;text-transform:uppercase;margin-bottom:.3rem">Last Donation</div><div style="font-size:.9rem">${d && d.lastDonationDate ? d.lastDonationDate : 'Not recorded'}</div></div>
        <div style="background:var(--bg3);border-radius:12px;padding:1rem"><div style="font-size:.72rem;color:var(--muted);font-weight:700;text-transform:uppercase;margin-bottom:.3rem">Medical Conditions</div><div style="font-size:.88rem;color:var(--muted)">${d && d.medicalConditions ? d.medicalConditions : 'None — healthy donor'}</div></div>
        <div style="background:var(--bg3);border-radius:12px;padding:1rem"><div style="font-size:.72rem;color:var(--muted);font-weight:700;text-transform:uppercase;margin-bottom:.3rem">Eligibility</div><div style="color:var(--green);font-size:.88rem;font-weight:600">✓ Eligible to donate</div></div>
      </div>`;
  } else {
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem">
        ${[['5','Total Donations'],['1.5L','Blood Donated'],['4','People Helped'],['3 mo','Last Donation'],['28','Age'],[d ? d.city : '—','City']].map(([v, l]) => `
          <div style="background:var(--bg3);border-radius:12px;padding:1rem;text-align:center">
            <div style="font-family:var(--font-head);font-size:1.3rem;font-weight:800;color:var(--red)">${v}</div>
            <div style="font-size:.7rem;color:var(--muted);margin-top:.2rem">${l}</div>
          </div>`).join('')}
      </div>`;
  }
}


/* ─── DB ADMIN PANEL ─── */
async function refreshDB() {
  const [u, d, r, m] = await Promise.all([DB.count('users'), DB.count('donors'), DB.count('requests'), DB.count('messages')]);

  document.getElementById('dbSt').innerHTML = [
    ['Users', u, 'var(--blue)'], ['Donors', d, 'var(--red)'],
    ['Requests', r, 'var(--yellow)'], ['Messages', m, 'var(--green)'],
  ].map(([label, num, color]) => `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1rem;text-align:center">
      <div style="font-family:var(--font-head);font-size:1.5rem;font-weight:800;color:${color}">${num}</div>
      <div style="font-size:.72rem;color:var(--muted)">${label}</div>
    </div>`).join('');

  const activeTxt = document.querySelector('.dbtab.active')?.textContent?.trim().toLowerCase() || 'donors';
  await showDbt(activeTxt);
}

async function showDbt(name, btn) {
  if (btn) { document.querySelectorAll('.dbtab').forEach(t => t.classList.remove('active')); btn.classList.add('active'); }

  const storeName = ['users','donors','requests','messages'].find(s => name.includes(s)) || 'donors';
  const data = await DB.getAll(storeName);

  if (!data.length) {
    document.getElementById('dbTh').innerHTML = '<tr><th>No records</th></tr>';
    document.getElementById('dbTb').innerHTML = '<tr><td style="color:var(--muted);text-align:center;padding:2rem">No data yet — register a donor or submit a request</td></tr>';
    return;
  }

  // Show only meaningful columns — hide internals
  const HIDDEN = ['lat','lng','color','password','userId','updatedAt','email','phone','contactPhone'];
  const keys = Object.keys(data[0]).filter(k => !HIDDEN.includes(k));

  // Friendly column labels
  const COL_LABELS = {
    id: 'ID', name: 'Name', age: 'Age', bloodGroup: 'Blood', phone: 'Phone', email: 'Email',
    city: 'City', state: 'State', status: 'Status', createdAt: 'Registered',
    medicalConditions: 'Conditions', lastDonationDate: 'Last Donation',
    patientName: 'Patient', units: 'Units', hospital: 'Hospital', urgency: 'Urgency',
    matchedDonors: 'Matches', contactName: 'Contact', contactPhone: 'Phone',
    fromName: 'From', toName: 'To', text: 'Message', fromId: 'From ID', toId: 'To ID',
    requestId: 'Req ID', role: 'Role', reportFile: 'Report', read: 'Read',
  };

  document.getElementById('dbTh').innerHTML = '<tr>' + keys.map(k => `<th>${COL_LABELS[k] || k}</th>`).join('') + '</tr>';
  document.getElementById('dbTb').innerHTML = data.slice(0, 25).map(row => `
    <tr>${keys.map(k => {
      let v = row[k] ?? '—';
      if (k === 'status' || k === 'urgency') v = `<span class="dbadge ${v}">${v}</span>`;
      else if (k === 'read') v = v === true ? '<span style="color:var(--green)">✓ Read</span>' : '<span style="color:var(--muted)">Unread</span>';
      else if (k === 'createdAt') { try { v = new Date(v).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }); } catch(e) {} }
      else if (k === 'reportFile' && v !== '—') v = `<span style="color:var(--green);font-size:.75rem"><i class="fas fa-file-medical"></i> ${v}</span>`;
      else if (typeof v === 'string' && v.length > 40) v = v.slice(0, 40) + '…';
      return `<td>${v}</td>`;
    }).join('')}</tr>`).join('');
}


/* ─── AUTH ─── */
let currentUser = null;

async function doLogin() {
  const email = document.getElementById('le').value.trim();
  const pass  = document.getElementById('lp').value;
  if (!email || !pass) { showT('Fill all fields', 'error'); return; }

  const users = await DB.getAll('users');
  const user  = users.find(u => u.email === email);
  if (!user) { showT('Account not found. Sign up first.', 'error'); return; }
  if (user.password !== btoa(pass)) { showT('Invalid password', 'error'); return; }

  loginOk(user);
  closeM('loginM');
}

async function doSignup() {
  const name  = document.getElementById('sn').value.trim();
  const email = document.getElementById('se').value.trim();
  const pass  = document.getElementById('sp').value;
  const role  = document.getElementById('sr').value;
  if (!name || !email || !pass) { showT('Fill all fields', 'error'); return; }

  const users = await DB.getAll('users');
  if (users.find(u => u.email === email)) { showT('Email exists. Login instead.', 'error'); return; }

  const id = await DB.add('users', { name, email, password: btoa(pass), role, bloodGroup: 'A+', donations: 0 });
  loginOk({ id, name, email, role, bloodGroup: 'A+' });
  closeM('loginM');
  showT(`🎉 Welcome, ${name}!`, 'success');
  await refreshDB();
}

function loginOk(user) {
  currentUser = user;
  document.getElementById('lbtnMain').style.display = 'none';
  const av = document.getElementById('uav');
  av.style.display = 'flex';
  av.textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('myN').textContent = user.name;
  document.getElementById('myR').textContent = user.role || 'Patient';
  document.getElementById('myAv').textContent = user.name.charAt(0).toUpperCase();
  // Show inbox button for donors
  const inboxBtn = document.getElementById('donorInboxBtn');
  if (inboxBtn) inboxBtn.style.display = (user.role === 'Donor') ? 'block' : 'none';
  showT(`Welcome, ${user.name}!`, 'success');
}

function doLogout() {
  currentUser = null;
  document.getElementById('lbtnMain').style.display = 'block';
  document.getElementById('uav').style.display = 'none';
  closeM('myProfM');
  showT('Logged out', 'info');
}

function swTab(btn, t) {
  document.querySelectorAll('.atab').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('lf').style.display = t === 'l' ? 'block' : 'none';
  document.getElementById('sf').style.display = t === 's' ? 'block' : 'none';
}


/* ─── CHATBOT ─── */
const KB = {
  'blood type':  '8 main types: A+, A−, B+, B−, O+, O−, AB+, AB−. O− is universal donor, AB+ is universal recipient.',
  'donate':      'To donate: be 18–65 years old, weigh 50kg+, be healthy, and wait 3 months between donations.',
  'eligib':      'Eligible if: 18–65 yrs, 50kg+, no major illness, and 3 months since last donation.',
  'emergency':   'Click the red Emergency button or the 🚨 FAB. Your request broadcasts to all nearby matching donors instantly.',
  'find':        'Use the "Available Donors" section — filter by blood type to find the best match near you.',
  'register':    'Scroll to "Register as Donor" and fill in your details to become a verified donor.',
  'hello':       'Hi! I\'m BloodBot 🤖 Ask about blood types, donation, finding donors, or emergencies!',
  'hi':          'Hi! 👋 I\'m BloodBot. Ask me anything!',
  'thank':       'You\'re welcome! Every drop counts 💉',
  'safe':        'Completely safe — sterile needles used once only. Process takes 45–60 minutes.',
  'hurt':        'Just a small prick. Most donors feel fine immediately. You may feel slight dizziness — drink water first.',
  // Hindi keywords
  'रक्त':        'रक्त के 8 प्रकार होते हैं: A+, A−, B+, B−, O+, O−, AB+, AB−। O− सार्वभौमिक दाता है।',
  'दान':         'दान करने के लिए: आयु 18–65 वर्ष, वजन 50kg+, स्वस्थ हों और पिछले दान के 3 माह बाद।',
  'आपात':        'लाल Emergency बटन दबाएं। आपका अनुरोध तुरंत नजदीकी डोनर्स को भेज दिया जाएगा।',
  'खोज':         '"उपलब्ध डोनर" सेक्शन में जाएं और ब्लड ग्रुप से फिल्टर करें।',
  'पंजीकरण':    '"डोनर के रूप में पंजीकरण" सेक्शन में जाएं और अपनी जानकारी भरें।',
  'नमस्':        'नमस्ते! 🙏 मैं BloodBot हूँ। रक्तदान के बारे में कुछ भी पूछें!',
  'धन्यवाद':    'आपका स्वागत है! हर बूँद अनमोल है 💉',
  'सुरक्षित':   'पूरी तरह सुरक्षित — एकबार उपयोग की सुई। प्रक्रिया 45–60 मिनट लेती है।',
  'दर्द':        'बस एक छोटी सी चुभन। अधिकतर डोनर तुरंत ठीक महसूस करते हैं।',
};

function sendChat() {
  const inp = document.getElementById('cin');
  const msg = inp.value.trim();
  if (!msg) return;

  const msgs = document.getElementById('chatmsgs');
  msgs.innerHTML += `<div class="cmsg user">${msg}</div>`;
  inp.value = '';
  msgs.scrollTop = msgs.scrollHeight;

  setTimeout(() => {
    const lc = msg.toLowerCase();
    const defaultReply = currentLang === 'hi'
      ? 'मुझे यकीन नहीं, लेकिन मैं रक्त प्रकार, दान पात्रता, डोनर खोज और आपातकाल में मदद कर सकता हूँ! 😊'
      : "I'm not sure, but I can help with blood types, donation eligibility, finding donors, and emergencies! 😊";
    let reply = defaultReply;
    for (const key in KB) { if (lc.includes(key) || msg.includes(key)) { reply = KB[key]; break; } }
    msgs.innerHTML += `<div class="cmsg bot">${reply}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }, 650);
}


/* ─── NOTIFICATIONS ─── */
let notifs = [
  { t: 'emergency', icon: 'fas fa-exclamation-triangle', txt: 'Critical: O− blood needed at Apollo Hospital, Mumbai', time: '2 mins ago' },
  { t: 'message',   icon: 'fas fa-comment',              txt: 'Aaron Sharma replied to your message',                 time: '15 mins ago' },
  { t: 'matched',   icon: 'fas fa-heart',                txt: 'Matched with a donor near Delhi',                      time: '1 hour ago' },
];
const NOTIF_CLASS = { emergency: 'nie', message: 'nim', matched: 'nid' };

function addNotif(n) {
  notifs.unshift(n);
  document.getElementById('nbadge').textContent = notifs.length;
  renderNotifs();
}

function renderNotifs() {
  document.getElementById('nl').innerHTML = notifs.map(n => `
    <div class="ni">
      <div class="niic ${NOTIF_CLASS[n.t] || 'nid'}"><i class="${n.icon}"></i></div>
      <div><div class="ntx">${n.txt}</div><div class="ntm">${n.time}</div></div>
    </div>`).join('') || '<div style="padding:1rem;color:var(--muted);font-size:.82rem;text-align:center">No notifications</div>';
  document.getElementById('nbadge').textContent = notifs.length;
}

function clearNotifs() { notifs = []; renderNotifs(); }
function toggleNotif() {
  const p = document.getElementById('np');
  p.classList.toggle('show');
  if (p.classList.contains('show')) renderNotifs();
}


/* ─── MODALS ─── */
function openM(id)  { document.getElementById(id).classList.add('open'); }
function closeM(id) { document.getElementById(id).classList.remove('open'); }
function initModalCloseListeners() {
  document.querySelectorAll('.mo').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
}


/* ─── LANGUAGE / UTILS ─── */
let currentLang = 'en';

const TRANSLATIONS = {
  en: {
    // Navbar
    'nav_home': 'Home', 'nav_dashboard': 'Live Dashboard', 'nav_map': 'Donor Map',
    'nav_register': 'Register as Donor', 'nav_database': 'Database',
    'nav_emergency': 'Emergency', 'nav_login': 'Login',
    // Hero
    'hero_badge': "India's #1 Blood Donation Network",
    'hero_h1a': 'Every Drop Counts.', 'hero_h1b': 'Save a Life Today.',
    'hero_p': 'Join thousands of donors ready to respond in critical moments. Find blood when you need it most, instantly — across every city in India.',
    'hero_emergency_btn': 'Emergency Request', 'hero_register_btn': 'Register as Donor',
    'hero_city_placeholder': 'Enter your city...',
    'stat1_lbl': 'Registered Donors', 'stat2_lbl': 'Lives Saved', 'stat3_lbl': 'Blood Requests', 'stat4_lbl': 'Cities Covered',
    // Donors section
    'donors_tag': 'Available Donors', 'donors_h2': 'Find Donors Nearby',
    'donors_p': 'Scan from thousands of heroes ready to donate',
    // Dashboard
    'dash_tag': 'Live Dashboard', 'dash_p': 'Real-time emergency blood requests',
    // Map
    'map_tag': 'Live Map', 'map_h2': 'Donor Map — India', 'map_p': 'Interactive real map — click any pin to contact a donor',
    // Register
    'reg_tag': 'Join Us', 'reg_h2': 'Register as Donor', 'reg_p': 'Your single registration can save multiple lives',
    'reg_personal': 'Personal Information', 'reg_contact': 'Contact & Location', 'reg_medical': 'Medical History',
    'reg_name': 'Full Name', 'reg_age': 'Age', 'reg_blood': 'Blood Group',
    'reg_phone': 'Phone', 'reg_email': 'Email', 'reg_city': 'City', 'reg_state': 'State',
    'reg_lastdon': 'Last Donation Date', 'reg_conditions': 'Any Medical Conditions? (Optional)',
    'reg_report': 'Blood Medical Report (Optional)',
    'reg_available': 'Available to donate right now',
    'reg_terms': 'I agree to the terms * — I confirm that I am registering voluntarily. My details can be shared with patients in need of emergency blood.',
    'reg_btn': 'Register as Donor',
    // Cities
    'cities_tag': 'Popular Cities', 'cities_h2': 'Find Blood Donors', 'cities_p': 'Blood donors in major cities across India',
    // Testimonials
    'test_tag': 'Success Stories', 'test_h2': 'Real Lives Saved', 'test_p': 'Real stories from our community members',
    // DB Panel
    'db_tag': 'Data Records', 'db_h2': 'Live Database Records', 'db_p': 'All registered data — donors, requests, users and messages',
    // CTA
    'cta_h2': 'Emergency Blood Needed?', 'cta_p': 'Call our 24/7 helpline or broadcast a request to all nearby donors immediately.',
    'cta_call': 'Call: +91 12345 67890', 'cta_dash': 'View Live Dashboard',
    // Footer
    'footer': '© 2026 BloodBridge Emergency Network · Made with ❤️ for India · Powered by IndexedDB + Leaflet Maps',
    // Modals
    'modal_emergency_title': 'Submit Emergency Request', 'modal_emergency_sub': 'Find life-saving blood in minutes',
    'modal_login_title': 'Welcome to BloodBridge',
    'modal_chat_title': 'BloodBot Assistant', 'modal_chat_sub': 'Ask me anything about blood donation',
    'modal_msg_title': 'Message',
    // Donor card
    'contact_btn': 'Contact', 'message_btn': 'Message',
    // Donor profile tabs
    'tab_history': 'Donation History', 'tab_medical': 'Medical Info', 'tab_stats': 'Stats',
  },
  hi: {
    // Navbar
    'nav_home': 'होम', 'nav_dashboard': 'लाइव डैशबोर्ड', 'nav_map': 'डोनर मैप',
    'nav_register': 'डोनर के रूप में पंजीकरण', 'nav_database': 'डेटाबेस',
    'nav_emergency': 'आपातकाल', 'nav_login': 'लॉगिन',
    // Hero
    'hero_badge': 'भारत का #1 रक्तदान नेटवर्क',
    'hero_h1a': 'हर बूँद अनमोल है।', 'hero_h1b': 'आज एक जिंदगी बचाएँ।',
    'hero_p': 'हज़ारों डोनर्स से जुड़ें जो संकट के समय तुरंत सहायता करने के लिए तैयार हैं। भारत के हर शहर में, जब ज़रूरत हो, तुरंत रक्त खोजें।',
    'hero_emergency_btn': 'आपातकालीन अनुरोध', 'hero_register_btn': 'डोनर बनें',
    'hero_city_placeholder': 'अपना शहर दर्ज करें...',
    'stat1_lbl': 'पंजीकृत डोनर', 'stat2_lbl': 'बचाई गई जीवनें', 'stat3_lbl': 'रक्त अनुरोध', 'stat4_lbl': 'शहर',
    // Donors section
    'donors_tag': 'उपलब्ध डोनर', 'donors_h2': 'नजदीकी डोनर खोजें',
    'donors_p': 'रक्तदान के लिए तैयार हज़ारों वीर नायकों में से खोजें',
    // Dashboard
    'dash_tag': 'लाइव डैशबोर्ड', 'dash_p': 'रियल-टाइम आपातकालीन रक्त अनुरोध',
    // Map
    'map_tag': 'लाइव मैप', 'map_h2': 'डोनर मैप — भारत', 'map_p': 'इंटरेक्टिव मैप — किसी भी पिन पर क्लिक करें',
    // Register
    'reg_tag': 'हमसे जुड़ें', 'reg_h2': 'डोनर के रूप में पंजीकरण', 'reg_p': 'आपका एक पंजीकरण कई जीवन बचा सकता है',
    'reg_personal': 'व्यक्तिगत जानकारी', 'reg_contact': 'संपर्क और स्थान', 'reg_medical': 'चिकित्सा इतिहास',
    'reg_name': 'पूरा नाम', 'reg_age': 'आयु', 'reg_blood': 'ब्लड ग्रुप',
    'reg_phone': 'फोन', 'reg_email': 'ईमेल', 'reg_city': 'शहर', 'reg_state': 'राज्य',
    'reg_lastdon': 'अंतिम दान की तारीख', 'reg_conditions': 'कोई चिकित्सा स्थिति? (वैकल्पिक)',
    'reg_report': 'रक्त चिकित्सा रिपोर्ट (वैकल्पिक)',
    'reg_available': 'अभी दान के लिए उपलब्ध',
    'reg_terms': 'मैं नियमों से सहमत हूँ * — मैं स्वेच्छा से पंजीकरण कर रहा/रही हूँ। मेरी जानकारी ज़रूरतमंद मरीज़ों के साथ साझा की जा सकती है।',
    'reg_btn': 'डोनर के रूप में पंजीकरण करें',
    // Cities
    'cities_tag': 'प्रमुख शहर', 'cities_h2': 'रक्त डोनर खोजें', 'cities_p': 'भारत के प्रमुख शहरों में रक्त डोनर',
    // Testimonials
    'test_tag': 'सफलता की कहानियाँ', 'test_h2': 'वास्तविक जीवन बचाए गए', 'test_p': 'हमारे समुदाय के सदस्यों की वास्तविक कहानियाँ',
    // DB Panel
    'db_tag': 'डेटा रिकॉर्ड', 'db_h2': 'लाइव डेटाबेस रिकॉर्ड', 'db_p': 'सभी पंजीकृत डेटा — डोनर, अनुरोध, उपयोगकर्ता और संदेश',
    // CTA
    'cta_h2': 'आपातकालीन रक्त की ज़रूरत है?', 'cta_p': 'हमारी 24/7 हेल्पलाइन पर कॉल करें या तुरंत नजदीकी डोनर्स को अनुरोध भेजें।',
    'cta_call': 'कॉल करें: +91 12345 67890', 'cta_dash': 'लाइव डैशबोर्ड देखें',
    // Footer
    'footer': '© 2026 BloodBridge आपातकालीन नेटवर्क · ❤️ के साथ भारत के लिए बनाया गया',
    // Modals
    'modal_emergency_title': 'आपातकालीन अनुरोध सबमिट करें', 'modal_emergency_sub': 'मिनटों में जीवन रक्षक रक्त खोजें',
    'modal_login_title': 'BloodBridge में आपका स्वागत है',
    'modal_chat_title': 'BloodBot सहायक', 'modal_chat_sub': 'रक्तदान के बारे में कुछ भी पूछें',
    'modal_msg_title': 'संदेश',
    // Donor card
    'contact_btn': 'संपर्क करें', 'message_btn': 'संदेश',
    // Donor profile tabs
    'tab_history': 'दान इतिहास', 'tab_medical': 'चिकित्सा जानकारी', 'tab_stats': 'आँकड़े',
  }
};

function t(key) { return (TRANSLATIONS[currentLang] || TRANSLATIONS['en'])[key] || key; }

function applyTranslations() {
  // ── Nav links ──
  const navLinks = document.querySelectorAll('.nav-links a');
  const navKeys = ['nav_home','nav_dashboard','nav_map','nav_register'];
  navLinks.forEach((a, i) => {
    if (navKeys[i]) a.textContent = t(navKeys[i]);
    else if (a.style.color) a.innerHTML = `<i class="fas fa-database" style="font-size:.72rem"></i> ${t('nav_database')}`;
  });

  // ── Nav buttons ──
  const emgBtn = document.querySelector('.emg-btn');
  if (emgBtn) emgBtn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${t('nav_emergency')}`;
  const loginBtn = document.getElementById('lbtnMain');
  if (loginBtn) loginBtn.textContent = t('nav_login');

  // ── Hero ──
  const heroBadge = document.querySelector('.hbadge');
  if (heroBadge) heroBadge.innerHTML = `<i class="fas fa-heart"></i> ${t('hero_badge')}`;
  const heroH1 = document.querySelector('.hero-con h1');
  if (heroH1) heroH1.innerHTML = `${t('hero_h1a')}<span>${t('hero_h1b')}</span>`;
  const heroP = document.querySelector('.hero-con > p');
  if (heroP) heroP.textContent = t('hero_p');
  const heroEmgBtn = document.querySelector('.hacts .btn-p');
  if (heroEmgBtn) heroEmgBtn.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${t('hero_emergency_btn')}`;
  const heroRegBtn = document.querySelector('.hacts .btn-s');
  if (heroRegBtn) heroRegBtn.innerHTML = `<i class="fas fa-user-plus"></i> ${t('hero_register_btn')}`;
  const citySearch = document.getElementById('cSrch');
  if (citySearch) citySearch.placeholder = t('hero_city_placeholder');

  // ── Stats ──
  document.querySelectorAll('.slbl').forEach((el, i) => {
    const k = ['stat1_lbl','stat2_lbl','stat3_lbl','stat4_lbl'][i];
    if (k) el.textContent = t(k);
  });

  // ── Section headings ──
  const sections = [
    ['#donors .tag','#donors h2','#donors .sec-h p','donors_tag','donors_h2','donors_p'],
    ['#map .tag','#map h2','#map .sec-h p','map_tag','map_h2','map_p'],
    ['#register .tag','#register h2','#register .sec-h p','reg_tag','reg_h2','reg_p'],
    ['.cities-s .tag','.cities-s h2','.cities-s .sec-h p','cities_tag','cities_h2','cities_p'],
    ['.test-s .tag','.test-s h2','.test-s .sec-h p','test_tag','test_h2','test_p'],
  ];
  sections.forEach(([tagSel, h2Sel, pSel, tk, hk, pk]) => {
    const t_ = document.querySelector(tagSel); if (t_) t_.textContent = t(tk);
    const h_ = document.querySelector(h2Sel);  if (h_) h_.textContent = t(hk);
    const p_ = document.querySelector(pSel);   if (p_) p_.textContent = t(pk);
  });
  // Dashboard (special — tag is inside dash-hdr, not sec-h)
  const dashTag = document.querySelector('#dashboard .live-ind')?.previousElementSibling;
  const dashSpan = document.querySelector('.dash-hdr .sec-h .tag, #dashboard .tag');
  if (dashSpan) dashSpan.textContent = t('dash_tag');
  const dashP = document.querySelector('#dashboard .sec-h p, .dash-hdr p');
  if (dashP) dashP.textContent = t('dash_p');
  // DB panel
  const dbTag = document.querySelector('#dbAdmin .tag');
  if (dbTag) dbTag.textContent = t('db_tag');
  const dbH2 = document.querySelector('#dbAdmin h2');
  if (dbH2) dbH2.innerHTML = `<i class="fas fa-database" style="color:var(--blue)"></i> ${t('db_h2')}`;
  const dbP = document.querySelector('#dbAdmin .sec-h p');
  if (dbP) dbP.textContent = t('db_p');

  // ── Register form labels ──
  const labelMap = {
    'rn': 'reg_name', 'ra': 'reg_age', 'rb': 'reg_blood',
    'rph': 'reg_phone', 'rem': 'reg_email', 'rci': 'reg_city', 'rst': 'reg_state',
    'rld': 'reg_lastdon', 'rmc': 'reg_conditions',
  };
  Object.entries(labelMap).forEach(([id, key]) => setLabel(id, t(key)));

  const avLabel = document.querySelector('.trow span');
  if (avLabel) avLabel.innerHTML = `<i class="fas fa-check-circle" style="color:var(--green);margin-right:.4rem"></i>${t('reg_available')}`;
  const termsLabel = document.querySelector('label[for="tc2"]');
  if (termsLabel) termsLabel.textContent = t('reg_terms');
  const regBtn = document.querySelector('.sub-btn[onclick*="regDonor"]');
  if (regBtn) regBtn.innerHTML = `<i class="fas fa-heart"></i> ${t('reg_btn')}`;

  // ── Form section headers (.fsh) ──
  const fshEls = document.querySelectorAll('.fsh');
  const fshData = [
    ['fa-user', 'reg_personal'], ['fa-map-marker-alt', 'reg_contact'], ['fa-file-medical', 'reg_medical']
  ];
  fshEls.forEach((el, i) => {
    if (fshData[i]) el.innerHTML = `<i class="fas ${fshData[i][0]}"></i> ${t(fshData[i][1])}`;
  });

  // ── Report upload label ──
  const reportUploadLabel = document.querySelector('.upload-a + div, #reportPreview')?.previousElementSibling;
  const reportFg = document.getElementById('rf')?.closest('.fg');
  if (reportFg) {
    const lbl = reportFg.querySelector('label');
    if (lbl && !lbl.htmlFor) lbl.textContent = t('reg_report');
  }

  // ── CTA section ──
  const ctaH2 = document.querySelector('.cta-s h2');
  if (ctaH2) ctaH2.textContent = t('cta_h2');
  const ctaP = document.querySelector('.cta-s > p');
  if (ctaP) ctaP.textContent = t('cta_p');
  const ctaCall = document.querySelector('.cta-btns .btn-p');
  if (ctaCall) ctaCall.innerHTML = `<i class="fas fa-phone"></i> ${t('cta_call')}`;
  const ctaDash = document.querySelector('.cta-btns .btn-s');
  if (ctaDash) ctaDash.innerHTML = `<i class="fas fa-tachometer-alt"></i> ${t('cta_dash')}`;

  // ── Footer ──
  const footer = document.querySelector('footer');
  if (footer) footer.textContent = t('footer');

  // ── Donor profile modal tabs ──
  const ptabs = document.querySelectorAll('.ptab');
  const ptabKeys = ['tab_history','tab_medical','tab_stats'];
  ptabs.forEach((el, i) => { if (ptabKeys[i]) el.textContent = t(ptabKeys[i]); });

  // ── Disease checklist re-render with translated label intro ──
  const diseaseIntro = document.querySelector('#diseaseChecklist')?.previousElementSibling;
  if (diseaseIntro && currentLang === 'hi') {
    diseaseIntro.innerHTML = `<i class="fas fa-exclamation-triangle"></i> अयोग्य करने वाली बीमारियाँ — यदि आपको कोई हो तो चेक करें:`;
  } else if (diseaseIntro) {
    diseaseIntro.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Disqualifying Conditions — check if you have any:`;
  }
}

function setLabel(inputId, labelText) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const fg = input.closest('.fg');
  if (!fg) return;
  const label = fg.querySelector('label');
  if (label) {
    const span = label.querySelector('span');
    label.childNodes[0].textContent = labelText + ' ';
    if (!span) label.textContent = labelText;
  }
}

function toggleLang() { document.getElementById('ldd').classList.toggle('show'); }
function setLang(lang) {
  currentLang = lang;
  document.getElementById('ldd').classList.remove('show');
  document.getElementById('lbtn').innerHTML = `<i class="fas fa-globe"></i> ${lang === 'hi' ? 'हिं' : 'EN'} <i class="fas fa-chevron-down" style="font-size:.58rem"></i>`;
  applyTranslations();
  renderDonors();
  renderRequests();
  showT(lang === 'hi' ? 'भाषा हिंदी में बदली गई ✓' : 'Language set to English ✓', 'info');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.lang-wrapper')) document.getElementById('ldd').classList.remove('show');
  if (!e.target.closest('.np') && !e.target.closest('.notif-btn')) document.getElementById('np').classList.remove('show');
});

function doSearch() {
  const city  = document.getElementById('cSrch').value.trim();
  const blood = document.getElementById('bSrch').value;
  if (city || blood) {
    showT(`Searching ${blood || 'all'} donors${city ? ' in ' + city : ''}...`, 'info');
    sTo('donors');
    if (blood) { const b = document.querySelector(`.fbtn[onclick*="'${blood}'"]`); if (b) fDonors(blood, b); }
  }
}

function sTo(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }


/* ─── CITIES ─── */
const CITIES = [
  { n: 'Delhi', c: 145 }, { n: 'Mumbai', c: 287 }, { n: 'Bangalore', c: 201 }, { n: 'Chennai', c: 98 },
  { n: 'Hyderabad', c: 134 }, { n: 'Kolkata', c: 76 }, { n: 'Pune', c: 93 }, { n: 'Ahmedabad', c: 88 },
  { n: 'Lucknow', c: 64 }, { n: 'Jaipur', c: 71 }, { n: 'Surat', c: 52 }, { n: 'Kochi', c: 55 },
];
function renderCities() {
  document.getElementById('cgrid').innerHTML = CITIES.map(c => `
    <div class="ccard" onclick="showT('Searching donors in ${c.n}...','info')">
      <div class="cname">${c.n}</div>
      <div class="ccnt"><span>${c.c}</span> donors</div>
    </div>`).join('');
}


/* ─── TOAST ─── */
function showT(msg, type = 'success') {
  const icons = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', info: 'fas fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="${icons[type]} ti${type.charAt(0)}"></i><span>${msg}</span>`;
  document.getElementById('tc').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}


/* ─── ECG CANVAS ANIMATION ─── */
function drawECG() {
  const canvas = document.getElementById('ecgC');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const w = canvas.width, h = canvas.height, mid = h / 2;

  function pt(p) {
    const x = ((p % 200) + 200) % 200;
    if (x < 40)  return 0;
    if (x < 50)  return -12;
    if (x < 60)  return 5;
    if (x < 65)  return 75;
    if (x < 75)  return -38;
    if (x < 90)  return 18;
    if (x < 100) return 4;
    return 0;
  }

  const pts = [];
  for (let i = 0; i < w + 200; i++) pts.push(pt(i));
  let offset = 0;

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle  = '#E8192C';
    ctx.lineWidth    = 2.5;
    ctx.shadowBlur   = 10;
    ctx.shadowColor  = '#E8192C';
    for (let i = 0; i < w; i++) {
      const y = mid - pts[(i + offset) % pts.length];
      if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
    }
    ctx.stroke();
    offset = (offset + 2) % pts.length;
    requestAnimationFrame(draw);
  }
  draw();
}


/* ─── FLOATING PARTICLES ─── */
function createParticles() {
  const container = document.getElementById('ptcls');
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'ptcl';
    p.style.cssText = `left:${Math.random() * 100}%;--d:${6 + Math.random() * 10}s;--x:${(Math.random() - .5) * 80}px;animation-delay:${Math.random() * 12}s;`;
    container.appendChild(p);
  }
}


/* ─── COUNTER ANIMATION ─── */
function animCnt(id, target, suffix = '') {
  let cur = 0;
  const el   = document.getElementById(id);
  const step = Math.max(1, ~~(target / 55));
  const timer = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur + suffix;
    if (cur >= target) clearInterval(timer);
  }, 25);
}


/* ─── SCROLL / RESIZE ─── */
window.addEventListener('scroll', () => {
  document.querySelector('nav').style.background = window.scrollY > 40 ? 'rgba(10,10,15,0.98)' : 'rgba(10,10,15,0.9)';
});
window.addEventListener('resize', () => {
  drawECG();
  if (lmap) lmap.invalidateSize();
});


/* ─── APP INIT ─── */
async function init() {
  await openDB();
  await seed();

  initModalCloseListeners();
  drawECG();
  createParticles();
  renderCities();
  renderDiseaseChecklist();

  await renderDonors();
  await renderRequests();
  await refreshDB();

  animCnt('s1', 1250, '+');
  animCnt('s2', 380,  '+');
  animCnt('s3', 450,  '+');
  animCnt('s4', 28,   '+');

  // File upload preview
  const rfInput = document.getElementById('rf');
  if (rfInput) rfInput.addEventListener('change', () => {
    const f = rfInput.files[0];
    const prev = document.getElementById('reportPreview');
    if (prev) prev.textContent = f ? `✓ ${f.name}` : '';
  });

  const msgRfInput = document.getElementById('msgReportFile');
  if (msgRfInput) msgRfInput.addEventListener('change', () => {
    const f = msgRfInput.files[0];
    const nm = document.getElementById('msgReportName');
    if (nm) nm.textContent = f ? `✓ ${f.name}` : '';
  });

  // Lazy-load map only when the map section scrolls into view
  const mapSection = document.getElementById('map');
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { initMap(); observer.disconnect(); }
  }, { threshold: 0.1 });
  observer.observe(mapSection);
}

document.addEventListener('DOMContentLoaded', init);
