export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

export const services: Service[] = [
  { id: 'cabelo', name: 'Cabelo', description: 'Corte de cabelo simples', duration: 30, price: 45 },
  { id: 'barba', name: 'Barba', description: 'Corte de barba simples', duration: 30, price: 45 },
  { id: 'cabelo-barba', name: 'Cabelo e Barba', description: 'Corte de cabelo e barba', duration: 30, price: 80 },
  { id: 'cabelo-sobrancelha', name: 'Cabelo e Sobrancelha', description: 'Corte de cabelo e sobrancelha', duration: 30, price: 55 },
  { id: 'pezinho', name: 'Pezinho', description: 'Apenas o pezinho do cabelo', duration: 30, price: 15 },
  { id: 'sobrancelha', name: 'Sobrancelha', description: 'Apenas sobrancelha', duration: 30, price: 15 },
  { id: 'completo', name: 'Completo', description: 'Corte de cabelo, barba e sobrancelha', duration: 30, price: 80 },
];
