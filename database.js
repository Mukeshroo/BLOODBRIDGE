/* ============================================================
   BloodBridge — database.js
   Backend: IndexedDB Database Layer (Full CRUD + REST-like API)
   ============================================================
   Stores:
     - users    : registered accounts (email, password, role)
     - donors   : blood donor profiles (blood group, city, availability)
     - requests : emergency blood requests (urgency, status, matches)
     - messages : donor-patient message threads
   ============================================================ */

const DB_NAME = 'BloodBridgeDB';
const DB_VER  = 2;
let db = null;

/* ─── Open / Upgrade Database ─── */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = e => {
      const d = e.target.result;

      // users store
      if (!d.objectStoreNames.contains('users')) {
        const s = d.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        s.createIndex('email', 'email', { unique: true });
        s.createIndex('role',  'role',  {});
      }

      // donors store
      if (!d.objectStoreNames.contains('donors')) {
        const s = d.createObjectStore('donors', { keyPath: 'id', autoIncrement: true });
        s.createIndex('blood',  'bloodGroup', {});
        s.createIndex('city',   'city',       {});
        s.createIndex('userId', 'userId',     {});
      }

      // requests store
      if (!d.objectStoreNames.contains('requests')) {
        const s = d.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
        s.createIndex('status',     'status',     {});
        s.createIndex('bloodGroup', 'bloodGroup', {});
        s.createIndex('city',       'city',       {});
      }

      // messages store
      if (!d.objectStoreNames.contains('messages')) {
        const s = d.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
        s.createIndex('fromId',    'fromId',    {});
        s.createIndex('toId',      'toId',      {});
        s.createIndex('requestId', 'requestId', {});
      }
    };

    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror   = e => reject(e.target.error);
  });
}

/* ─── CRUD API ─── */
const DB = {

  /** INSERT a record — auto-adds createdAt timestamp */
  add(store, data) {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).add({ ...data, createdAt: new Date().toISOString() });
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  },

  /** SELECT ALL records from a store */
  getAll(store) {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  },

  /** SELECT by primary key */
  getById(store, id) {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  },

  /** SELECT by index value */
  byIndex(store, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).index(indexName).getAll(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  },

  /** UPDATE (full record replacement — must include id) */
  update(store, data) {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put({ ...data, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  },

  /** DELETE by primary key */
  delete(store, id) {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  },

  /** COUNT all records in a store */
  count(store) {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  },

  /** CLEAR all records from a store */
  clear(store) {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).clear();
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  },
};

