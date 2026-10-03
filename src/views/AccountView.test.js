import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AccountView from './AccountView.vue';
import { token } from '../auth';
import { fetchProfile } from '../api';

vi.mock('../api', () => ({ fetchProfile: vi.fn() }));

function stubs() {
  return { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } };
}

describe('AccountView', () => {
  beforeEach(() => {
    fetchProfile.mockReset();
    token.value = 'tok';
  });

  it('shows the profile and links to edit profile and order history', async () => {
    fetchProfile.mockResolvedValue({ email: 'a@example.com', fullName: 'Alice', role: 'customer' });
    const wrapper = mount(AccountView, stubs());
    await flushPromises();

    expect(fetchProfile).toHaveBeenCalledWith('tok');
    expect(wrapper.text()).toContain('a@example.com');
    expect(wrapper.text()).toContain('Alice');
    expect(wrapper.text()).toContain('customer');
    expect(wrapper.text()).toContain('Edit profile');
    expect(wrapper.text()).toContain('Order history');
  });

  it('shows a placeholder when there is no name on file', async () => {
    fetchProfile.mockResolvedValue({ email: 'a@example.com', fullName: null, role: 'customer' });
    const wrapper = mount(AccountView, stubs());
    await flushPromises();
    expect(wrapper.text()).toContain('—');
  });

  it('shows an error when the profile fails to load', async () => {
    fetchProfile.mockRejectedValue(new Error('profile down'));
    const wrapper = mount(AccountView, stubs());
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('profile down');
  });
});
