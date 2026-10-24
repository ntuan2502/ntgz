export interface StepResult {
  acted: boolean;
  msg?: string;
}

export const NOT_ACTED: StepResult = { acted: false };

export const CROP_NAMES: Record<string, string> = {
  radish: 'Củ cải',
  carrot: 'Cà rốt',
  corn: 'Bắp ngô',
  rice: 'Lúa thơm',
  egg: 'Trứng gà',
};

export const formatVnd = (n: number): string => n.toLocaleString('vi-VN');
