const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { QaService } = require('./dist/modules/qa/qa.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const qaService = app.get(QaService);

  const data = {
      idTiket: 'TICKET-TEST-1234',
      idTapping: 'TAPPING-TEST-1234',
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
  };

  const res = await qaService.createFormTapping(data);
  console.log('Result:', res);

  await app.close();
}

bootstrap().catch(err => console.error(err));
