// testAllApis.js
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const API_BASE = 'https://project2-3-3jc8.onrender.com/api';

// ---------------- GET ROUTES ----------------

async function testGet(route) {
    try {
        const res = await fetch(`${API_BASE}/${route}`);
        const data = await res.json();
        console.log(`✅ ${route} GET success:`, data);
    } catch (err) {
        console.error(`❌ ${route} GET failed:`, err);
    }
}

const getRoutes = [
    'courses',
    'users',
    'faqs',
    'partners',
    'stories',
    'site_stats',
    'admins',
    'registrations'
];

for (const route of getRoutes) {
    await testGet(route);
}

// ---------------- POST ROUTES ----------------

// Registrations POST
async function testRegistrationsPost() {
    try {
        const cvPath = path.join(process.cwd(), 'files/sample.pdf');
        const form = new FormData();
        form.append('fullName', 'John Test');
        form.append('email', `john${Date.now()}@example.com`);
        form.append('phone', '1234567890');
        form.append('role', 'Student');
        form.append('cv', fs.createReadStream(cvPath));

        const res = await fetch(`${API_BASE}/registrations`, {
            method: 'POST',
            body: form
        });
        const data = await res.json();
        console.log('✅ registrations POST success:', data);
    } catch (err) {
        console.error('❌ registrations POST failed:', err);
    }
}

// Partners POST
async function testPartnersPost() {
    try {
        const logoPath = path.join(process.cwd(), 'files/partner_logo.png');
        const form = new FormData();
        form.append('name', `Test Partner ${Date.now()}`);
        form.append('website', 'https://example.com');
        form.append('logo', fs.createReadStream(logoPath));

        const res = await fetch(`${API_BASE}/partners`, {
            method: 'POST',
            body: form
        });
        const data = await res.json();
        console.log('✅ partners POST success:', data);
    } catch (err) {
        console.error('❌ partners POST failed:', err);
    }
}

// Admins POST
async function testAdminsPost() {
    try {
        const res = await fetch(`${API_BASE}/admins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: `admin${Date.now()}@example.com`,
                password: 'password123'
            })
        });
        const data = await res.json();
        console.log('✅ admins POST success:', data);
    } catch (err) {
        console.error('❌ admins POST failed:', err);
    }
}

// Run POST tests
await testRegistrationsPost();
await testPartnersPost();
await testAdminsPost();
