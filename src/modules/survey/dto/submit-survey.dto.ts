export class SubmitSurveyDto {
  ticketId?: string;
  agentName?: string;
  generatedAt?: string | Date;
  answers: Record<string, any>; // { fieldId: value }
}
