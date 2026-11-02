// One shared state object plus a tiny event bus

const state = {
  user: null,
  projectId: '',
  datasetId: null,
  area: null,
  range: null,
  timeStep: null,
  outputs: [],
  folderName: '',
  tasks: []
};

const listeners = {};

export function getState() {
  return state;
}

// Merge a patch into state and tell everyone who is listening
export function setState(patch) {
  Object.assign(state, patch);
  emit('change', state);
}

export function on(event, handler) {
  if (!listeners[event]) {
    listeners[event] = [];
  }

  listeners[event].push(handler);
}

export function emit(event, data) {
  const handlers = listeners[event] || [];

  handlers.forEach((handler) => handler(data));
}
