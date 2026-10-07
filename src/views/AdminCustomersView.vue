<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchAdminCustomers, adminAssignSalesperson } from '../api';
import { token, logout } from '../auth';

const router = useRouter();
const loading = ref(true);
const error = ref(null);
const customers = ref([]);
const salespeople = ref([]);
const saving = ref({});
const saveError = ref({});

onMounted(async () => {
  try {
    const data = await fetchAdminCustomers(token.value);
    customers.value = data.customers.map(c => ({ ...c, pendingSalespersonId: c.salespersonId || '' }));
    salespeople.value = data.salespeople;
  } catch (err) {
    if (err.status === 401) {
      logout();
      router.push({ path: '/login', query: { redirect: '/admin/customers' } });
    } else {
      error.value = err.message;
    }
  } finally {
    loading.value = false;
  }
});

async function save(customer) {
  saving.value = { ...saving.value, [customer.id]: true };
  saveError.value = { ...saveError.value, [customer.id]: null };
  try {
    const salespersonId = customer.pendingSalespersonId || null;
    await adminAssignSalesperson(token.value, customer.id, salespersonId);
    customer.salespersonId = salespersonId;
  } catch (err) {
    saveError.value = { ...saveError.value, [customer.id]: err.message };
  } finally {
    saving.value = { ...saving.value, [customer.id]: false };
  }
}
</script>

<template>
  <section>
    <h1>Assign Customers</h1>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <template v-else>
      <p v-if="customers.length === 0">No customers found.</p>
      <table v-else class="admin-customers-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Salesperson</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in customers" :key="customer.id" class="admin-customer-row">
            <td>
              <span>{{ customer.fullName || customer.email }}</span>
              <span class="admin-customer-email"> ({{ customer.email }})</span>
            </td>
            <td>
              <select v-model="customer.pendingSalespersonId" class="salesperson-select">
                <option value="">— None —</option>
                <option v-for="sp in salespeople" :key="sp.id" :value="sp.id">
                  {{ sp.fullName || sp.email }} ({{ sp.email }})
                </option>
              </select>
            </td>
            <td>
              <button
                :disabled="saving[customer.id]"
                @click="save(customer)"
                class="save-btn"
              >Save</button>
              <span
                v-if="saveError[customer.id]"
                class="save-error"
                role="alert"
              >{{ saveError[customer.id] }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>

<style scoped>
.admin-customers-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.admin-customers-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  background: #f3f4f6;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
}

.admin-customer-row td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

.admin-customer-email {
  color: #6b7280;
  font-size: 0.85rem;
}

.salesperson-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  min-width: 200px;
}

.save-btn {
  padding: 0.2rem 0.75rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-error {
  color: #dc2626;
  font-size: 0.8rem;
  margin-left: 0.5rem;
}
</style>