/* ─── Seed Initial Data ─── */
async function seed() {
  const existing = await DB.count('donors');
  if (existing > 0) return; // already seeded

  const seedDonors = [
    { name: 'Aaron Sharma',  city: 'Delhi',     state: 'Delhi',          bloodGroup: 'A+',  phone: '+91-98765-43210', email: 'aaron@mail.com',  status: 'available',   age: 28, lat: 28.6139, lng: 77.2090, color: '#e8192c', userId: null },
    { name: 'Priya Patel',   city: 'Bangalore',  state: 'Karnataka',      bloodGroup: 'A-',  phone: '+91-98765-43211', email: 'priya@mail.com',  status: 'available',   age: 25, lat: 12.9716, lng: 77.5946, color: '#e8192c', userId: null },
    { name: 'Rahul Kumar',   city: 'Kolkata',    state: 'West Bengal',    bloodGroup: 'B+',  phone: '+91-98765-43212', email: 'rahul@mail.com',  status: 'available',   age: 32, lat: 22.5726, lng: 88.3639, color: '#3b82f6', userId: null },
    { name: 'Sneha Gupta',   city: 'Hyderabad',  state: 'Telangana',      bloodGroup: 'B-',  phone: '+91-98765-43213', email: 'sneha@mail.com',  status: 'unavailable', age: 29, lat: 17.3850, lng: 78.4867, color: '#3b82f6', userId: null },
    { name: 'Vikram Singh',  city: 'Hyderabad',  state: 'Telangana',      bloodGroup: 'AB+', phone: '+91-98765-43214', email: 'vikram@mail.com', status: 'available',   age: 35, lat: 17.4500, lng: 78.5200, color: '#a855f7', userId: null },
    { name: 'Ananya Reddy',  city: 'Pune',       state: 'Maharashtra',    bloodGroup: 'AB-', phone: '+91-98765-43215', email: 'ananya@mail.com', status: 'available',   age: 27, lat: 18.5204, lng: 73.8567, color: '#a855f7', userId: null },
    { name: 'Karan Joshi',   city: 'Mumbai',     state: 'Maharashtra',    bloodGroup: 'O+',  phone: '+91-98765-43216', email: 'karan@mail.com',  status: 'available',   age: 31, lat: 19.0760, lng: 72.8777, color: '#22c55e', userId: null },
    { name: 'Meera Nair',    city: 'Ahmedabad',  state: 'Gujarat',        bloodGroup: 'O-',  phone: '+91-98765-43217', email: 'meera@mail.com',  status: 'unavailable', age: 26, lat: 23.0225, lng: 72.5714, color: '#f59e0b', userId: null },
    { name: 'Arjun Mehta',   city: 'Delhi',      state: 'Delhi',          bloodGroup: 'A+',  phone: '+91-98765-43218', email: 'arjun@mail.com',  status: 'available',   age: 24, lat: 28.7041, lng: 77.1025, color: '#e8192c', userId: null },
    { name: 'Pooja Iyer',    city: 'Chennai',    state: 'Tamil Nadu',     bloodGroup: 'B+',  phone: '+91-98765-43219', email: 'pooja@mail.com',  status: 'available',   age: 30, lat: 13.0827, lng: 80.2707, color: '#3b82f6', userId: null },
    { name: 'Suresh Das',    city: 'Chennai',    state: 'Tamil Nadu',     bloodGroup: 'O+',  phone: '+91-98765-43220', email: 'suresh@mail.com', status: 'available',   age: 33, lat: 13.1200, lng: 80.2900, color: '#22c55e', userId: null },
    { name: 'Kavya Rao',     city: 'Lucknow',    state: 'Uttar Pradesh',  bloodGroup: 'AB-', phone: '+91-98765-43221', email: 'kavya@mail.com',  status: 'available',   age: 28, lat: 26.8467, lng: 80.9462, color: '#a855f7', userId: null },
  ];

  const seedRequests = [
    { patientName: 'Ramesh Agarwal', bloodGroup: 'O-',  units: 2, hospital: 'Apollo Hospital',  city: 'Mumbai',    contactName: 'Suresh Agarwal', contactPhone: '+91-98-1234-5678', urgency: 'critical', status: 'active', matchedDonors: 3 },
    { patientName: 'Anjali Kapoor',  bloodGroup: 'AB-', units: 1, hospital: 'AIIMS Delhi',       city: 'Delhi',     contactName: 'Rahul Kapoor',   contactPhone: '+91-98-2345-6789', urgency: 'critical', status: 'active', matchedDonors: 1 },
    { patientName: 'Sunita Bhat',    bloodGroup: 'B+',  units: 3, hospital: 'Fortis Hospital',   city: 'Delhi',     contactName: 'Amit Bhat',      contactPhone: '+91-98-3456-7890', urgency: 'urgent',   status: 'active', matchedDonors: 5 },
    { patientName: 'Manoj Tiwari',   bloodGroup: 'A+',  units: 2, hospital: 'Manipal Hospital',  city: 'Bangalore', contactName: 'Priya Tiwari',   contactPhone: '+91-98-4567-8901', urgency: 'normal',   status: 'active', matchedDonors: 8 },
  ];

  for (const d of seedDonors)  await DB.add('donors',   d);
  for (const r of seedRequests) await DB.add('requests', r);

  console.log('[BloodBridge DB] Seeded 12 donors and 4 requests.');
}
