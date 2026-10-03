import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ProfileEditView from './ProfileEditView.vue';
import { token } from '../auth';
import { fetchProfile, updateProfile } from '../api';

vi.mock('../api', () => ({ fetchProfile: vi.fn(), updateProfile: vi.fn() }));

function stubs() {
  return { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } };
}

describe('ProfileEditView', () => {
  beforeEach(() => {
    fetchProfile.mockReset();
    updateProfile.mockReset();
    token.value = 'tok';
  });

  it('loads the current full name', async () => {
    fetchProfile.mockResolvedValue({ fullName: 'Alice' });
    const wrapper = mount(ProfileEditView, stubs());
    await flushPromises();
    expect(wrapper.find('input[type="text"]').element.value).toBe('Alice');
  });

  it('falls back to an empty name when the profile has none', async () => {
    fetchProfile.mockResolvedValue({ fullName: null });
    const wrapper = mount(ProfileEditView, stubs());
    await flushPromises();
    expect(wrapper.find('input[type="text"]').element.value).toBe('');
  });

  it('submits the new name without a password when none is entered', async () => {
    fetchProfile.mockResolvedValue({ fullName: 'Alice' });
    updateProfile.mockResolvedValue({ updated: true });
    const wrapper = mount(ProfileEditView, stubs());
    await flushPromises();

    await wrapper.find('input[type="text"]').setValue('Alice B');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateProfile).toHaveBeenCalledWith('tok', { fullName: 'Alice B' });
    expect(wrapper.text()).toContain('Profile updated.');
  });

  it('includes the password when one is entered, then clears it', async () => {
    fetchProfile.mockResolvedValue({ fullName: 'Alice' });
    updateProfile.mockResolvedValue({ updated: true });
    const wrapper = mount(ProfileEditView, stubs());
    await flushPromises();

    await wrapper.find('input[type="password"]').setValue('new-pass');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateProfile).toHaveBeenCalledWith('tok', { fullName: 'Alice', password: 'new-pass' });
    expect(wrapper.find('input[type="password"]').element.value).toBe('');
  });

  it('shows an error when saving fails', async () => {
    fetchProfile.mockResolvedValue({ fullName: 'Alice' });
    updateProfile.mockRejectedValue(new Error('save failed'));
    const wrapper = mount(ProfileEditView, stubs());
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toBe('save failed');
  });

  it('shows an error when loading the profile fails', async () => {
    fetchProfile.mockRejectedValue(new Error('load failed'));
    const wrapper = mount(ProfileEditView, stubs());
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('load failed');
  });
});
