import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const OnlineOrders = () => {
  return (
    <AppLayout title="Online Orders" subtitle="Orders from online channels">
      <div className="py-12 flex justify-center">
        <Card className="max-w-xl w-full p-6">
          <h3 className="text-lg font-medium mb-2">Online Orders</h3>
          <p className="text-sm text-muted-foreground mb-4">Integration with client e‑commerce platform is pending. This screen is a placeholder for incoming online orders.</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Update pending — integration to be implemented</span>
            <Button variant="outline" size="sm" disabled>Refresh</Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default OnlineOrders;
