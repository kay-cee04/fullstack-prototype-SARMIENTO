const STORAGE_KEY = 'ipt_demo_v1';
let currentUser = null;
let editingAccountEmail = null;
let editingDepartmentId = null;
let editingEmployeeId = null;

window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};

// Helper function to make authenticated API calls
async function fetchWithAuth(url, options = {}) {
    const token = sessionStorage.getItem('authToken');
    
    if (!token) {
        throw new Error('No authentication token');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    return fetch(url, {
        ...options,
        headers
    });
}

// Check if user is logged in on page load
async function checkAuth() {
    const token = sessionStorage.getItem('authToken');
    
    if (!token) {
        setAuthState(false);
        return;
    }
    
    try {
        const response = await fetchWithAuth('http://localhost:3000/api/profile');
        
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            setAuthState(true, user);
        } else {
            // Token invalid or expired
            sessionStorage.removeItem('authToken');
            setAuthState(false);
        }
    } catch (error) {
        console.error('Auth check error:', error);
        sessionStorage.removeItem('authToken');
        setAuthState(false);
    }
}

// Phase 4: Load from localStorage
function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            window.db = JSON.parse(data);
        } catch (error) {
            console.error('Error loading data:', error);
            seedInitialData();
        }
    } else {
        seedInitialData();
    }
    
    // Check if user is still logged in
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
        const user = window.db.accounts.find(a => a.email === authToken);
        if (user && user.verified) {
            setAuthState(true, user);
        } else {
            localStorage.removeItem('auth_token');
        }
    }
}

// Phase 4: Seed initial data
function seedInitialData() {
    window.db.accounts = [
        {
            email: 'admin@example.com',
            pass: 'Password123!',
            role: 'admin',
            verified: true,
            first: 'Admin',
            last: 'User'
        }
    ];
    window.db.departments = [
        { id: generateId(), name: 'Engineering', desc: 'Software development team' },
        { id: generateId(), name: 'HR', desc: 'Human resources and people team' }
    ];
    window.db.employees = [];
    window.db.requests = [];
    saveToStorage();
}

// Phase 4: Save to localStorage
function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// Helper: Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========================================
// Phase 2: Client-Side Routing
// ========================================
function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';
    const route = hash.replace('#/', '') || 'home';
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Protected routes
    const protectedRoutes = ['profile', 'requests', 'employees', 'accounts', 'departments'];
    const adminRoutes = ['employees', 'accounts', 'departments'];
    
    // Access control
    if (protectedRoutes.includes(route) && !currentUser) {
        showToast('Please login to access this page', 'warning');
        return navigateTo('#/login');
    }
    
    if (adminRoutes.includes(route) && currentUser?.role !== 'admin') {
        showToast('Access denied: Admin only', 'danger');
        return navigateTo('#/');
    }
    
    // Show target page
    const targetPage = document.getElementById(route + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Render dynamic content
        if (route === 'profile') renderProfile();
        if (route === 'requests') renderRequests();
        if (route === 'accounts') renderAccountsList();
        if (route === 'departments') renderDepartmentsList();
        if (route === 'employees') renderEmployeesList();
        if (route === 'verify-email') updateVerifyMessage();
    } else {
        document.getElementById('home-page').classList.add('active');
    }
}

// ========================================
// Phase 3: Authentication System
// ========================================

// A. Registration
document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const first = document.getElementById('reg-first').value.trim();
    const last = document.getElementById('reg-last').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value;
    
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ first, last, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('unverified_email', email);
            showToast('Account created! Please verify your email.', 'success');
            this.reset();
            navigateTo('#/verify-email');
        } else {
            showToast(data.error || 'Registration failed', 'danger');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Server error. Please try again.', 'danger');
    }
});

