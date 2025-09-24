export interface StripeProduct {
  id: string
  priceId: string
  name: string
  description: string
  price: string
  mode: 'subscription' | 'payment'
  features: string[]
  popular?: boolean
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_T5hOumUN5jL1An',
    priceId: 'price_1S9VzNQYgD0y1NyBUCtR05dg',
    name: 'Assinatura Mensal',
    description: 'Plano completo para gestão de condomínios',
    price: 'R$ 89,90',
    mode: 'subscription',
    features: [
      'Condomínios ilimitados',
      'Gestão completa de fornecedores',
      'Controle avançado de manutenções',
      'Relatórios detalhados',
      'Upload de fotos',
      'Comunicação WhatsApp/Email',
      'Suporte prioritário'
    ],
    popular: true
  }
]

export function getProductById(id: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find(product => product.id === id)
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find(product => product.priceId === priceId)
}