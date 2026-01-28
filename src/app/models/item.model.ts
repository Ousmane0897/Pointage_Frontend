export interface Item {
  id: string;
  name: string;
  type: 'EMPLOYE' | 'POINTAGE' | 'RAPPORT';
  description?: string;
}
