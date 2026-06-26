import axios from "axios";

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";
const STORAGE_KEY = "vitalitysyncUser";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

function unwrapResponse(response) {
  if (!response.data.success) {
    throw new Error(response.data.error?.message || "Request failed.");
  }

  return response.data.data;
}

function getErrorMessage(error) {
  if (error.response) {
    return error.response.data?.error?.message || "Request failed.";
  }

  if (error.request) {
    return "Network Error";
  }

  return error.message || "Something went wrong. Please try again.";
}

function buildApiError(error) {
  const apiError = new Error(getErrorMessage(error));
  apiError.code = error.response?.data?.error?.code || null;
  apiError.details = error.response?.data?.error?.details || null;
  apiError.status = error.response?.status || null;
  return apiError;
}

async function request(config) {
  try {
    const storedUser = getStoredUser();
    const response = await apiClient({
      ...config,
      headers: {
        ...(config.headers || {}),
        ...(storedUser?.userId ? { "x-user-id": storedUser.userId } : {}),
        ...(storedUser?.userRole ? { "x-user-role": storedUser.userRole } : {})
      }
    });
    return unwrapResponse(response);
  } catch (error) {
    throw buildApiError(error);
  }
}

export function getStoredUser() {
  const storedUser = localStorage.getItem(STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(storedUser);
    const hasValidId = Number.isInteger(Number(user?.userId)) && Number(user.userId) > 0;
    const hasSupportedRole = ["admin", "trainee"].includes(user?.userRole);

    if (!hasValidId || !hasSupportedRole) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return user;
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveStoredUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEY);
}

export function login(emailOrCredentials, password) {
  const credentials =
    typeof emailOrCredentials === "object"
      ? emailOrCredentials
      : { email: emailOrCredentials, password };

  return request({
    method: "POST",
    url: "/api/auth/login",
    data: credentials
  });
}

export function register(payload) {
  return request({
    method: "POST",
    url: "/api/auth/register",
    data: payload
  });
}

export function logout() {
  return request({
    method: "POST",
    url: "/api/auth/logout"
  });
}

export function getCurrentUser() {
  return request({
    method: "GET",
    url: "/api/users/me"
  });
}

export function getProducts() {
  return request({
    method: "GET",
    url: "/api/products"
  });
}

export function getNutritionProfiles() {
  return request({
    method: "GET",
    url: "/nutrition-profiles"
  });
}

export function getNutritionProfile() {
  return request({
    method: "GET",
    url: "/nutrition/profile"
  });
}

export function updateNutritionProfile(payload) {
  return request({
    method: "PUT",
    url: "/nutrition/profile",
    data: payload
  });
}

export function getNutritionTargetSuggestion(goal, useAi = false, nutritionContext = {}) {
  return request({
    method: "GET",
    url: "/nutrition/target-suggestion",
    params: {
      ...(goal ? { goal } : {}),
      ...(useAi ? { ai: "true" } : {}),
      dietaryPreferences: (nutritionContext.dietaryPreferences || []).join(","),
      allergies: (nutritionContext.allergies || []).join(","),
      medicalRestrictions: (nutritionContext.medicalRestrictions || []).join(","),
      additionalContext: nutritionContext.additionalContext || ""
    }
  });
}

export function searchNutritionFoods(query, language = "en") {
  return request({
    method: "GET",
    url: "/nutrition/foods/search",
    params: { q: query, lang: language }
  });
}

export function getRecentNutritionFoods(limit = 6) {
  return request({
    method: "GET",
    url: "/nutrition/recent-foods",
    params: { limit }
  });
}

export function getNutritionFavorites() {
  return request({
    method: "GET",
    url: "/nutrition/favorites"
  });
}

export function addNutritionFavorite(barcode) {
  return request({
    method: "POST",
    url: "/nutrition/favorites",
    data: { barcode }
  });
}

export function deleteNutritionFavorite(barcode) {
  return request({
    method: "DELETE",
    url: `/nutrition/favorites/${encodeURIComponent(barcode)}`
  });
}

