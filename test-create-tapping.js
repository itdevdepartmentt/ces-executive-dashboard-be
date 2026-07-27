const axios = require('axios');

async function main() {
  try {
    const res = await axios.post('http://localhost:4000/qa/form-tapping', {
      idTiket: 'TICKET-TEST-123',
      idTapping: 'TAPPING-TEST-123',
      tapper: 'Tester',
      agent: 'Deny Rustanto',
      teamLeader: 'SWAZY NILLA HENDRASSWARI',
      status: 'Sample',
      peak: 1,
      tagging: 'none',
      scoreValiditas: 30,
      scoreServiceLevel: 30,
      scoreKalimat: 0,
      scoreResponTime: 15,
      scoreDokumentasi: 15,
      parameterPenilaian: ['OK'],
      subParameterPenilaian: ['OK'],
      solusi: ['OK']
    });
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

main();
