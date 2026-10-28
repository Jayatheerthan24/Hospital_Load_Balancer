/**
 * Central API Client for Hospital Predictive Load Balancing & Capacity Optimization API
 */

const API_BASE = 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errBody.detail || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Dashboard & KPIs
  getDashboardSummary: () => request('/api/dashboard'),
  getAnalyticsCharts: () => request('/api/analytics'),
  getLiveInsights: () => request('/api/analytics/insights'),

  // Patients & Triage
  getPatients: (status) => request(status ? `/api/patients?status=${status}` : '/api/patients'),
  getPatient: (id) => request(`/api/patients/${id}`),
  trackPatient: (query) => request(`/api/patients/track/${query}`),
  registerPatient: (data) => request('/api/patients', { method: 'POST', body: JSON.stringify(data) }),

  // Queue & Consultations
  getFullQueue: () => request('/api/queue'),
  getActiveQueue: () => request('/api/queue/status'),
  getDoctorQueue: (doctorId) => request(`/api/queue/doctor/${doctorId}`),
  rebalanceQueue: () => request('/api/queue/rebalance', { method: 'POST' }),
  startConsultation: (doctorId, queueId) => request('/api/consultations/start', { method: 'POST', body: JSON.stringify({ doctor_id: doctorId, queue_id: queueId }) }),
  completeConsultation: (doctorId, token, outcome) => request('/api/consultations/complete', { method: 'POST', body: JSON.stringify({ doctor_id: doctorId, token, outcome }) }),
  getConsultations: () => request('/api/consultations'),

  // Doctors & Departments
  getDoctors: (deptId) => request(deptId ? `/api/doctors?department_id=${deptId}` : '/api/doctors'),
  getDoctor: (id) => request(`/api/doctors/${id}`),
  setDoctorStatus: (id, status) => request(`/api/doctors/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  getDepartments: () => request('/api/departments'),

  // ML Predictions & Metrics
  predictPriority: (data) => request('/api/predict/priority', { method: 'POST', body: JSON.stringify(data) }),
  predictWaitTime: (data) => request('/api/predict/wait-time', { method: 'POST', body: JSON.stringify(data) }),
  predictArrivals: (data) => request('/api/predict/arrivals', { method: 'POST', body: JSON.stringify(data) }),
  getMLMetrics: () => request('/api/predict/metrics'),

  // Predictive Operations & Bottlenecks
  predictDuration: (data) => request('/api/predictive/duration', { method: 'POST', body: JSON.stringify(data) }),
  getDemandForecast: (hour, dayOfWeek) => request(`/api/predictive/demand-forecast?hour=${hour || 14}&day_of_week=${dayOfWeek || 2}`),
  calculateAbandonmentRisk: (data) => request('/api/predictive/abandonment-risk', { method: 'POST', body: JSON.stringify(data) }),
  getResourceBottlenecks: () => request('/api/predictive/resources'),
  getPredictiveBottlenecks: () => request('/api/predictive/bottlenecks'),
  getDownstreamPropagation: () => request('/api/predictive/downstream-propagation'),
  getCapacityProjections: () => request('/api/predictive/capacity-projections'),
  getWorkloadSummary: () => request('/api/predictive/workload-summary'),

  // What-If Simulation & Optimization
  getWhatIfScenarios: () => request('/api/optimization/what-if'),
  getOptimizationRecommendations: () => request('/api/optimization/recommendations'),
  applyOptimization: (recId) => request(`/api/optimization/apply/${recId}`, { method: 'POST' }),
  getContinuousLearningFeedback: () => request('/api/optimization/feedback'),
  submitFeedback: (data) => request('/api/optimization/feedback', { method: 'POST', body: JSON.stringify(data) }),

  // Simulation
  generateBatch: (count) => request('/api/simulation/batch', { method: 'POST', body: JSON.stringify({ count }) }),
  simulatePeakHour: () => request('/api/simulation/peak-hour', { method: 'POST' }),
  simulateEmergencySurge: () => request('/api/simulation/surge', { method: 'POST' }),
  resetSimulation: () => request('/api/simulation/reset', { method: 'POST' }),

  // Auth & RBAC
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getDemoUsers: () => request('/api/auth/demo-users')
};
