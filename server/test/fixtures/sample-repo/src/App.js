import missingModule from './missing-module';

export async function loadUser() {
  return fetch('/users/42');
}
