package io.cellar;

public final class Demo {
    private Demo() {}
    public static final String CONFIG="""
        {
          "version": 2,
          "integrations": [
            {
              "id": "inventory-report",
              "owner": "Inventory team",
              "description": "Weekly stock reconciliation",
              "required": ["order_id", "sku"],
              "minRows": 1,
              "rules": {
                "order_id": {"notEmpty": true, "unique": true},
                "sku": {"notEmpty": true}
              }
            },
            {
              "id": "finance-summary",
              "owner": "Finance team",
              "required": ["total_cents", "currency"],
              "rules": {
                "total_cents": {"type": "integer", "min": 0},
                "currency": {"notEmpty": true, "enum": ["INR", "USD", "EUR"]}
              }
            }
          ]
        }
        """;
    public static final String CSV="order_id,sku,total_cents,currency\nORD-001,SEED-01,25000,INR\nORD-002,TOOL-02,79900,INR\n";
    public static String csv(boolean broken){return broken?CSV.replace("order_id,","id,"):CSV;}
}
