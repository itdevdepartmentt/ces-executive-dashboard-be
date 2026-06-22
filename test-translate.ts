import translate from 'google-translate-api-x';

async function main() {
  const res = await translate('Apakah kebutuhan atau issue Anda terselesaikan?', { to: 'en' });
  console.log('Result:', res.text);
}

main().catch(console.error);
