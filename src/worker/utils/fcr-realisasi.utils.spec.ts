import {
  calculateOcaFcrRealisasi,
  qualifiesFcrRealisasi,
} from './fcr-realisasi.utils';

describe('FCR Realisasi eligibility', () => {
  it.each(['Closed', ' resolved ', 'CLOSED', 'Resolved by agent'])(
    'accepts a completed KIP FCR ticket without escalation: %s',
    (status) => {
      expect(
        qualifiesFcrRealisasi({ isFcr: true, status, noEscalation: true }),
      ).toBe(true);
    },
  );
  it.each(['Open', 'Pending', 'Eskalasi IT', '', null, undefined])(
    'rejects incomplete status %s',
    (status) => {
      expect(
        qualifiesFcrRealisasi({ isFcr: true, status, noEscalation: true }),
      ).toBe(false);
    },
  );
  it('rejects NON FCR KIP and escalated tickets even when closed', () => {
    expect(
      qualifiesFcrRealisasi({
        isFcr: false,
        status: 'closed',
        noEscalation: true,
      }),
    ).toBe(false);
    expect(
      qualifiesFcrRealisasi({
        isFcr: true,
        status: 'closed',
        noEscalation: false,
      }),
    ).toBe(false);
  });
  const data = {
    isFcr: true,
    status: 'closed',
    eskalasiAm: '-',
    description: '',
    idRemedyNo: '-',
    reasonOsl: '',
    countInboundMessage: 1,
    inSla: false,
    msisdn: '1',
    subCategory: '',
    detailCategory: '',
  };
  it('does not add a mandatory SLA requirement', () => {
    expect(calculateOcaFcrRealisasi(data).isFcrRealisasi).toBe(true);
  });
  it('preserves existing escalation rules and rejects unknown escalation text', () => {
    expect(
      calculateOcaFcrRealisasi({ ...data, eskalasiAm: 'EBO' }).isFcrRealisasi,
    ).toBe(false);
    expect(
      calculateOcaFcrRealisasi({ ...data, eskalasiAm: 'Other team' })
        .isFcrRealisasi,
    ).toBe(false);
    expect(
      calculateOcaFcrRealisasi({ ...data, isFcr: false }).isFcrRealisasi,
    ).toBe(false);
    expect(
      calculateOcaFcrRealisasi({ ...data, status: 'open' }).isFcrRealisasi,
    ).toBe(false);
  });
});
