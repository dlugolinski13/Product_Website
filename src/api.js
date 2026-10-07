// The JWT goes in X-Authorization, not Authorization: Azure Static Web Apps overwrites
// Authorization on managed Functions requests (see api/src/lib/auth.js).
async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error((body && body.error) || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function register(email, password) {
  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function fetchProducts(token) {
  return request('/products', { headers: { 'X-Authorization': `Bearer ${token}` } });
}

export function createProduct(token, product) {
  return request('/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Authorization': `Bearer ${token}` },
    body: JSON.stringify(product),
  });
}

export function addProductImage(token, productId, file) {
  return request(`/products/${productId}/images`, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Authorization': `Bearer ${token}` },
    body: file,
  });
}

export function createOrder(token, items) {
  return request('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Authorization': `Bearer ${token}` },
    body: JSON.stringify({ items, submit: true }),
  });
}

export function fetchOrders(token) {
  return request('/orders', { headers: { 'X-Authorization': `Bearer ${token}` } });
}

export function fetchAccount(token) {
  return request('/account', { headers: { 'X-Authorization': `Bearer ${token}` } });
}

export function updateAccount(token, profile) {
  return request('/account', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Authorization': `Bearer ${token}` },
    body: JSON.stringify(profile),
  });
}

export function fetchCustomers(token) {
  return request('/account/customers', { headers: { 'X-Authorization': `Bearer ${token}` } });
}

export function assignSalesperson(token, customerId) {
  return request(`/account/customers/${customerId}/salesperson`, {
    method: 'PUT',
    headers: { 'X-Authorization': `Bearer ${token}` },
  });
}

export function removeCustomer(token, customerId) {
  return request(`/account/customers/${customerId}`, {
    method: 'DELETE',
    headers: { 'X-Authorization': `Bearer ${token}` },
  });
}

export function fetchAdminCustomers(token) {
  return request('/manage/customers', { headers: { 'X-Authorization': `Bearer ${token}` } });
}

export function adminAssignSalesperson(token, customerId, salespersonId) {
  return request(`/manage/customers/${customerId}/salesperson`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Authorization': `Bearer ${token}` },
    body: JSON.stringify({ salespersonId }),
  });
}

export function adminCreateUser(token, userData) {
  return request('/manage/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Authorization': `Bearer ${token}` },
    body: JSON.stringify(userData),
  });
}

export function fetchNotifications(token) {
  return request('/manage/notifications', { headers: { 'X-Authorization': `Bearer ${token}` } });
}

export function createNotification(token, notification) {
  return request('/manage/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Authorization': `Bearer ${token}` },
    body: JSON.stringify(notification),
  });
}

export function toggleNotification(token, id) {
  return request(`/manage/notifications/${id}`, {
    method: 'PUT',
    headers: { 'X-Authorization': `Bearer ${token}` },
  });
}
