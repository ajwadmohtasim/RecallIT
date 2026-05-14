import api from './client';

export const registerUser = async (payload) => {
  const { data } = await api.post('/auth/register', payload);
  return data;
};

export const loginUser = async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const getUserSettings = async () => {
  const { data } = await api.get('/auth/settings');
  return data;
};

export const updateUserSettings = async (payload) => {
  const { data } = await api.patch('/auth/settings', payload);
  return data;
};

export const logoutUser = async () => {
  const { data } = await api.post('/auth/logout');
  return data;
};

export const listDecks = async () => {
  const { data } = await api.get('/decks');
  return data;
};

export const createDeck = async (payload) => {
  const { data } = await api.post('/decks', payload);
  return data;
};

export const createCard = async (payload) => {
  const { data } = await api.post('/cards', payload);
  return data;
};

export const listCardsByDeck = async (deckId) => {
  const { data } = await api.get('/cards', { params: { deckId } });
  return data;
};

export const updateCard = async (cardId, payload) => {
  const { data } = await api.put(`/cards/${cardId}`, payload);
  return data;
};

export const deleteCard = async (cardId) => {
  const { data } = await api.delete(`/cards/${cardId}`);
  return data;
};

export const nextCard = async (deckId, options = {}) => {
  const { data } = await api.get(`/study/${deckId}/next`, { params: options });
  return data;
};

export const revealCard = async (cardId) => {
  const { data } = await api.get(`/study/card/${cardId}/reveal`);
  return data;
};

export const submitReview = async (deckId, cardId, rating, context = {}) => {
  const { data } = await api.post(`/study/${deckId}/review`, {
    cardId,
    rating,
    ...context,
  });
  return data;
};

export const getMetrics = async () => {
  const { data } = await api.get('/metrics');
  return data;
};