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
    const data = await fetchAdminCustomers(token.value);
    customers.value = data.customers.map(c => ({ ...c, pendingSalespersonId: c.salespersonId || '' }));
    salespeople.value = data.salespeople;
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
      <div v-else class="assign-columns">
        <div class="assign-panel">
          <h2>Salespersons</h2>
          <ul class="sp-list">
            <li v-for="sp in salespeople" :key="sp.id" class="sp-item">
              <span>{{ sp.fullName || sp.email }}</span>
              <span v-if="sp.fullName" class="sp-email"> ({{ sp.email }})</span>
            </li>
          </ul>
        </div>
        <div class="assign-panel">
          <h2>Customers</h2>
          <div v-for="customer in customers" :key="customer.id" class="admin-customer-row">
            <div class="customer-info">
              <span>{{ customer.fullName || customer.email }}</span>
              <span class="admin-customer-email"> ({{ customer.email }})</span>
            </div>
            <div class="customer-assign">
              <select v-model="customer.pendingSalespersonId" class="salesperson-select">
                <option value="">— None —</option>
                <option v-for="sp in salespeople" :key="sp.id" :value="sp.id">
                  {{ sp.fullName || sp.email }} ({{ sp.email }})
                </option>
              </select>
              <button
                :disabled="saving[customer.id]"
                @click="save(customer)"
                class="cta save-btn"
              >Save</button>
              <span
                v-if="saveError[customer.id]"
                class="save-error"
                role="alert"
              >{{ saveError[customer.id] }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.assign-columns {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.assign-panel {
  flex: 1;
  overflow-y: auto;
  max-height: 70vh;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
}

.assign-panel h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.sp-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sp-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.9rem;
}

.sp-email {
  color: #6b7280;
  font-size: 0.85rem;
}

.admin-customer-row {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.9rem;
}

.customer-info {
  margin-bottom: 0.25rem;
}

.customer-assign {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.admin-customer-email {
  color: #6b7280;
  font-size: 0.85rem;
}

.salesperson-select {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  min-width: 200px;
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