// B. Email Verification
document.getElementById('verify-btn').addEventListener('click', async function() {
    const email = localStorage.getItem('unverified_email');
    
    if (!email) {
        showToast('No email to verify', 'warning');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/verify-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.removeItem('unverified_email');
            showToast('✅ Email verified! You can now login.', 'success');
            navigateTo('#/login');
        } else {
            showToast(data.error || 'Verification failed', 'danger');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showToast('Server error. Please try again.', 'danger');
    }
});

// C. Login
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value;
    
    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store token in sessionStorage
            sessionStorage.setItem('authToken', data.token);
            
            // Update UI
            currentUser = data.user;
            setAuthState(true, data.user);
            
            showToast(`Welcome back, ${data.user.first}!`, 'success');
            this.reset();
            navigateTo('#/profile');
        } else {
            showToast(data.error || 'Login failed', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Server error. Please try again.', 'danger');
    }
});

// D. Auth State Management
function setAuthState(isAuth, user = null) {
    currentUser = user;
    const body = document.body;
    
    if (isAuth && user) {
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');
        
        if (user.role === 'admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }
        
        document.getElementById('user-display-name').textContent = user.first;
    } else {
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
        document.getElementById('user-display-name').textContent = 'User';
    }
}

// E. Logout
document.getElementById('logout-btn').addEventListener('click', function() {
    localStorage.removeItem('auth_token');
    setAuthState(false);
    showToast('Logged out successfully', 'info');
    navigateTo('#/');
});

// ========================================
// Phase 5: Profile Page
// ========================================
function renderProfile() {
    if (!currentUser) return;
    
    document.getElementById('prof-name').textContent = `${currentUser.first} ${currentUser.last}`;
    document.getElementById('prof-email').textContent = currentUser.email;
    document.getElementById('prof-role').textContent = currentUser.role.toUpperCase();
    document.getElementById('prof-verified').innerHTML = currentUser.verified 
        ? '<span class="badge badge-verified">Verified</span>'
        : '<span class="badge badge-unverified">Not Verified</span>';
}

document.getElementById('edit-profile-btn').addEventListener('click', function() {
    showToast('Edit profile feature coming soon!', 'info');
});

// ========================================
// Phase 7: User Requests
// ========================================

// Add/Remove item fields
document.getElementById('add-item-btn').addEventListener('click', function() {
    const container = document.getElementById('req-items-container');
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row input-group mb-2';
    itemRow.innerHTML = `
        <input type="text" class="form-control item-name" placeholder="Item Name" required>
        <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1" style="max-width: 100px;">
        <button type="button" class="btn btn-outline-danger remove-item">×</button>
    `;
    container.appendChild(itemRow);
    updateRemoveButtons();
});

document.getElementById('req-items-container').addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-item')) {
        e.target.closest('.item-row').remove();
        updateRemoveButtons();
    }
});

function updateRemoveButtons() {
    const rows = document.querySelectorAll('.item-row');
    rows.forEach((row, index) => {
        const btn = row.querySelector('.remove-item');
        btn.disabled = rows.length === 1;
    });
}

