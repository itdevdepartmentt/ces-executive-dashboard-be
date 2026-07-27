import { CreateQaReconciliationDto } from './create-qa-reconciliation.dto';
declare const UpdateQaReconciliationDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateQaReconciliationDto>>;
export declare class UpdateQaReconciliationDto extends UpdateQaReconciliationDto_base {
    status?: string;
    qcResponseNotes?: string;
}
export {};
