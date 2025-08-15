-- Database Updates for Payment System
-- Run these SQL commands in your Supabase SQL editor

-- 1. Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method VARCHAR(50),
  payment_intent_id VARCHAR(255),
  billing_address JSONB,
  refund_reason TEXT,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_model_id ON orders(model_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 3. Add RLS policies for orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create orders
CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own orders (for status updates)
CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 4. Update downloads table to reference orders (optional)
-- Add order_id column to downloads table if it doesn't exist
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- 5. Create function to update order updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for orders updated_at
CREATE TRIGGER trigger_update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- 7. Add price and is_free columns to models table if they don't exist
ALTER TABLE models ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE models ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;

-- 8. Create function to calculate total revenue
CREATE OR REPLACE FUNCTION get_total_revenue()
RETURNS DECIMAL(10,2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM orders WHERE status = 'completed'),
    0.00
  );
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to get monthly revenue
CREATE OR REPLACE FUNCTION get_monthly_revenue(month_year DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10,2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) 
     FROM orders 
     WHERE status = 'completed' 
     AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', month_year)),
    0.00
  );
END;
$$ LANGUAGE plpgsql;

-- 10. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT ON orders TO anon;

-- 11. Create view for order analytics (admin only)
CREATE OR REPLACE VIEW order_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders,
  SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as revenue
FROM orders
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Grant access to admin users only
CREATE POLICY "Admin access to order analytics" ON order_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 12. Insert sample premium models (optional)
-- Update some existing models to be premium
UPDATE models 
SET price = 9.99, is_free = false 
WHERE id IN (
  SELECT id FROM models 
  ORDER BY created_at DESC 
  LIMIT 3
);

-- 13. Create sample orders for testing (optional)
-- Only run this if you want test data
/*
INSERT INTO orders (user_id, model_id, amount, status, payment_method)
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  id,
  price,
  'completed',
  'card'
FROM models 
WHERE is_free = false 
LIMIT 2;
*/

-- 14. Add comments for documentation
COMMENT ON TABLE orders IS 'Stores user orders for premium model purchases';
COMMENT ON COLUMN orders.amount IS 'Order amount in the specified currency';
COMMENT ON COLUMN orders.status IS 'Order status: pending, completed, failed, refunded';
COMMENT ON COLUMN orders.payment_method IS 'Method used for payment (card, paypal, etc.)';
COMMENT ON COLUMN orders.billing_address IS 'JSON object containing billing address information';
COMMENT ON COLUMN orders.refund_reason IS 'Reason for refund if applicable';

-- 15. Verify the setup
SELECT 
  'Orders table created successfully' as status,
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COUNT(*) FROM models WHERE is_free = false) as premium_models,
  (SELECT get_total_revenue()) as total_revenue;
