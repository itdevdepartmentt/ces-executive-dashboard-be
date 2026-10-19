import { BadRequestException } from '@nestjs/common';
import { FormRecordsService } from './form-records.service';

jest.mock('prisma/prisma.service', () => ({ PrismaService: class {} }), {
  virtual: true,
});
jest.mock('./forms.service', () => ({ FormsService: class {} }));

describe('editing form submissions', () => {
  const editor = {
    id: 'agent-1',
    name: 'Agent Uji',
    email: 'agent@example.test',
  };
  const editedAt = new Date('2026-10-07T07:45:00.000Z');
  const audit = {
    lastEditedById: editor.id,
    lastEditedByName: editor.name,
    lastEditedByEmail: editor.email,
    lastEditedAt: editedAt,
  };
  beforeAll(() => jest.useFakeTimers({ now: editedAt }));
  afterAll(() => jest.useRealTimers());
  const stored = {
    id: 'record-1',
    status: 'generated',
    values: {
      ticketId: 'TICKET-01',
      corporateName: 'PT Lama',
      phone: '0811',
      archived: 'Nilai lama',
    },
    form: {
      fields: ['ticketId', 'corporateName', 'phone', 'archived'].map((key) => ({
        key,
        label: key,
        type: 'TEXT',
        required: true,
        isActive: key !== 'archived',
        defaultValue: null,
      })),
    },
  };

  function setup() {
    const prisma = {
      formRecord: {
        findUnique: jest.fn().mockResolvedValue(stored),
        update: jest.fn().mockResolvedValue({ id: stored.id }),
      },
    };
    const service = new FormRecordsService(
      prisma as unknown as ConstructorParameters<typeof FormRecordsService>[0],
      {} as ConstructorParameters<typeof FormRecordsService>[1],
    );
    return { service, prisma };
  }

  it('updates the reference, preserves other values, and resets generated status', async () => {
    const { service, prisma } = setup();
    await service.update(
      stored.id,
      {
        values: { ticketId: ' TICKET-02 ', corporateName: 'PT Baru' },
      },
      editor,
    );
    expect(prisma.formRecord.update).toHaveBeenCalledWith({
      where: { id: stored.id },
      data: {
        ...audit,
        refNumber: 'TICKET-02',
        status: 'submitted',
        values: {
          ...stored.values,
          ticketId: 'TICKET-02',
          corporateName: 'PT Baru',
        },
      },
    });
  });

  it('rejects an empty required field before writing', async () => {
    const { service, prisma } = setup();
    await expect(
      service.update(stored.id, { values: { corporateName: '' } }, editor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.formRecord.update).not.toHaveBeenCalled();
  });

  it('does not require an inactive field missing from an older submission', async () => {
    const { service, prisma } = setup();
    prisma.formRecord.findUnique.mockResolvedValue({
      ...stored,
      form: {
        fields: [
          ...stored.form.fields,
          {
            ...stored.form.fields[0],
            key: 'catatanTambahan',
            label: 'Catatan Internal',
            isActive: false,
          },
        ],
      },
    });
    await service.update(
      stored.id,
      { values: { corporateName: 'PT Baru' } },
      editor,
    );
    expect(prisma.formRecord.update).toHaveBeenCalledWith({
      where: { id: stored.id },
      data: {
        ...audit,
        refNumber: 'TICKET-01',
        status: 'submitted',
        values: { ...stored.values, corporateName: 'PT Baru' },
      },
    });
  });

  it('preserves an empty saved value for an inactive field', async () => {
    const { service, prisma } = setup();
    prisma.formRecord.findUnique.mockResolvedValue({
      ...stored,
      values: { ...stored.values, archived: '' },
    });
    await service.update(
      stored.id,
      { values: { corporateName: 'PT Baru' } },
      editor,
    );
    expect(prisma.formRecord.update).toHaveBeenCalledWith({
      where: { id: stored.id },
      data: {
        ...audit,
        refNumber: 'TICKET-01',
        status: 'submitted',
        values: { ...stored.values, archived: '', corporateName: 'PT Baru' },
      },
    });
  });

  it('preserves an explicitly supplied status', async () => {
    const { service, prisma } = setup();
    await service.update(
      stored.id,
      {
        values: { corporateName: 'PT Baru' },
        status: 'reviewed',
      },
      editor,
    );
    expect(prisma.formRecord.update).toHaveBeenCalledWith({
      where: { id: stored.id },
      data: {
        ...audit,
        refNumber: 'TICKET-01',
        status: 'reviewed',
        values: { ...stored.values, corporateName: 'PT Baru' },
      },
    });
  });
});
