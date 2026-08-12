import { DailyTaskCategoryValues, type DailyTaskCategory } from "@mypetproj/shared";

export const CATEGORY_LABEL: Record<DailyTaskCategory, string> = {
  MANDATORY: "Обязательные",
  OPTIONAL: "Необязательные",
  SMALL: "Мелкие",
  SUDDEN: "Внезапные",
};

export const CATEGORY_ORDER: DailyTaskCategory[] = [...DailyTaskCategoryValues];
