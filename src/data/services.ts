export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number; // BRL
}

export const services: Service[] = [
  { id: 'corte', name: 'Corte de Cabelo', duration: 30, price: 45 },
  { id: 'barba', name: 'Barba', duration: 30, price: 35 },
  { id: 'corte-barba', name: 'Corte + Barba', duration: 60, price: 70 },
  { id: 'hot-towel', name: 'Hot Towel Shave', duration: 45, price: 55 },
  { id: 'pigmentacao', name: 'Pigmentação', duration: 60, price: 80 },
  { id: 'sobrancelha', name: 'Design de Sobrancelha', duration: 15, price: 20 },
];
