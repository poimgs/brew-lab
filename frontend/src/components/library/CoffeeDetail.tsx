import { ArrowLeft, Edit, Calendar, Coffee as CoffeeIcon, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Coffee } from '@/api/coffees';

interface CoffeeDetailProps {
  coffee: Coffee;
  onBack: () => void;
  onEdit: () => void;
}

export default function CoffeeDetail({ coffee, onBack, onEdit }: CoffeeDetailProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{coffee.name}</CardTitle>
              <p className="text-muted-foreground mt-1">
                {coffee.roaster}
                {coffee.country && ` · ${coffee.country}`}
                {coffee.process && ` · ${coffee.process}`}
              </p>
              {coffee.archived_at && (
                <Badge variant="secondary" className="mt-2">
                  Archived
                </Badge>
              )}
            </div>
            <Button onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Roasted</p>
              <p className="font-medium">{formatDate(coffee.roast_date)}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <CoffeeIcon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Days Off Roast</p>
              <p className="font-medium tabular-nums">{coffee.days_off_roast ?? '—'}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <FlaskConical className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Experiments</p>
              <p className="font-medium tabular-nums">{coffee.experiment_count}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid gap-6 sm:grid-cols-2">
            {coffee.region && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Region</h3>
                <p className="mt-1">{coffee.region}</p>
              </div>
            )}
            {coffee.roast_level && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Roast Level</h3>
                <p className="mt-1">{coffee.roast_level}</p>
              </div>
            )}
            {coffee.purchase_date && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Purchase Date</h3>
                <p className="mt-1">{formatDate(coffee.purchase_date)}</p>
              </div>
            )}
            {coffee.last_brewed && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Last Brewed</h3>
                <p className="mt-1">{formatDate(coffee.last_brewed)}</p>
              </div>
            )}
          </div>

          {/* Tasting Notes */}
          {coffee.tasting_notes && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Tasting Notes
              </h3>
              <p className="text-sm leading-relaxed">{coffee.tasting_notes}</p>
            </div>
          )}

          {/* Personal Notes */}
          {coffee.notes && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                My Notes
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{coffee.notes}</p>
            </div>
          )}

          {/* Brew History - placeholder for now */}
          {coffee.experiment_count > 0 && (
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-4">Brew History</h3>
              <p className="text-sm text-muted-foreground">
                {coffee.experiment_count} experiment{coffee.experiment_count !== 1 ? 's' : ''} with this coffee
              </p>
              {/* TODO: Add experiment list when brew-tracking feature is implemented */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
