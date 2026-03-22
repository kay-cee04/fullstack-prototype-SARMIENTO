'use strict';

// GLOBALS 
const STORAGE_KEY = 'ipt_demo_v1';
let currentUser = null;
let editingEmployeeId = null;
let editingDeptId = null;
let editingAccountEmail = null;

window.db = {
  accounts: [],
  departments: [],
  employees: [],
  requests: []
};

//  STORAGE 
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      window.db = JSON.parse(raw);
    } else {
      seedData();
    }
  } catch {
    seedData();
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function seedData() {
  window.db = {
    accounts: [
      {
        firstName: 'Admin', lastName: 'User',
        email: 'admin@example.com',
        password: 'Password123!',
        role: 'admin', verified: true
      },
      {
        firstName: 'Alice', lastName: 'Santos',
        email: 'alice@example.com',
        password: 'Password123!',
        role: 'user', verified: true
      }
    ],
    departments: [
      { id: 'd1', name: 'Engineering', description: 'Software team' },
      { id: 'd2', name: 'HR', description: 'Human Resources' }
    ],
    employees: [],
    requests: []
  };
  saveToStorage();
}

//  ROUTING 
const protectedRoutes = ['#/profile', '#/requests'];
const adminRoutes = ['#/employees', '#/accounts', '#/departments'];

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRouting() {
  const hash = window.location.hash || '#/';

  // Auth guards
  if (protectedRoutes.includes(hash) && !currentUser) {
    navigateTo('#/login');
    return;
  }
  if (adminRoutes.includes(hash)) {
    if (!currentUser) { navigateTo('#/login'); return; }
    if (currentUser.role !== 'admin') {
      showToast('Access denied: Admins only.', 'danger');
      navigateTo('#/');
      return;
    }
  }

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const routeMap = {
    '#/': 'home-page',
    '#/register': 'register-page',
    '#/verify-email': 'verify-email-page',
    '#/login': 'login-page',
    '#/profile': 'profile-page',
    '#/employees': 'employees-page',
    '#/departments': 'departments-page',
    '#/accounts': 'accounts-page',
    '#/requests': 'requests-page'
  };

  const pageId = routeMap[hash] || 'home-page';
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');

  // Render functions per route
  if (hash === '#/profile') renderProfile();
  if (hash === '#/employees') renderEmployeesTable();
  if (hash === '#/departments') renderDepartmentsTable();
  if (hash === '#/accounts') renderAccountsList();
  if (hash === '#/requests') renderRequests();
  if (hash === '#/verify-email') {
    const email = localStorage.getItem('unverified_email') || '';
    document.getElementById('verify-email-display').textContent = email;
  }
}

window.addEventListener('hashchange', handleRouting);

//  AUTH STATE 
function setAuthState(isAuth, user) {
  currentUser = user || null;
  const body = document.body;
  if (isAuth && user) {
    body.classList.remove('not-authenticated');
    body.classList.add('authenticated');
    if (user.role === 'admin') body.classList.add('is-admin');
    else body.classList.remove('is-admin');

    document.getElementById('nav-username').textContent = user.firstName || user.email;
    document.getElementById('nav-avatar').textContent = (user.firstName || 'U')[0].toUpperCase();
  } else {
    body.classList.add('not-authenticated');
    body.classList.remove('authenticated', 'is-admin');
  }
}

//  REGISTRATION 
function register() {
  const firstName = document.getElementById('reg-firstname').value.trim();
  const lastName  = document.getElementById('reg-lastname').value.trim();
  const email     = document.getElementById('reg-email').value.trim().toLowerCase();
  const password  = document.getElementById('reg-password').value;

  if (!firstName || !lastName || !email || !password) {
    showToast('All fields are required.', 'danger'); return;
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', 'danger'); return;
  }
  if (window.db.accounts.find(a => a.email === email)) {
    showToast('Email already registered.', 'danger'); return;
  }

  window.db.accounts.push({ firstName, lastName, email, password, role: 'user', verified: false });
  saveToStorage();
  localStorage.setItem('unverified_email', email);
  navigateTo('#/verify-email');
}

//  EMAIL VERIFICATION 
function simulateVerification() {
  const email = localStorage.getItem('unverified_email');
  const account = window.db.accounts.find(a => a.email === email);
  if (account) {
    account.verified = true;
    saveToStorage();
    showToast('Email verified! You can now log in.', 'success');
    navigateTo('#/login');
  } else {
    showToast('Account not found.', 'danger');
  }
}

//  LOGIN 
function loginUser() {
  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const alertEl  = document.getElementById('login-alert');

  const account = window.db.accounts.find(
    a => a.email === email && a.password === password && a.verified
  );

  if (!account) {
    alertEl.textContent = 'Invalid credentials or email not verified.';
    alertEl.classList.remove('d-none');
    return;
  }

  alertEl.classList.add('d-none');
  localStorage.setItem('auth_token', email);
  setAuthState(true, account);
  showToast(`Welcome back, ${account.firstName}!`, 'success');
  navigateTo ('#/profile');
}

//  LOGOUT 
function logout() {
  localStorage.removeItem('auth_token');
  setAuthState(false);
  showToast('Logged out successfully.', 'info');
  navigateTo('#/');
}

//  PROFILE 
function renderProfile() {
  if (!currentUser) return;
  const u = currentUser;
  document.getElementById('profile-content').innerHTML = `
    <div class="profile-avatar">${(u.firstName || 'U')[0].toUpperCase()}</div>
    <div class="profile-field">
      <label>Full Name</label>
      <span>${u.firstName} ${u.lastName}</span>
    </div>
    <div class="profile-field">
      <label>Email</label>
      <span>${u.email}</span>
    </div>
    <div class="profile-field">
      <label>Role</label>
      <span class="badge-${u.role}">${u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span>
    </div>
    <div class="profile-field">
      <label>Verified</label>
      <span>${u.verified ? '✅ Yes' : '❌ No'}</span>
    </div>
    <button class="btn btn-outline-secondary mt-3" onclick="showToast('Edit profile coming soon!','info')">Edit Profile</button>
  `;
}

//  EMPLOYEES 
function renderEmployeesTable() {
  const tbody = document.getElementById('employees-tbody');
  if (!window.db.employees.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No employees yet.</td></tr>';
    return;
  }
  tbody.innerHTML = window.db.employees.map(emp => {
    const dept = window.db.departments.find(d => d.id === emp.deptId);
    const acct = window.db.accounts.find(a => a.email === emp.email);
    const name = acct ? `${acct.firstName} ${acct.lastName}` : '—';
    return `
      <tr>
        <td><code>${emp.id}</code></td>
        <td><strong>${name}</strong><br/><small class="text-muted">${emp.email}</small></td>
        <td>${emp.position}</td>
        <td>${dept ? dept.name : '—'}</td>
        <td>${emp.hireDate || '—'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editEmployee('${emp.id}')">Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee('${emp.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function showEmployeeForm(id) {
  editingEmployeeId = id || null;
  const card = document.getElementById('employee-form-card');
  card.classList.remove('d-none');
  document.getElementById('emp-form-title').textContent = id ? 'Edit Employee' : 'Add Employee';

  // Populate dept dropdown
  const deptSel = document.getElementById('emp-dept');
  deptSel.innerHTML = window.db.departments.map(d =>
    `<option value="${d.id}">${d.name}</option>`
  ).join('');

  if (id) {
    const emp = window.db.employees.find(e => e.id === id);
    if (emp) {
      document.getElementById('emp-id').value = emp.id;
      document.getElementById('emp-email').value = emp.email;
      document.getElementById('emp-position').value = emp.position;
      document.getElementById('emp-dept').value = emp.deptId;
      document.getElementById('emp-hiredate').value = emp.hireDate;
    }
  } else {
    document.getElementById('emp-id').value = '';
    document.getElementById('emp-email').value = '';
    document.getElementById('emp-position').value = '';
    document.getElementById('emp-hiredate').value = '';
  }
  card.scrollIntoView({ behavior: 'smooth' });
}

function hideEmployeeForm() {
  document.getElementById('employee-form-card').classList.add('d-none');
  editingEmployeeId = null;
}

function saveEmployee() {
  const id       = document.getElementById('emp-id').value.trim();
  const email    = document.getElementById('emp-email').value.trim().toLowerCase();
  const position = document.getElementById('emp-position').value.trim();
  const deptId   = document.getElementById('emp-dept').value;
  const hireDate = document.getElementById('emp-hiredate').value;

  if (!id || !email || !position || !deptId) {
    showToast('All fields except Hire Date are required.', 'danger'); return;
  }
  if (!window.db.accounts.find(a => a.email === email)) {
    showToast('Email does not match any existing account.', 'danger'); return;
  }

  if (editingEmployeeId) {
    const idx = window.db.employees.findIndex(e => e.id === editingEmployeeId);
    if (idx > -1) window.db.employees[idx] = { id, email, position, deptId, hireDate };
    showToast('Employee updated.', 'success');
  } else {
    if (window.db.employees.find(e => e.id === id)) {
      showToast('Employee ID already exists.', 'danger'); return;
    }
    window.db.employees.push({ id, email, position, deptId, hireDate });
    showToast('Employee added.', 'success');
  }
  saveToStorage();
  hideEmployeeForm();
  renderEmployeesTable();
}

function editEmployee(id) { showEmployeeForm(id); }

function deleteEmployee(id) {
  if (!confirm('Delete this employee?')) return;
  window.db.employees = window.db.employees.filter(e => e.id !== id);
  saveToStorage();
  renderEmployeesTable();
  showToast('Employee deleted.', 'info');
}

//  DEPARTMENTS 
function renderDepartmentsTable() {
  const tbody = document.getElementById('departments-tbody');
  if (!window.db.departments.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">No departments yet.</td></tr>';
    return;
  }
  tbody.innerHTML = window.db.departments.map(d => `
    <tr>
      <td><strong>${d.name}</strong></td>
      <td>${d.description}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editDept('${d.id}')">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteDept('${d.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function showDeptForm(id) {
  editingDeptId = id || null;
  const card = document.getElementById('dept-form-card');
  card.classList.remove('d-none');
  document.getElementById('dept-form-title').textContent = id ? 'Edit Department' : 'Add Department';
  if (id) {
    const dept = window.db.departments.find(d => d.id === id);
    if (dept) {
      document.getElementById('dept-name').value = dept.name;
      document.getElementById('dept-desc').value = dept.description;
    }
  } else {
    document.getElementById('dept-name').value = '';
    document.getElementById('dept-desc').value = '';
  }
  card.scrollIntoView({ behavior: 'smooth' });
}

function hideDeptForm() {
  document.getElementById('dept-form-card').classList.add('d-none');
  editingDeptId = null;
}

function saveDept() {
  const name = document.getElementById('dept-name').value.trim();
  const desc = document.getElementById('dept-desc').value.trim();
  if (!name) { showToast('Department name is required.', 'danger'); return; }

  if (editingDeptId) {
    const idx = window.db.departments.findIndex(d => d.id === editingDeptId);
    if (idx > -1) window.db.departments[idx] = { id: editingDeptId, name, description: desc };
    showToast('Department updated.', 'success');
  } else {
    const id = 'd' + Date.now();
    window.db.departments.push({ id, name, description: desc });
    showToast('Department added.', 'success');
  }
  saveToStorage();
  hideDeptForm();
  renderDepartmentsTable();
}

function editDept(id) { showDeptForm(id); }

function deleteDept(id) {
  if (!confirm('Delete this department?')) return;
  window.db.departments = window.db.departments.filter(d => d.id !== id);
  saveToStorage();
  renderDepartmentsTable();
  showToast('Department deleted.', 'info');
}

//  ACCOUNTS 
function renderAccountsList() {
  const tbody = document.getElementById('accounts-tbody');
  tbody.innerHTML = window.db.accounts.map(a => `
    <tr>
      <td><strong>${a.firstName} ${a.lastName}</strong></td>
      <td>${a.email}</td>
      <td><span class="badge-${a.role}">${a.role}</span></td>
      <td>${a.verified ? '✅' : '❌'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editAccount('${a.email}')">Edit</button>
        <button class="btn btn-sm btn-outline-warning me-1" onclick="resetPassword('${a.email}')">Reset PW</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteAccount('${a.email}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function showAccountForm(email) {
  editingAccountEmail = email || null;
  const card = document.getElementById('account-form-card');
  card.classList.remove('d-none');
  document.getElementById('acc-form-title').textContent = email ? 'Edit Account' : 'Add Account';
  if (email) {
    const acct = window.db.accounts.find(a => a.email === email);
    if (acct) {
      document.getElementById('acc-firstname').value = acct.firstName;
      document.getElementById('acc-lastname').value = acct.lastName;
      document.getElementById('acc-email').value = acct.email;
      document.getElementById('acc-password').value = acct.password;
      document.getElementById('acc-role').value = acct.role;
      document.getElementById('acc-verified').checked = acct.verified;
    }
  } else {
    document.getElementById('acc-firstname').value = '';
    document.getElementById('acc-lastname').value = '';
    document.getElementById('acc-email').value = '';
    document.getElementById('acc-password').value = '';
    document.getElementById('acc-role').value = 'user';
    document.getElementById('acc-verified').checked = false;
  }
  card.scrollIntoView({ behavior: 'smooth' });
}

function hideAccountForm() {
  document.getElementById('account-form-card').classList.add('d-none');
  editingAccountEmail = null;
}

function saveAccount() {
  const firstName = document.getElementById('acc-firstname').value.trim();
  const lastName  = document.getElementById('acc-lastname').value.trim();
  const email     = document.getElementById('acc-email').value.trim().toLowerCase();
  const password  = document.getElementById('acc-password').value;
  const role      = document.getElementById('acc-role').value;
  const verified  = document.getElementById('acc-verified').checked;

  if (!firstName || !lastName || !email || !password) {
    showToast('All fields are required.', 'danger'); return;
  }
  if (password.length < 6) { showToast('Password min 6 chars.', 'danger'); return; }

  if (editingAccountEmail) {
    const idx = window.db.accounts.findIndex(a => a.email === editingAccountEmail);
    if (idx > -1) window.db.accounts[idx] = { firstName, lastName, email, password, role, verified };
    showToast('Account updated.', 'success');
  } else {
    if (window.db.accounts.find(a => a.email === email)) {
      showToast('Email already exists.', 'danger'); return;
    }
    window.db.accounts.push({ firstName, lastName, email, password, role, verified });
    showToast('Account created.', 'success');
  }
  saveToStorage();
  hideAccountForm();
  renderAccountsList();
}

function editAccount(email) { showAccountForm(email); }

function resetPassword(email) {
  const newPw = prompt('Enter new password (min 6 chars):');
  if (!newPw) return;
  if (newPw.length < 6) { showToast('Password too short.', 'danger'); return; }
  const acct = window.db.accounts.find(a => a.email === email);
  if (acct) {
    acct.password = newPw;
    saveToStorage();
    showToast('Password reset.', 'success');
  }
}

function deleteAccount(email) {
  if (currentUser && currentUser.email === email) {
    showToast("You can't delete your own account.", 'danger'); return;
  }
  if (!confirm(`Delete account for ${email}?`)) return;
  window.db.accounts = window.db.accounts.filter(a => a.email !== email);
  saveToStorage();
  renderAccountsList();
  showToast('Account deleted.', 'info');
}

//  REQUESTS 
function openRequestModal() {
  document.getElementById('req-items-container').innerHTML = '';
  addRequestItem();
  new bootstrap.Modal(document.getElementById('requestModal')).show();
}

function addRequestItem() {
  const container = document.getElementById('req-items-container');
  const row = document.createElement('div');
  row.className = 'req-item-row';
  row.innerHTML = `
    <input type="text" class="form-control item-name" placeholder="Item name" />
    <input type="number" class="form-control qty item-qty" value="1" min="1" />
    <button class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(row);
}

function submitRequest() {
  if (!currentUser) return;
  const type = document.getElementById('req-type').value;
  const itemEls = document.querySelectorAll('#req-items-container .req-item-row');
  const items = [];
  itemEls.forEach(row => {
    const name = row.querySelector('.item-name').value.trim();
    const qty  = parseInt(row.querySelector('.item-qty').value) || 1;
    if (name) items.push({ name, qty });
  });
  if (!items.length) { showToast('Add at least one item.', 'danger'); return; }

  window.db.requests.push({
    id: 'REQ-' + Date.now(),
    type, items,
    status: 'Pending',
    date: new Date().toLocaleDateString(),
    employeeEmail: currentUser.email
  });
  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
  showToast('Request submitted!', 'success');
  renderRequests();
}

function renderRequests() {
  if (!currentUser) return;
  const userReqs = window.db.requests.filter(r => r.employeeEmail === currentUser.email);
  const empty = document.getElementById('requests-empty');
  const wrapper = document.getElementById('requests-table-wrapper');

  if (!userReqs.length) {
    empty.classList.remove('d-none');
    wrapper.classList.add('d-none');
    return;
  }
  empty.classList.add('d-none');
  wrapper.classList.remove('d-none');

  document.getElementById('requests-tbody').innerHTML = userReqs.map(r => {
    const itemList = r.items.map(i => `${i.name} (x${i.qty})`).join(', ');
    const statusClass = r.status === 'Pending' ? 'status-pending'
      : r.status === 'Approved' ? 'status-approved' : 'status-rejected';
    return `
      <tr>
        <td>${r.type}</td>
        <td><small>${itemList}</small></td>
        <td><span class="${statusClass}">${r.status}</span></td>
        <td>${r.date}</td>
      </tr>
    `;
  }).join('');
}

//  TOAST 
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const id = 'toast-' + Date.now();
  const typeClass = `toast-${type}`;
  const div = document.createElement('div');
  div.innerHTML = `
    <div id="${id}" class="toast ${typeClass} show align-items-center" role="alert">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close me-2 m-auto" onclick="document.getElementById('${id}').remove()"></button>
      </div>
    </div>
  `;
  container.appendChild(div);
  setTimeout(() => { const el = document.getElementById(id); if (el) el.remove(); }, 3500);
}

function init() {
  loadFromStorage();

  // Restore session
  const token = localStorage.getItem('auth_token');
  if (token) {
    const account = window.db.accounts.find(a => a.email === token);
    if (account) setAuthState(true, account);
  }

  // Set initial hash
  if (!window.location.hash) window.location.hash = '#/';
  handleRouting();
}

init();