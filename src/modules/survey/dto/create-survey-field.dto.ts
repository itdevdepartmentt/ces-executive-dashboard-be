export class CreateSurveyFieldDto {
  label: string;
  type: string; // RATING | NPS | TEXT | SELECT
  options?: any; // JSON array for SELECT type
  isRequired?: boolean;
  order?: number;
  isActive?: boolean;
  dependsOnFieldId?: number;
  dependsOnValue?: string;
}
