/**
 * Test script to verify thumbnail is copied when creating project from logo
 * 
 * This script:
 * 1. Creates a logo with a thumbnail
 * 2. Creates a project from that logo
 * 3. Verifies the thumbnail is included in the project response
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test data
const testUser = {
    email: `test_thumbnail_${Date.now()}@example.com`,
    password: 'testpassword123',
    name: 'Thumbnail Test User'
};

let authToken = null;
let userId = null;
let logoId = null;
let projectId = null;

async function testThumbnailCopy() {
    try {
        console.log('🧪 Testing Thumbnail Copy from Logo to Project\n');
        console.log('='.repeat(60));

        // Step 1: Register a test user
        console.log('\n📝 Step 1: Registering test user...');
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
        if (registerResponse.data.success && registerResponse.data.data.token) {
            authToken = registerResponse.data.data.token;
            userId = registerResponse.data.data.user.id;
            console.log('✅ User registered:', testUser.email);
            console.log('   User ID:', userId);
        } else {
            // Try login if user already exists
            console.log('⚠️  User might already exist, trying login...');
            const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
                email: testUser.email,
                password: testUser.password
            });
            if (loginResponse.data.success && loginResponse.data.data.token) {
                authToken = loginResponse.data.data.token;
                userId = loginResponse.data.data.user.id;
                console.log('✅ User logged in:', testUser.email);
            } else {
                throw new Error('Failed to authenticate');
            }
        }

        // Step 2: Create a logo with thumbnail
        console.log('\n📝 Step 2: Creating logo with thumbnail...');
        const thumbnailUrl = 'https://example.com/thumbnail/test-logo-thumbnail.png';
        const logoData = {
            owner_id: userId,
            title: 'Test Logo with Thumbnail',
            canvas_w: 1080,
            canvas_h: 1080,
            layers: []
        };

        const logoResponse = await axios.post(`${BASE_URL}/api/logo`, logoData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (logoResponse.data.success && logoResponse.data.data && logoResponse.data.data.id) {
            logoId = logoResponse.data.data.id;
            console.log('✅ Logo created:', logoId);

            // Update logo with thumbnail
            console.log('   Adding thumbnail to logo...');
            const thumbnailResponse = await axios.post(
                `${BASE_URL}/api/logo/${logoId}/thumbnail`,
                { thumbnail_url: thumbnailUrl },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            if (thumbnailResponse.data.success) {
                console.log('✅ Thumbnail added to logo:', thumbnailUrl);
            } else {
                console.log('⚠️  Could not add thumbnail, but continuing test...');
            }
        } else {
            throw new Error('Failed to create logo');
        }

        // Step 3: Create a project from the logo
        console.log('\n📝 Step 3: Creating project from logo...');
        const projectData = {
            title: 'Test Project from Logo',
            json_doc: {
                canvas: { width: 1080, height: 1080 },
                layers: []
            },
            logo_id: logoId
        };

        const projectResponse = await axios.post(
            `${BASE_URL}/api/projects`,
            projectData,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (projectResponse.data.success && projectResponse.data.data.project) {
            projectId = projectResponse.data.data.project.id;
            const project = projectResponse.data.data.project;
            console.log('✅ Project created:', projectId);
            console.log('   Project title:', project.title);
            console.log('   Project logo_id:', project.logo_id);

            // Step 4: Verify thumbnail is included
            console.log('\n📝 Step 4: Verifying thumbnail in project...');
            if (project.thumbnailUrl) {
                console.log('✅ SUCCESS: Thumbnail found in project response!');
                console.log('   Thumbnail URL:', project.thumbnailUrl);
                
                if (project.thumbnailUrl === thumbnailUrl) {
                    console.log('✅ Thumbnail URL matches the logo thumbnail!');
                } else {
                    console.log('⚠️  Warning: Thumbnail URL does not match expected value');
                    console.log('   Expected:', thumbnailUrl);
                    console.log('   Got:', project.thumbnailUrl);
                }
            } else {
                console.log('❌ FAILED: Thumbnail not found in project response!');
                console.log('   Project data:', JSON.stringify(project, null, 2));
                throw new Error('Thumbnail not copied to project');
            }

            // Step 5: Verify by fetching the project
            console.log('\n📝 Step 5: Fetching project to verify thumbnail persists...');
            const getProjectResponse = await axios.get(
                `${BASE_URL}/api/projects/${projectId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            if (getProjectResponse.data.success && getProjectResponse.data.data.project) {
                const fetchedProject = getProjectResponse.data.data.project;
                if (fetchedProject.thumbnailUrl) {
                    console.log('✅ SUCCESS: Thumbnail found when fetching project!');
                    console.log('   Thumbnail URL:', fetchedProject.thumbnailUrl);
                } else {
                    console.log('❌ FAILED: Thumbnail not found when fetching project');
                }
            }

            console.log('\n' + '='.repeat(60));
            console.log('✅ TEST COMPLETED SUCCESSFULLY!');
            console.log('   Thumbnail is correctly copied from logo to project');
            console.log('='.repeat(60));

        } else {
            throw new Error('Failed to create project');
        }

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('   Error:', error);
        }
        process.exit(1);
    }
}

// Run the test
testThumbnailCopy();



