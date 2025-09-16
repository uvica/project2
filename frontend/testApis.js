// CommonJS require for node-fetch v3+
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'https://project2-3-3jc8.onrender.com/api';

const routes = [
  'courses',
  'users',
  'faqs',
  'partners',
  'stories',
  'site_stats',
  'admins',
  'registrations'
];

(async () => {
  for (const route of routes) {
    try {
      const res = await fetch(`${BASE_URL}/${route}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      console.log(`✅ ${route} route success:`, data);
    } catch (err) {
      console.error(`❌ ${route} route failed:`, err.message);
    }
  }
})();
