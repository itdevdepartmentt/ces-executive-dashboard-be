export class UpdateSurveyFieldDto {
  label?: string;
  type?: string;
  options?: any;
  isRequired?: boolean;
  order?: number;
  isActive?: boolean;
  dependsOnFieldId?: number;
  dependsOnValue?: string;
}