// Submit request
document.getElementById('submit-request-btn').addEventListener('click', function() {
    const type = document.getElementById('req-type').value;
    const itemNames = Array.from(document.querySelectorAll('.item-name')).map(i => i.value.trim());
    const itemQtys = Array.from(document.querySelectorAll('.item-qty')).map(i => i.value);
    
    // Validate
    if (itemNames.some(name => !name)) {
        return showToast('Please fill in all item names', 'warning');
    }
    
    const items = itemNames.map((name, i) => `${name} (${itemQtys[i]})`);
    
    const newRequest = {
        id: generateId(),
        type,
        items,
        status: 'Pending',
        date: new Date().toLocaleDateString(),
        employeeEmail: currentUser.email
    };
    
    window.db.requests.push(newRequest);
    saveToStorage();
    
    showToast('Request submitted successfully!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
    
    // Reset form
    document.getElementById('req-items-container').innerHTML = `
        <div class="item-row input-group mb-2">
            <input type="text" class="form-control item-name" placeholder="Item Name" required>
            <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1" style="max-width: 100px;">
            <button type="button" class="btn btn-outline-danger remove-item" disabled>×</button>
        </div>
    `;
    
    renderRequests();
});

function renderRequests() {
    const list = document.getElementById('request-list');
    const userRequests = window.db.requests.filter(r => r.employeeEmail === currentUser.email);
    
    if (userRequests.length === 0) {
        list.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No requests yet</td></tr>';
        return;
    }
    
    list.innerHTML = userRequests.map(r => {
        const badgeClass = r.status === 'Pending' ? 'bg-warning' : 
                          r.status === 'Approved' ? 'bg-success' : 'bg-danger';
        return `
            <tr>
                <td>${r.type}</td>
                <td>${r.items.join(', ')}</td>
                <td><span class="badge ${badgeClass}">${r.status}</span></td>
                <td>${r.date}</td>
            </tr>
        `;
    }).join('');
}

// ========================================
// Phase 6: Admin Features - Accounts
// ========================================
function renderAccountsList() {
    const list = document.getElementById('accounts-list');
    
    if (window.db.accounts.length === 0) {
        list.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No accounts found</td></tr>';
        return;
    }
    
    list.innerHTML = window.db.accounts.map(a => {
        const verifiedBadge = a.verified 
            ? '<span class="badge badge-verified">✓</span>'
            : '<span class="badge badge-unverified">✗</span>';
        const isCurrent = currentUser && a.email === currentUser.email;
        
        return `
            <tr>
                <td>${a.first} ${a.last}</td>
                <td>${a.email}</td>
                <td><span class="badge bg-primary">${a.role}</span></td>
                <td>${verifiedBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editAccount('${a.email}')">Edit</button>
                    <button class="btn btn-sm btn-outline-warning" onclick="resetPassword('${a.email}')">Reset PW</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAccount('${a.email}')" ${isCurrent ? 'disabled' : ''}>Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Add account
document.getElementById('add-account-btn').addEventListener('click', function() {
    editingAccountEmail = null;
    document.getElementById('accountModalTitle').textContent = 'Add Account';
    document.getElementById('account-form').reset();
    document.getElementById('account-pass').required = true;
    document.getElementById('account-pass-container').style.display = 'block';
});

// Save account
document.getElementById('save-account-btn').addEventListener('click', function() {
    const first = document.getElementById('account-first').value.trim();
    const last = document.getElementById('account-last').value.trim();
    const email = document.getElementById('account-email').value.trim();
    const pass = document.getElementById('account-pass').value;
    const role = document.getElementById('account-role').value;
    const verified = document.getElementById('account-verified').checked;
    
    // Validate
    if (!first || !last || !email) {
        return showToast('Please fill in all required fields', 'warning');
    }
    
    if (editingAccountEmail) {
        // Edit existing
        const account = window.db.accounts.find(a => a.email === editingAccountEmail);
        if (account) {
            account.first = first;
            account.last = last;
            if (email !== editingAccountEmail) {
                // Check if new email exists
                if (window.db.accounts.find(a => a.email === email)) {
                    return showToast('Email already exists!', 'danger');
                }
                account.email = email;
            }
            if (pass) account.pass = pass;
            account.role = role;
            account.verified = verified;
            
            showToast('Account updated successfully!', 'success');
        }
    } else {
        // Add new
        if (window.db.accounts.find(a => a.email === email)) {
            return showToast('Email already exists!', 'danger');
        }
        
        if (!pass || pass.length < 6) {
            return showToast('Password must be at least 6 characters', 'warning');
        }
        
        window.db.accounts.push({ first, last, email, pass, role, verified });
        showToast('Account created successfully!', 'success');
    }
    
    saveToStorage();
    bootstrap.Modal.getInstance(document.getElementById('accountModal')).hide();
    renderAccountsList();
});

// Edit account
window.editAccount = function(email) {
    const account = window.db.accounts.find(a => a.email === email);
    if (!account) return;
    
    editingAccountEmail = email;
    document.getElementById('accountModalTitle').textContent = 'Edit Account';
    document.getElementById('account-first').value = account.first;
    document.getElementById('account-last').value = account.last;
    document.getElementById('account-email').value = account.email;
    document.getElementById('account-pass').value = '';
    document.getElementById('account-pass').required = false;
    document.getElementById('account-role').value = account.role;
    document.getElementById('account-verified').checked = account.verified;
    
    const modal = new bootstrap.Modal(document.getElementById('accountModal'));
    modal.show();
};

// Reset password
window.resetPassword = function(email) {
    const newPass = prompt('Enter new password (min 6 characters):');
    if (!newPass) return;
    
    if (newPass.length < 6) {
        return showToast('Password must be at least 6 characters', 'warning');
    }
    
    const account = window.db.accounts.find(a => a.email === email);
    if (account) {
        account.pass = newPass;
        saveToStorage();
        showToast('Password reset successfully!', 'success');
    }
};

// Delete account
window.deleteAccount = function(email) {
    if (currentUser && email === currentUser.email) {
        return showToast('Cannot delete your own account!', 'danger');
    }
    
    if (!confirm(`Are you sure you want to delete account: ${email}?`)) return;
    
    window.db.accounts = window.db.accounts.filter(a => a.email !== email);
    saveToStorage();
    showToast('Account deleted successfully!', 'success');
    renderAccountsList();
};

// ========================================
// Phase 6: Admin Features - Departments
// ========================================
function renderDepartmentsList() {
    const list = document.getElementById('departments-list');
    
    if (window.db.departments.length === 0) {
        list.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No departments found</td></tr>';
        return;
    }
    
    list.innerHTML = window.db.departments.map(d => `
        <tr>
            <td>${d.name}</td>
            <td>${d.desc || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editDepartment('${d.id}')">Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteDepartment('${d.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Add department
document.querySelector('[data-bs-target="#departmentModal"]').addEventListener('click', function() {
    editingDepartmentId = null;
    document.getElementById('departmentModalTitle').textContent = 'Add Department';
    document.getElementById('department-form').reset();
});

// Save department
document.getElementById('save-department-btn').addEventListener('click', function() {
    const name = document.getElementById('dept-name').value.trim();
    const desc = document.getElementById('dept-desc').value.trim();
    
    if (!name) {
        return showToast('Please enter a department name', 'warning');
    }
    
    if (editingDepartmentId) {
        // Edit existing
        const dept = window.db.departments.find(d => d.id === editingDepartmentId);
        if (dept) {
            dept.name = name;
            dept.desc = desc;
            showToast('Department updated successfully!', 'success');
        }
    } else {
        // Add new
        window.db.departments.push({
            id: generateId(),
            name,
            desc
        });
        showToast('Department created successfully!', 'success');
    }
    
    saveToStorage();
    bootstrap.Modal.getInstance(document.getElementById('departmentModal')).hide();
    renderDepartmentsList();
});

// Edit department
window.editDepartment = function(id) {
    const dept = window.db.departments.find(d => d.id === id);
    if (!dept) return;
    
    editingDepartmentId = id;
    document.getElementById('departmentModalTitle').textContent = 'Edit Department';
    document.getElementById('dept-name').value = dept.name;
    document.getElementById('dept-desc').value = dept.desc || '';
    
    const modal = new bootstrap.Modal(document.getElementById('departmentModal'));
    modal.show();
};

// Delete department
window.deleteDepartment = function(id) {
    const dept = window.db.departments.find(d => d.id === id);
    if (!confirm(`Are you sure you want to delete department: ${dept.name}?`)) return;
    
    window.db.departments = window.db.departments.filter(d => d.id !== id);
    saveToStorage();
    showToast('Department deleted successfully!', 'success');
    renderDepartmentsList();
};

// ========================================
// Phase 6: Admin Features - Employees
// ========================================
function renderEmployeesList() {
    const list = document.getElementById('employees-list');
    
    if (window.db.employees.length === 0) {
        list.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No employees found</td></tr>';
        return;
    }
    
    list.innerHTML = window.db.employees.map(e => {
        const dept = window.db.departments.find(d => d.id === e.deptId);
        return `
            <tr>
                <td>${e.empId}</td>
                <td>${e.email}</td>
                <td>${e.position}</td>
                <td>${dept ? dept.name : 'N/A'}</td>
                <td>${e.hireDate}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editEmployee('${e.id}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee('${e.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Populate employee form dropdowns
function populateEmployeeForm() {
    // Populate user emails
    const emailSelect = document.getElementById('emp-email');
    emailSelect.innerHTML = '<option value="">Select User...</option>' +
        window.db.accounts.map(a => `<option value="${a.email}">${a.email} (${a.first} ${a.last})</option>`).join('');
    
    // Populate departments
    const deptSelect = document.getElementById('emp-dept');
    deptSelect.innerHTML = '<option value="">Select Department...</option>' +
        window.db.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
}

// Add employee
document.getElementById('add-employee-btn').addEventListener('click', function() {
    editingEmployeeId = null;
    document.getElementById('employeeModalTitle').textContent = 'Add Employee';
    document.getElementById('employee-form').reset();
    populateEmployeeForm();
});

// Save employee
document.getElementById('save-employee-btn').addEventListener('click', function() {
    const empId = document.getElementById('emp-empid').value.trim();
    const email = document.getElementById('emp-email').value;
    const position = document.getElementById('emp-position').value.trim();
    const deptId = document.getElementById('emp-dept').value;
    const hireDate = document.getElementById('emp-hiredate').value;
    
    if (!empId || !email || !position || !deptId || !hireDate) {
        return showToast('Please fill in all fields', 'warning');
    }
    
    // Verify email exists
    if (!window.db.accounts.find(a => a.email === email)) {
        return showToast('User email not found in accounts', 'danger');
    }
    
    if (editingEmployeeId) {
        // Edit existing
        const emp = window.db.employees.find(e => e.id === editingEmployeeId);
        if (emp) {
            emp.empId = empId;
            emp.email = email;
            emp.position = position;
            emp.deptId = deptId;
            emp.hireDate = hireDate;
            showToast('Employee updated successfully!', 'success');
        }
    } else {
        // Add new
        window.db.employees.push({
            id: generateId(),
            empId,
            email,
            position,
            deptId,
            hireDate
        });
        showToast('Employee created successfully!', 'success');
    }
    
    saveToStorage();
    bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
    renderEmployeesList();
});

// Edit employee
window.editEmployee = function(id) {
    const emp = window.db.employees.find(e => e.id === id);
    if (!emp) return;
    
    editingEmployeeId = id;
    document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
    populateEmployeeForm();
    
    document.getElementById('emp-empid').value = emp.empId;
    document.getElementById('emp-email').value = emp.email;
    document.getElementById('emp-position').value = emp.position;
    document.getElementById('emp-dept').value = emp.deptId;
    document.getElementById('emp-hiredate').value = emp.hireDate;
    
    const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
    modal.show();
};

// Delete employee
window.deleteEmployee = function(id) {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    
    window.db.employees = window.db.employees.filter(e => e.id !== id);
    saveToStorage();
    showToast('Employee deleted successfully!', 'success');
    renderEmployeesList();
};

// ========================================
// Phase 8: Toast Notifications
// ========================================
function showToast(message, type = 'info') {
    const id = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast-item alert alert-${type} shadow`;
    toast.textContent = message;
    
    document.getElementById('toast-container').appendChild(toast);
    
    setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.remove();
    }, 3000);
}

// ========================================
// Initialization
// ========================================
window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    
    handleRouting();
});