export function estimateNutritionMeal(payload, imageFile = null) {
  if (imageFile) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== null && value !== undefined) formData.append(key, value);
    });
    formData.append("image", imageFile);
      return request({
        method: "POST",
        url: "/nutrition/estimate-meal",
        data: formData
      });
  }

  return request({
    method: "POST",
    url: "/nutrition/estimate-meal",
    data: payload
  });
}

export function getNutritionFood(barcode) {
  return request({
    method: "GET",
    url: `/nutrition/foods/${barcode}`
  });
}

export function evaluateNutritionFood(payload) {
  return request({
    method: "POST",
    url: "/nutrition/evaluate",
    data: payload
  });
}

export function getNutritionToday(date) {
  return request({
    method: "GET",
    url: "/nutrition/today",
    params: { date }
  });
}

export function addNutritionLogItem(payload) {
  return request({
    method: "POST",
    url: "/nutrition/log-items",
    data: payload
  });
}

export function deleteNutritionLogItem(itemId) {
  return request({
    method: "DELETE",
    url: `/nutrition/log-items/${itemId}`
  });
}

export function getExercises() {
  return request({
    method: "GET",
    url: "/exercises"
  });
}

export function getWorkoutPlans() {
  return request({
    method: "GET",
    url: "/workout-plans"
  });
}

export function getWorkoutSessions(userId) {
  return request({
    method: "GET",
    url: "/workout-sessions",
    params: { userId }
  });
}

export function getActiveWorkoutSession(userId) {
  return request({
    method: "GET",
    url: "/workout-sessions/active",
    params: { userId }
  });
}

export function getTraineeProfile(userId) {
  return request({
    method: "GET",
    url: `/trainee-profiles/${userId}`
  });
}

export function createTraineeProfile(payload) {
  return request({
    method: "POST",
    url: "/trainee-profiles",
    data: payload
  });
}

export function updateTraineeProfile(userId, payload) {
  return request({
    method: "PUT",
    url: `/trainee-profiles/${userId}`,
    data: payload
  });
}

export function suggestWorkoutPlan(userId) {
  return request({
    method: "POST",
    url: "/workout-plans/suggest",
    data: { userId }
  });
}

export function getProductEvaluations() {
  return request({
    method: "GET",
    url: "/product-evaluations"
  });
}

export function getAISpecialists() {
  return request({
    method: "GET",
    url: "/ai-specialists"
  });
}

export function generateProductEvaluation(payload) {
  return request({
    method: "POST",
    url: "/ai/product-evaluations/generate",
    data: payload
  });
}

export function getAdminLiveSessions() {
  return request({
    method: "GET",
    url: "/admin/live-sessions"
  });
}

export function getAdminWorkoutHistory() {
  return request({
    method: "GET",
    url: "/admin/workout-history"
  });
}

export function getAdminTrainees() {
  return request({
    method: "GET",
    url: "/admin/trainees"
  });
}

export function getSettings() {
  return request({
    method: "GET",
    url: "/api/settings"
  });
}

export function updateSettings(settings) {
  return request({
    method: "PUT",
    url: "/api/settings",
    data: settings
  });
}

export function assignAiCoach(userId, aiSpecialistId) {
  return request({
    method: "PUT",
    url: `/admin/trainees/${userId}/ai-specialist`,
    data: { aiSpecialistId }
  });
}

export function getAdminAiCoaches() {
  return request({
    method: "GET",
    url: "/admin/ai-coaches"
  });
}

export function createAdminAiCoach(payload) {
  return request({
    method: "POST",
    url: "/admin/ai-coaches",
    data: payload
  });
}

export function updateAdminAiCoach(specialistId, payload) {
  return request({
    method: "PUT",
    url: `/admin/ai-coaches/${specialistId}`,
    data: payload
  });
}

export function deleteAdminAiCoach(specialistId) {
  return request({
    method: "DELETE",
    url: `/admin/ai-coaches/${specialistId}`
  });
}

export function getAdminTraineeDetails(userId) {
  return request({
    method: "GET",
    url: `/admin/trainees/${userId}/details`
  });
}
