import axios from 'axios';

async function main() {
  try {
    const loginRes = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'viewer@cesia.com',
      password: 'password123'
    });
    const cookies = loginRes.headers['set-cookie'];
    if (!cookies) throw new Error('No cookie received');
    let token = '';
    for (const c of cookies) {
      if (c.startsWith('access_token=')) token = c.split(';')[0].split('=')[1];
    }
    
    console.log('Got token, attempting get responses...');
    
    const response = await axios.get('http://localhost:3002/api/survey/admin/responses', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Responses success! Data:', response.data);
  } catch (error: any) {
    if (error.response) {
      console.error('Error Status:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

main().catch(console.error);
