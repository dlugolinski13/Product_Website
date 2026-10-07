<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchAccount, fetchCustomers, assignSalesperson, removeCustomer } from '../api';
import { token, logout } from '../auth';

const router = useRouter();
const user = ref(null);
const loading = ref(true);
const error = ref(null);

const customers = ref([]);
const availableCustomers = ref([]);
const selectedCustomerId = ref('');
const customersLoading = ref(false);
const customersError = ref(null);
const adding = ref(false);
const removing = ref(null);

onMounted(async () => {
  try {
    user.value = await fetchAccount(token.value);

    if (user.value.role === 'salesperson') {
      customersLoading.value = true;
      try {
        const data = await fetchCustomers(token.value);
        customers.value = data.customers;
        availableCustomers.value = data.availableCustomers;
      } catch (err) {
        customersError.value = err.message;
      } finally {
        customersLoading.value = false;
      }
    }
  } catch (err) {
    if (err.status === 401) {
      logout();
      router.push({ path: '/login', query: { redirect: '/account' } });
    } else {
      error.value = err.message;
    }
  } finally {
    loading.value = false;
  }
});

async function addCustomerToList() {
  if (!selectedCustomerId.value) return;
  adding.value = true;
  customersError.value = null;
  try {
    await assignSalesperson(token.value, selectedCustomerId.value);
    const customer = availableCustomers.value.find(c => c.id === selectedCustomerId.value);
    if (customer) {
      customers.value = [...customers.value, customer].sort((a, b) =>
        (a.fullName || a.email).localeCompare(b.fullName || b.email)
      );
      availableCustomers.value = availableCustomers.value.filter(c => c.id !== selectedCustomerId.value);
    }
    selectedCustomerId.value = '';
  } catch (err) {
    customersError.value = err.message;
  } finally {
    adding.value = false;
  }
}

async function removeCustomerFromList(customerId) {
  removing.value = customerId;
  customersError.value = null;
  try {
    await removeCustomer(token.value, customerId);
    const customer = customers.value.find(c => c.id === customerId);
    customers.value = customers.value.filter(c => c.id !== customerId);
    if (customer) {
      availableCustomers.value = [...availableCustomers.value, customer].sort((a, b) =>
        (a.fullName || a.email).localeCompare(b.fullName || b.email)
      );
    }
  } catch (err) {
    customersError.value = err.message;
  } finally {
    removing.value = null;
  }
}
</script>

<template>
  <section>
    <h1>My Account</h1>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <template v-else-if="user">
      <div class="account-profile account-section">
        <h2 class="section-heading">Profile</h2>
        <p class="account-email">{{ user.email }} <span class="account-role">({{ user.role }})</span></p>
        <p class="account-name">{{ user.fullName || 'No name on file' }}</p>
        <p v-if="user.addressLine1" class="account-address">
          {{ user.addressLine1 }}<template v-if="user.addressLine2">, {{ user.addressLine2 }}</template><br />
          {{ [user.city, user.state, user.postalCode].filter(Boolean).join(', ') }}
          <template v-if="user.country"> {{ user.country }}</template>
        </p>
        <ul class="account-links">
          <li><RouterLink to="/account/edit">Edit profile</RouterLink></li>
          <li><RouterLink to="/orders">Order history</RouterLink></li>
        </ul>
      </div>

      <div v-if="user.role === 'customer'" class="account-salesperson account-section">
        <h2 class="section-heading">Your Salesperson(s)</h2>
        <p v-if="!user.salespersons || user.salespersons.length === 0">No salesperson assigned.</p>
        <ul v-else class="salespersons-list">
          <li v-for="sp in user.salespersons" :key="sp.id">
            {{ sp.fullName || sp.email }} ({{ sp.email }})
          </li>
        </ul>
      </div>

      <div v-if="user.role === 'salesperson'" class="account-customers account-section">
        <h2 class="section-heading">My Customers</h2>
        <p v-if="customersLoading">Loading…</p>
        <p v-else-if="customersError" role="alert">{{ customersError }}</p>
        <template v-else>
          <div class="add-customer-row">
            <select v-model="selectedCustomerId" class="customer-add-select">
              <option value="">— Add a customer —</option>
              <option v-for="c in availableCustomers" :key="c.id" :value="c.id">
                {{ c.fullName || c.email }} ({{ c.email }})
              </option>
            </select>
            <button :disabled="!selectedCustomerId || adding" @click="addCustomerToList" class="add-btn">
              Add
            </button>
          </div>
          <p v-if="customers.length === 0">No customers assigned yet.</p>
          <table v-else class="customers-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="customer in customers" :key="customer.id" class="customer-row">
                <td>
                  <span>{{ customer.fullName || customer.email }}</span>
                  <span class="customer-email"> ({{ customer.email }})</span>
                </td>
                <td>
                  <button
                    :disabled="removing === customer.id"
                    @click="removeCustomerFromList(customer.id)"
                    class="remove-btn"
                  >Remove</button>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </template>
  </section>
</template>

<style scoped>
.account-section {
  margin-bottom: 2rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.section-heading {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.account-email {
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 0.25rem;
}

.account-role {
  font-weight: 400;
  color: #6b7280;
}

.account-name {
  color: #374151;
  margin: 0 0 0.5rem;
}

.account-address {
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 0.75rem;
}

.account-links {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  display: flex;
  gap: 1rem;
}

.account-links a {
  font-size: 0.9rem;
  text-decoration: none;
  color: #2563eb;
}

.account-links a:hover {
  text-decoration: underline;
}

.salespersons-list {
  margin: 0;
  padding-left: 1.25rem;
  color: #374151;
  font-size: 0.9rem;
}

.add-customer-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}

.customer-add-select {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.add-btn {
  padding: 0.25rem 0.75rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.customers-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.customers-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  background: #f3f4f6;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
}

.customer-row td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

.customer-email {
  color: #6b7280;
  font-size: 0.85rem;
}

.remove-btn {
  padding: 0.2rem 0.6rem;
  background: #fff;
  color: #dc2626;
  border: 1px solid #dc2626;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
