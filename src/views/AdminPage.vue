<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  fetchCustomers, removeCustomer,
  adminCreateUser,
  fetchNotifications, createNotification, toggleNotification,
} from '../api';
import { token, user, logout } from '../auth';

const router = useRouter();

// Salesperson: customers for separation requests
const myCustomers = ref([]);
const customersLoading = ref(false);
const customersError = ref(null);
const separating = ref(null);

// Admin: create salesperson
const spForm = ref({ fullName: '', email: '', password: '', phone: '' });
const spSaving = ref(false);
const spError = ref(null);
const spSuccess = ref(false);

// Admin: create customer
const custForm = ref({ fullName: '', email: '', password: '', phone: '' });
const custSaving = ref(false);
const custError = ref(null);
const custSuccess = ref(false);

// Admin: notifications
const notifications = ref([]);
const notifLoading = ref(false);
const notifError = ref(null);
const newNotifMessage = ref('');
const notifSaving = ref(false);

onMounted(async () => {
  if (user.value?.role === 'salesperson') {
    customersLoading.value = true;
    try {
      const data = await fetchCustomers(token.value);
      myCustomers.value = data.customers;
    } catch (err) {
      if (err.status === 401) {
        logout();
        router.push({ path: '/login', query: { redirect: '/admin' } });
      } else {
        customersError.value = err.message;
      }
    } finally {
      customersLoading.value = false;
    }
  }

  if (user.value?.role === 'admin') {
    notifLoading.value = true;
    try {
      const data = await fetchNotifications(token.value);
      notifications.value = data.notifications;
    } catch (err) {
      if (err.status === 401) {
        logout();
        router.push({ path: '/login', query: { redirect: '/admin' } });
      } else {
        notifError.value = err.message;
      }
    } finally {
      notifLoading.value = false;
    }
  }
});

async function requestSeparation(customerId) {
  separating.value = customerId;
  customersError.value = null;
  try {
    await removeCustomer(token.value, customerId);
    myCustomers.value = myCustomers.value.filter(c => c.id !== customerId);
  } catch (err) {
    customersError.value = err.message;
  } finally {
    separating.value = null;
  }
}

async function submitCreateSalesperson() {
  spSaving.value = true;
  spError.value = null;
  spSuccess.value = false;
  try {
    await adminCreateUser(token.value, { ...spForm.value, role: 'salesperson' });
    spForm.value = { fullName: '', email: '', password: '', phone: '' };
    spSuccess.value = true;
  } catch (err) {
    spError.value = err.message;
  } finally {
    spSaving.value = false;
  }
}

async function submitCreateCustomer() {
  custSaving.value = true;
  custError.value = null;
  custSuccess.value = false;
  try {
    await adminCreateUser(token.value, { ...custForm.value, role: 'customer' });
    custForm.value = { fullName: '', email: '', password: '', phone: '' };
    custSuccess.value = true;
  } catch (err) {
    custError.value = err.message;
  } finally {
    custSaving.value = false;
  }
}

async function submitCreateNotification() {
  if (!newNotifMessage.value.trim()) return;
  notifSaving.value = true;
  notifError.value = null;
  try {
    const n = await createNotification(token.value, { message: newNotifMessage.value });
    notifications.value = [n, ...notifications.value];
    newNotifMessage.value = '';
  } catch (err) {
    notifError.value = err.message;
  } finally {
    notifSaving.value = false;
  }
}

async function toggleNotif(id) {
  notifError.value = null;
  try {
    await toggleNotification(token.value, id);
    const idx = notifications.value.findIndex(n => n.id === id);
    if (idx >= 0) {
      notifications.value[idx] = { ...notifications.value[idx], isActive: !notifications.value[idx].isActive };
    }
  } catch (err) {
    notifError.value = err.message;
  }
}
</script>

