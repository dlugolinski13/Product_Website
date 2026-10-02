<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchAccount, updateAccount, fetchCustomers, assignSalesperson } from '../api';
import { token, logout } from '../auth';

const router = useRouter();
const user = ref(null);
const loading = ref(true);
const error = ref(null);

const fullName = ref('');
const addressLine1 = ref('');
const addressLine2 = ref('');
const city = ref('');
const state = ref('');
const postalCode = ref('');
const country = ref('');
const saving = ref(false);
const saveError = ref(null);
const saveSuccess = ref(false);

const customers = ref([]);
const salespersons = ref([]);
const customersLoading = ref(false);
const customersError = ref(null);
const assigning = ref(null);

onMounted(async () => {
  try {
    user.value = await fetchAccount(token.value);
    fullName.value = user.value.fullName || '';
    addressLine1.value = user.value.addressLine1 || '';
    addressLine2.value = user.value.addressLine2 || '';
    city.value = user.value.city || '';
    state.value = user.value.state || '';
    postalCode.value = user.value.postalCode || '';
    country.value = user.value.country || '';

    if (user.value.role === 'salesperson') {
      customersLoading.value = true;
      try {
        const data = await fetchCustomers(token.value);
        customers.value = data.customers;
        salespersons.value = data.salespersons;
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

async function saveProfile() {
  saveError.value = null;
  saveSuccess.value = false;
  saving.value = true;
  try {
    await updateAccount(token.value, {
      fullName: fullName.value,
      addressLine1: addressLine1.value,
      addressLine2: addressLine2.value,
      city: city.value,
      state: state.value,
      postalCode: postalCode.value,
      country: country.value,
    });
    saveSuccess.value = true;
  } catch (err) {
    saveError.value = err.message;
  } finally {
    saving.value = false;
  }
}

async function setCustomerSalesperson(customerId, salespersonId) {
  assigning.value = customerId;
  customersError.value = null;
  try {
    await assignSalesperson(token.value, customerId, salespersonId || null);
    const customer = customers.value.find(c => c.id === customerId);
    if (customer) {
      const sp = salespersons.value.find(s => s.id === salespersonId);
      customer.salesperson = sp ? { id: sp.id, fullName: sp.fullName, email: sp.email } : null;
    }
  } catch (err) {
    customersError.value = err.message;
  } finally {
    assigning.value = null;
  }
}
</script>

<template>
  <section>
    <h1>My Account</h1>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <template v-else-if="user">
      <div class="account-profile">
        <h2>Profile</h2>
        <p class="account-email">{{ user.email }}</p>
        <form @submit.prevent="saveProfile" class="profile-form">
          <label>
            Full name
            <input v-model="fullName" type="text" />
          </label>
          <label>
            Address line 1
            <input v-model="addressLine1" type="text" />
          </label>
          <label>
            Address line 2
            <input v-model="addressLine2" type="text" />
          </label>
          <label>
            City
            <input v-model="city" type="text" />
          </label>
          <label>
            State / Province
            <input v-model="state" type="text" />
          </label>
          <label>
            Postal code
            <input v-model="postalCode" type="text" />
          </label>
          <label>
            Country
            <input v-model="country" type="text" />
          </label>
          <button type="submit" :disabled="saving">Save</button>
          <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>
          <p v-if="saveSuccess" class="save-success">Saved.</p>
        </form>
      </div>

      <div v-if="user.role === 'customer'" class="account-salesperson">
        <h2>Your salesperson</h2>
        <p v-if="user.salesperson">
          {{ user.salesperson.fullName || user.salesperson.email }}
          ({{ user.salesperson.email }})
        </p>
        <p v-else>No salesperson assigned.</p>
      </div>

      <div v-if="user.role === 'salesperson'" class="account-customers">
        <h2>Customers</h2>
        <p v-if="customersLoading">Loading…</p>
        <p v-else-if="customersError" role="alert">{{ customersError }}</p>
        <template v-else>
          <p v-if="customers.length === 0">No customers found.</p>
          <table v-else class="customers-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Assigned salesperson</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="customer in customers" :key="customer.id" class="customer-row">
                <td>
                  <span>{{ customer.fullName || customer.email }}</span>
                  <span class="customer-email"> ({{ customer.email }})</span>
                </td>
                <td>
                  <select
                    :value="customer.salesperson ? customer.salesperson.id : ''"
                    :disabled="assigning === customer.id"
                    @change="setCustomerSalesperson(customer.id, $event.target.value || null)"
                    class="salesperson-select"
                  >
                    <option value="">— Unassigned —</option>
                    <option
                      v-for="sp in salespersons"
                      :key="sp.id"
                      :value="sp.id"
                    >{{ sp.fullName || sp.email }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </template>
  </section>
</template>
