import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle, Sparkles } from 'lucide-react';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  savings?: string;
  popular?: boolean;
  features: string[];
}

const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 1000,
    price: 10,
    pricePerCredit: 0.01,
    features: ['10 job analyses', 'Company red-flag detection', 'Basic spam detection']
  },
  {
    id: 'professional',
    name: 'Professional',
    credits: 5000,
    price: 40,
    pricePerCredit: 0.008,
    savings: 'Save 20%',
    popular: true,
    features: ['50 job analyses', 'Advanced company insights', 'Recruiter verification', 'Priority processing']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 15000,
    price: 99,
    pricePerCredit: 0.0066,
    savings: 'Save 34%',
    features: ['150 job analyses', 'Premium company database', 'Risk scoring', 'Unlimited support']
  },
  {
    id: 'professional-plus',
    name: 'Professional+',
    credits: 50000,
    price: 299,
    pricePerCredit: 0.006,
    savings: 'Save 40%',
    features: ['500 job analyses', 'Full premium access', 'Custom integrations', 'Dedicated support']
  }
];

export const PurchaseCredits = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gradient-primary mb-2">Purchase Credits</h2>
        <p className="text-muted-foreground">Credit purchases are temporarily unavailable</p>
      </div>
      
      {/* Unavailable notice */}
      <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg max-w-md mx-auto">
        <AlertCircle className="w-5 h-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Payment processing is currently being set up. Please check back later.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 opacity-50 pointer-events-none">
        {creditPackages.map((pkg) => (
          <Card key={pkg.id} className={`relative elevated ${pkg.popular ? 'ring-2 ring-primary' : ''}`}>
            {pkg.popular && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-primary-glow">
                <Sparkles className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            )}
            {pkg.savings && !pkg.popular && (
              <Badge variant="secondary" className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                {pkg.savings}
              </Badge>
            )}
            
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">{pkg.name}</CardTitle>
              <CardDescription>
                <div className="text-3xl font-bold text-foreground">
                  ${pkg.price}
                </div>
                <div className="text-sm text-muted-foreground">
                  {pkg.credits.toLocaleString()} credits
                </div>
                <div className="text-xs text-muted-foreground">
                  ${pkg.pricePerCredit.toFixed(4)} per credit
                </div>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Button
                disabled
                className="w-full"
                variant={pkg.popular ? "default" : "outline"}
              >
                Unavailable
              </Button>
              
              <ul className="space-y-2 text-sm">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>All purchases are one-time payments. Credits never expire.</p>
        <p>Each job analysis costs 100 credits (equivalent to $1 at starter tier)</p>
      </div>
    </div>
  );
};