<template>
  <section>
    <h1>Admin</h1>

    <!-- Assign Customers (admin only) -->
    <div v-if="user?.role === 'admin'" class="admin-section">
      <h2 class="section-heading">Assign Customers to Salespeople</h2>
      <RouterLink to="/admin/customers" class="cta assign-link">Go to Assign Customers</RouterLink>
    </div>

    <!-- Create Salesperson (admin only) -->
    <div v-if="user?.role === 'admin'" class="admin-section">
      <h2 class="section-heading">Create Salesperson</h2>
      <form @submit.prevent="submitCreateSalesperson" class="user-form">
        <label for="sp-name">Full Name</label>
        <input id="sp-name" v-model="spForm.fullName" type="text" placeholder="Full name" />
        <label for="sp-email">Email <span class="required">*</span></label>
        <input id="sp-email" v-model="spForm.email" type="email" required placeholder="Email address" />
        <label for="sp-phone">Phone</label>
        <input id="sp-phone" v-model="spForm.phone" type="tel" placeholder="Phone number" />
        <label for="sp-password">Password <span class="required">*</span></label>
        <input id="sp-password" v-model="spForm.password" type="password" required placeholder="Password" />
        <p v-if="spError" role="alert" class="form-error">{{ spError }}</p>
        <p v-if="spSuccess" class="form-success">Salesperson created.</p>
        <button type="submit" :disabled="spSaving" class="cta">
          {{ spSaving ? 'Creating…' : 'Create Salesperson' }}
        </button>
      </form>
    </div>

    <!-- Create Customer (admin only) -->
    <div v-if="user?.role === 'admin'" class="admin-section">
      <h2 class="section-heading">Create Customer</h2>
      <form @submit.prevent="submitCreateCustomer" class="user-form">
        <label for="cust-name">Full Name</label>
        <input id="cust-name" v-model="custForm.fullName" type="text" placeholder="Full name" />
        <label for="cust-email">Email <span class="required">*</span></label>
        <input id="cust-email" v-model="custForm.email" type="email" required placeholder="Email address" />
        <label for="cust-phone">Phone</label>
        <input id="cust-phone" v-model="custForm.phone" type="tel" placeholder="Phone number" />
        <label for="cust-password">Password <span class="required">*</span></label>
        <input id="cust-password" v-model="custForm.password" type="password" required placeholder="Password" />
        <p v-if="custError" role="alert" class="form-error">{{ custError }}</p>
        <p v-if="custSuccess" class="form-success">Customer created.</p>
        <button type="submit" :disabled="custSaving" class="cta">
          {{ custSaving ? 'Creating…' : 'Create Customer' }}
        </button>
      </form>
    </div>

    <!-- Notifications Management (admin only) -->
    <div v-if="user?.role === 'admin'" class="admin-section">
      <h2 class="section-heading">Notifications</h2>
      <p v-if="notifLoading">Loading…</p>
      <template v-else>
        <form @submit.prevent="submitCreateNotification" class="notif-form">
          <input
            v-model="newNotifMessage"
            type="text"
            placeholder="New notification message…"
            class="notif-input"
          />
          <button type="submit" :disabled="notifSaving || !newNotifMessage.trim()" class="cta">
            {{ notifSaving ? 'Adding…' : 'Add' }}
          </button>
        </form>
        <p v-if="notifError" role="alert" class="form-error">{{ notifError }}</p>
        <p v-if="notifications.length === 0">No notifications yet.</p>
        <table v-else class="notif-table">
          <thead>
            <tr>
              <th>Message</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in notifications" :key="n.id" class="notif-row">
              <td>{{ n.message }}</td>
              <td>
                <span :class="n.isActive ? 'notif-active' : 'notif-inactive'">
                  {{ n.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <button @click="toggleNotif(n.id)" class="cta toggle-btn">
                  {{ n.isActive ? 'Deactivate' : 'Activate' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>

    <!-- Request Separation from Customer (salesperson only) -->
    <div v-if="user?.role === 'salesperson'" class="admin-section">
      <h2 class="section-heading">Request Separation from Customer</h2>
      <p v-if="customersLoading">Loading…</p>
      <p v-else-if="customersError" role="alert">{{ customersError }}</p>
      <template v-else>
        <p v-if="myCustomers.length === 0">No assigned customers.</p>
        <table v-else class="sep-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="customer in myCustomers" :key="customer.id" class="sep-row">
              <td>
                <span>{{ customer.fullName || customer.email }}</span>
                <span class="sep-email"> ({{ customer.email }})</span>
              </td>
              <td>
                <button
                  :disabled="separating === customer.id"
                  @click="requestSeparation(customer.id)"
                  class="cta sep-btn"
                >Request Separation</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>
  </section>
</template>

<style scoped>
.admin-section {
  margin-bottom: 2rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.section-heading {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.assign-link {
  display: inline-block;
}

.user-form {
  display: grid;
  gap: 0.5rem;
  max-width: 400px;
}

.user-form label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
  margin-top: 0.25rem;
}

.required {
  color: #dc2626;
}

.form-error {
  color: #dc2626;
  font-size: 0.9rem;
  margin: 0;
}

.form-success {
  color: #16a34a;
  font-size: 0.9rem;
  margin: 0;
}

.notif-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.notif-input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.375rem 0.5rem;
}

.notif-table,
.sep-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.notif-table th,
.sep-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  background: #f3f4f6;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
}

.notif-row td,
.sep-row td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

.notif-active {
  color: #16a34a;
  font-weight: 500;
}

.notif-inactive {
  color: #6b7280;
}

.sep-email {
  color: #6b7280;
  font-size: 0.85rem;
}

.toggle-btn:disabled,
.sep-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
